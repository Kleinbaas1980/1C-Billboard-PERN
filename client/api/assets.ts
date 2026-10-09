import { api } from "./http";
import type { Asset } from "@/types";
export const getAssets = async () => (await api.get<Asset[]>("/assets")).data;
export async function downloadRegister() {
  const response = await api.get("/assets/export", { responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = "1C-Asset-Register.xlsx";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
