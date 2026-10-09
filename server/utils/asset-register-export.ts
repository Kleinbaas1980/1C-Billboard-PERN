import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";
import { conditions, priorities, maintenanceTypes } from "./ratings.js";
import { templateBase64 } from "./asset-register-template.js";
const xml = (v: unknown) =>
  String(v ?? "")
    .slice(0, 32767)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
export function assetRegisterXlsx(
  assets: any[],
  photos: any[],
  origin: string,
) {
  const files = unzipSync(
    Uint8Array.from(atob(templateBase64), (c) => c.charCodeAt(0)),
  );
  const key = "xl/worksheets/sheet2.xml",
    sheet = strFromU8(files[key]);
  const header = sheet.match(/<x:row r="1"[\s\S]*?<\/x:row>/)![0];
  const rows = assets
    .map((a, i) => {
      const ps = photos.filter((p) => p.asset_id === a.id);
      const values = [
        a.id,
        a.company,
        a.location,
        a.gps,
        a.advertiser,
        a.contact,
        a.email,
        a.phone,
        a.condition || "Not assessed",
        a.priority || "Not assigned",
        a.maintenanceType || "Not specified",
        a.last,
        a.next,
        a.comments,
        a.assessor,
        a.assessorEmail,
        ps.length,
        ps
          .map((p) => origin + "/api/photos/" + encodeURIComponent(p.id))
          .join("\n"),
        origin + "/workspace?asset=" + encodeURIComponent(a.id),
      ];
      return (
        '<x:row r="' +
        (i + 2) +
        '" ht="48" customHeight="1">' +
        values
          .map((v, j) => {
            const ref = String.fromCharCode(65 + j) + (i + 2),
              style = j === 11 || j === 12 ? 6 : j === 16 ? 7 : 3;
            if (
              (j === 11 || j === 12) &&
              /^\d{4}-\d{2}-\d{2}$/.test(String(v)) &&
              Number.isFinite(Date.parse(v))
            )
              return `<x:c r="${ref}" s="${style}" t="n"><x:v>${Date.parse(v) / 86400000 + 25569}</x:v></x:c>`;
            if (j === 16)
              return `<x:c r="${ref}" s="${style}" t="n"><x:v>${v}</x:v></x:c>`;
            return `<x:c r="${ref}" s="${style}" t="inlineStr"><x:is><x:t xml:space="preserve">${xml(v)}</x:t></x:is></x:c>`;
          })
          .join("") +
        "</x:row>"
      );
    })
    .join("");
  files[key] = strToU8(
    sheet.replace(
      /<x:sheetData>[\s\S]*?<\/x:sheetData>/,
      "<x:sheetData>" + header + rows + "</x:sheetData>",
    ),
  );
  const tableKey = "xl/tables/table1.xml",
    range = "A1:S" + Math.max(2, assets.length + 1);
  files[tableKey] = strToU8(
    strFromU8(files[tableKey])
      .replace('ref="A1:S4"', 'ref="' + range + '"')
      .replace(/<x:autoFilter[^>]*\/>/, '<x:autoFilter ref="' + range + '"/>')
      .replace("TableStyleMedium2", "TableStyleMedium9"),
  );
  // Refresh saved formula results and native chart caches from this export's records.
  const counts = (labels: string[], field: string, fallback: string) =>
    labels.map(
      (label) => assets.filter((a) => (a[field] || fallback) === label).length,
    );
  const cc = counts(conditions, "condition", "Not assessed"),
    pc = counts(priorities, "priority", "Not assigned"),
    tc = counts(maintenanceTypes, "maintenanceType", "Not specified");
  const date = new Date().toLocaleDateString("en-CA", {
      timeZone: "Africa/Johannesburg",
    }),
    serial = Date.parse(date) / 86400000 + 25569;
  const cached: Record<string, number> = {
    A6: assets.length,
    E6: pc[1],
    I6: cc[4] + cc[5],
    M6: assets.filter((a) => a.next && a.next < date).length,
    O3: serial,
  };
  cc.forEach((n, i) => {
    cached["B" + (57 + i)] = n;
    cached["C" + (57 + i)] = assets.length ? n / assets.length : 0;
  });
  pc.forEach((n, i) => {
    cached["F" + (57 + i)] = n;
    cached["G" + (57 + i)] = assets.length ? n / assets.length : 0;
  });
  tc.forEach((n, i) => {
    cached["N" + (32 + i)] = n;
    cached["O" + (32 + i)] = assets.length ? n / assets.length : 0;
  });
  let dash = strFromU8(files["xl/worksheets/sheet1.xml"]);
  dash = dash.replace(
    /<x:c ([^>]*[^/])>([\s\S]*?)<\/x:c>/g,
    (all, attrs, body) => {
      const ref = attrs.match(/r="([A-Z]+\d+)"/)?.[1];
      if (ref === undefined || cached[ref] === undefined) return all;
      return (
        "<x:c " +
        attrs.replace(/t="[^"]*"/, 't="n"') +
        ">" +
        body.replace(/<x:v>[\s\S]*?<\/x:v>/, "<x:v>" + cached[ref] + "</x:v>") +
        "</x:c>"
      );
    },
  );
  const limit = Math.max(10002, assets.length + 10001);
  dash = dash
    .replaceAll("$10002", "$" + limit)
    .replace(
      "first 10,001 asset rows",
      "first " + (limit - 1).toLocaleString("en-ZA") + " asset rows",
    );
  files["xl/worksheets/sheet1.xml"] = strToU8(dash);
  files[key] = strToU8(
    strFromU8(files[key])
      .replaceAll("10002", String(limit))
      .replace("Dashboard!$I$32:$I$41", "MaintenanceOptions"),
  );
  const wbKey = "xl/workbook.xml";
  files[wbKey] = strToU8(
    strFromU8(files[wbKey]).replace(
      "</x:sheets>",
      '</x:sheets><x:definedNames><x:definedName name="MaintenanceOptions">Dashboard!$I$32:$I$41</x:definedName></x:definedNames><x:calcPr calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/>',
    ),
  );
  const palettes = [
    ["94A3B8", "166534", "22A152", "EAB308", "F97316", "DC2626"],
    ["94A3B8", "DC2626", "F97316", "EAB308", "2563EB"],
    [
      "94A3B8",
      "FF6B00",
      "2563EB",
      "16A34A",
      "DC2626",
      "7C3AED",
      "0891B2",
      "EAB308",
      "DB2777",
      "4D4D4D",
    ],
  ];
  [conditions, priorities, maintenanceTypes].forEach((labels, i) => {
    const chartKey = "xl/drawings/charts/chart" + (i + 1) + ".xml";
    let chart = strFromU8(files[chartKey]);
    const nums = [cc, pc, tc][i];
    chart = chart.replace(
      /<c:strCache>[\s\S]*?<\/c:strCache>/,
      '<c:strCache><c:ptCount val="' +
        labels.length +
        '"/>' +
        labels
          .map(
            (l, j) => '<c:pt idx="' + j + '"><c:v>' + xml(l) + "</c:v></c:pt>",
          )
          .join("") +
        "</c:strCache>",
    );
    chart = chart.replace(
      /<c:numCache>[\s\S]*?<\/c:numCache>/,
      '<c:numCache><c:formatCode>0</c:formatCode><c:ptCount val="' +
        nums.length +
        '"/>' +
        nums
          .map((n, j) => '<c:pt idx="' + j + '"><c:v>' + n + "</c:v></c:pt>")
          .join("") +
        "</c:numCache>",
    );
    chart = chart.replace(
      "<c:cat>",
      palettes[i]
        .map(
          (color, j) =>
            '<c:dPt><c:idx val="' +
            j +
            '"/><c:spPr><a:solidFill xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:srgbClr val="' +
            color +
            '"/></a:solidFill></c:spPr></c:dPt>',
        )
        .join("") + "<c:cat>",
    );
    files[chartKey] = strToU8(chart);
  });
  return zipSync(files, { level: 6 });
}
