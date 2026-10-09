import { api } from "./http";
import type { User } from "@/types";

export const authApi = {
  me: async () => (await api.get<{ user: User }>("/auth/me")).data.user,
  login: async (email: string, password: string) =>
    (await api.post<{ user: User }>("/auth/login", { email, password })).data
      .user,
  refresh: async () => {
    await api.post("/auth/refresh");
  },
  logout: async () => {
    await api.post("/auth/logout");
  },
  changePassword: async (currentPassword: string, newPassword: string) => {
    await api.post("/auth/password", { currentPassword, newPassword });
  },
};
