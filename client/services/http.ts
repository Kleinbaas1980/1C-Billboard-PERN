import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 30000,
});

let csrfToken = "";
let csrfPending: Promise<string> | null = null;
let refreshPending: Promise<void> | null = null;
export async function ensureCsrf() {
  if (typeof document !== "undefined") {
    const value = document.cookie
      .split("; ")
      .find((c) => c.startsWith("bc_csrf="));
    if (value) csrfToken = decodeURIComponent(value.slice(8));
  }
  if (csrfToken) return csrfToken;
  if (!csrfPending)
    csrfPending = api
      .get<{ token: string }>("/auth/csrf")
      .then((r) => {
        csrfToken = r.data.token;
        return csrfToken;
      })
      .finally(() => {
        csrfPending = null;
      });
  return csrfPending;
}
api.interceptors.request.use(async (config) => {
  if (!["get", "head", "options"].includes(config.method || "get"))
    config.headers.set("x-csrf-token", await ensureCsrf());
  return config;
});
api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const config = error.config as
      (InternalAxiosRequestConfig & { retried?: boolean }) | undefined;
    if (
      error.response?.status === 401 &&
      config &&
      !config.retried &&
      !config.url?.startsWith("/auth/")
    ) {
      config.retried = true;
      if (!refreshPending)
        refreshPending = api
          .post("/auth/refresh")
          .then(() => {})
          .finally(() => {
            refreshPending = null;
          });
      await refreshPending;
      return api(config);
    }
    return Promise.reject(error);
  },
);
// Compatibility adapter: every request uses Axios and the interceptors above.
export async function apiRequest(path: string, options: RequestInit = {}) {
  try {
    const response = await api.request({
      url: path.replace(/^\/api/, ""),
      method: options.method || "GET",
      data:
        typeof options.body === "string"
          ? JSON.parse(options.body)
          : options.body,
      headers: options.headers as Record<string, string> | undefined,
    });
    return {
      ok: true,
      status: response.status,
      json: async () => response.data,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response)
      return {
        ok: false,
        status: error.response.status,
        json: async () => error.response!.data,
      };
    throw error;
  }
}
export function apiError(error: unknown) {
  return axios.isAxiosError(error)
    ? String(error.response?.data?.error || error.message)
    : error instanceof Error
      ? error.message
      : "Request failed.";
}
