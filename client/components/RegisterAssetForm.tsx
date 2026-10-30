import { Asset } from "@/app/asset-workspace";
import { COMPANIES } from "@/lib/register-form";
import { LocateFixed, X } from "lucide-react";
import React, { SetStateAction, useRef } from "react";

interface RegisterForm {
  creating: boolean;
  edit: Asset;
  setEdit: (value: SetStateAction<Asset | null>) => void;
  save(e: React.SubmitEvent): Promise<void>;
  elementsFor: (company: string) => string[];
  gps(): void;
  conditions: string[];
  priorities: string[];
  maintenanceTypes: string[];
  busy: boolean;
}

export default function RegisterAssetForm({
  creating,
  edit,
  setEdit,
  save,
  elementsFor,
  gps,
  conditions,
  priorities,
  maintenanceTypes,
  busy,
}: RegisterForm) {
  const isTv = edit.element === "TV";
  return (
    <section className="panel no-print">
      {/* ______________________________Register Asset Form__________________________  */}
      <div className="panel-title">
        <h2>{creating ? "Register a Asset" : "Edit asset · " + edit.id}</h2>
        <button onClick={() => setEdit(null)} aria-label="Close form">
          <X />
        </button>
      </div>
      <form onSubmit={save}>
        <div className="form-grid">
          <label>
            Company *
            <select
              required
              value={edit.company}
              onChange={(e) =>
                // reset element, otherwise a stale value from the previous company survives
                setEdit({
                  ...edit,
                  company: e.target.value,
                  element: "",
                })
              }
            >
              <option value="">Select a company…</option>
              {/* keeps old records (e.g. "1Crew1Project") editable instead of blanking them */}
              {edit.company && !COMPANIES.includes(edit.company as any) && (
                <option value={edit.company}>{edit.company}</option>
              )}
              {COMPANIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          {elementsFor(edit.company).length > 0 && (
            <>
              {" "}
              <label>
                Element being assessed *
                <select
                  required
                  value={edit.element}
                  onChange={(e) =>
                    setEdit({ ...edit, element: e.target.value })
                  }
                >
                  <option value="">Select an element…</option>
                  {elementsFor(edit.company).map((el) => (
                    <option key={el} value={el}>
                      {el}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {isTv && (
            <label>
              TV serial number *
              <input
                required
                value={edit.serial_number ?? ""}
                placeholder="Serial number"
                maxLength={100}
                onChange={(e) =>
                  setEdit({ ...edit, serial_number: e.target.value })
                }
              />
            </label>
          )}

          {[
            ["id", "Asset number", "e.g. BB-0001"],
            ["location", "Site location", "Street, suburb, city"],
            ["advertiser", "Advertiser / brand", "Advertiser company"],
            ["contact", "Contact person", "Full name"],
            ["email", "Contact email", "name@company.co.za"],
            ["phone", "Phone", "Contact number"],
            ["last", "Last maintenance date", ""],
            ["next", "Next maintenance due", ""],
          ].map(([key, label, placeholder]) => (
            <label key={key}>
              {label}
              {["id", "company", "location"].includes(key) && " *"}
              <input
                required={["id", "company", "location"].includes(key)}
                disabled={key === "id" && !creating}
                maxLength={key === "id" ? 40 : 500}
                type={
                  key === "email"
                    ? "email"
                    : ["last", "next"].includes(key)
                      ? "date"
                      : "text"
                }
                value={(edit as any)[key]}
                placeholder={placeholder}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    [key]:
                      key === "id"
                        ? e.target.value.toUpperCase()
                        : e.target.value,
                  })
                }
              />
            </label>
          ))}
          <label>
            GPS coordinates
            <div className="input-action">
              <input
                value={edit.gps}
                placeholder="Latitude, longitude"
                onChange={(e) => setEdit({ ...edit, gps: e.target.value })}
              />
              <button
                type="button"
                onClick={gps}
                title="Capture current GPS location"
              >
                <LocateFixed size={20} />
              </button>
            </div>
          </label>
          {[
            ["condition", "Condition rating", conditions],
            ["priority", "Priority rating", priorities],
            ["maintenanceType", "Type of maintenance", maintenanceTypes],
          ].map(([key, label, options]) => (
            <label key={key as string}>
              {label as string}
              <select
                value={(edit as any)[key as string]}
                onChange={(e) =>
                  setEdit({ ...edit, [key as string]: e.target.value })
                }
              >
                {(options as string[]).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
          ))}
          <label className="full">
            General comments
            <textarea
              rows={4}
              value={edit.comments}
              onChange={(e) => setEdit({ ...edit, comments: e.target.value })}
              placeholder="Condition, work completed, access notes or maintenance requirements"
            />
          </label>
        </div>
        <div className="form-footer">
          <small>
            Save the asset to generate its QR code and add site photos.
          </small>
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save asset"}
          </button>
        </div>
      </form>
      {/* _______________________________________________________________________________________________ */}
    </section>
  );
}
