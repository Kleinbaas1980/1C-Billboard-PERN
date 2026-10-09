import { test } from "node:test";
import assert from "node:assert/strict";
import { unzipSync, strFromU8 } from "fflate";
import { assetRegisterXlsx } from "../utils/asset-register-export.js";
test("empty editable workbook has no sample records and export escapes spreadsheet content", () => {
  const empty = unzipSync(assetRegisterXlsx([], [], "https://example.com"));
  const sheet = strFromU8(empty["xl/worksheets/sheet2.xml"]);
  assert.equal((sheet.match(/<x:row /g) || []).length, 1);
  for (const value of Object.values(empty)) {
    const text = strFromU8(value);
    assert.equal(
      /BB-00[123]|Road [123]|Site inspection comments/.test(text),
      false,
    );
  }
  const filled = unzipSync(
    assetRegisterXlsx(
      [
        {
          id: "TEST",
          company: '=HYPERLINK("evil")',
          location: "A & B",
          condition: "Good",
          priority: "P4 — Low",
        },
      ],
      [],
      "https://example.com",
    ),
  );
  const xml = strFromU8(filled["xl/worksheets/sheet2.xml"]);
  assert.match(xml, /t="inlineStr"/);
  assert.match(xml, /A &amp; B/);
  assert.match(xml, /=HYPERLINK\(&quot;evil&quot;\)/);
  assert.ok(filled["xl/drawings/charts/chart1.xml"]);
});
