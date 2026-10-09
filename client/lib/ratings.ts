export const conditions = [
  "Not assessed",
  "Very Good",
  "Good",
  "Fair",
  "Poor",
  "Very Poor",
];
export const priorities = [
  "Not assigned",
  "P1 — Urgent",
  "P2 — High",
  "P3 — Medium",
  "P4 — Low",
];
export const maintenanceTypes = [
  "Not specified",
  "Inspection",
  "Preventive maintenance",
  "Corrective repairs",
  "Structural repairs",
  "Electrical / lighting",
  "Cleaning",
  "Painting / corrosion treatment",
  "Advertising face replacement",
  "Other",
];
export function isUrgent(a: { priority?: string }) {
  return a.priority === "P1 — Urgent";
}
