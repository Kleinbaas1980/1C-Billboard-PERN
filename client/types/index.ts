export type Role = "admin" | "assessor";
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  owner: boolean;
}
export interface Photo {
  id: string;
  asset_id: string;
  name: string;
  type: string;
}
export interface Asset {
  id: string;
  location: string;
  company: string;
  advertiser: string;
  contact: string;
  email: string;
  phone: string;
  gps: string;
  last: string;
  next: string;
  comments: string;
  condition: string;
  priority: string;
  maintenanceType: string;
  assessor: string;
  assessorEmail: string;
  photos: Photo[];
}
