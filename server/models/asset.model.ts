import { pool } from "../configs/database.js";
export const assetSelect = `SELECT a.id,a.location,a.company,a.advertiser,a.contact,a.email,a.phone,a.gps,COALESCE(to_char(a.last_maintenance,'YYYY-MM-DD'),'') AS last,COALESCE(to_char(a.next_maintenance,'YYYY-MM-DD'),'') AS next,a.comments,a.condition,a.priority,a.maintenance_type AS "maintenanceType",u.name AS assessor,u.email AS "assessorEmail" FROM assets a JOIN users u ON u.id=a.assessed_by`;
export async function listAssets() {
  const { rows } = await pool.query(
    assetSelect + " WHERE a.deleted_at IS NULL ORDER BY a.updated_at DESC",
  );
  const photos = (
    await pool.query(
      "SELECT p.id,p.asset_id,p.name,p.content_type AS type FROM photos p JOIN assets a ON a.id=p.asset_id WHERE a.deleted_at IS NULL ORDER BY p.created_at",
    )
  ).rows;
  return rows.map((a) => ({
    ...a,
    photos: photos.filter((p) => p.asset_id === a.id),
  }));
}
