"user client";

import { Asset } from "@/app/asset-workspace";
import { apiRequest } from "@/services/http";
import { useEffect, useState } from "react";
import { conditions, priorities } from "../lib/ratings";

export function AssetRatings({
  asset,
  onSaved,
}: {
  asset: Asset;
  onSaved: (id: string) => Promise<void>;
}) {
  const [condition, setCondition] = useState(asset.condition),
    [priority, setPriority] = useState(asset.priority),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState(""),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    setCondition(asset.condition);
    setPriority(asset.priority);
    setMessage("");
  }, [asset.id, asset.condition, asset.priority]);
  async function saveRatings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setFailed(false);
    try {
      const r = await apiRequest("/api/assets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: asset.id, condition, priority }),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      await onSaved(asset.id);
      setMessage("Condition and priority saved. Dashboard updated.");
    } catch (e: any) {
      setFailed(true);
      setMessage(e.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="asset-condition no-print">
      <div>
        <h3>Board assessment</h3>
        <p>Record the condition and maintenance priority for this board.</p>
      </div>
      <form onSubmit={saveRatings}>
        <label>
          Condition rating
          <select
            className={
              "rating-select condition-" + condition.replaceAll(" ", "-")
            }
            value={condition}
            disabled={saving}
            onChange={(e) => {
              setCondition(e.target.value);
              setMessage("");
            }}
          >
            {conditions.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Priority rating
          <select
            className={
              "rating-select priority-" +
              (priority.startsWith("P") ? priority.slice(0, 2) : "none")
            }
            value={priority}
            disabled={saving}
            onChange={(e) => {
              setPriority(e.target.value);
              setMessage("");
            }}
          >
            {priorities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <button
          className="primary"
          disabled={
            saving ||
            (condition === asset.condition && priority === asset.priority)
          }
        >
          {saving ? "Saving…" : "Save ratings"}
        </button>
      </form>
      {message && (
        <p
          className={failed ? "rating-error" : "rating-success"}
          role={failed ? "alert" : "status"}
        >
          {message}
        </p>
      )}
    </section>
  );
}
