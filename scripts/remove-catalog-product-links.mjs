// Removes buyer-facing landing-page URLs from every public catalogue CSV.
// Image URLs are intentionally retained: catalogue platforms need them to
// render product photos, while the optional product `link` field is omitted.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const CURRENT_IMAGE_ORIGIN = "https://www.nindgeauto.com";
const RETIRED_IMAGE_ORIGINS = ["https://hainautocn.com", "https://www.hainautocn.com", "https://nindgeauto.com"];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  if (quoted) throw new Error("Unterminated quoted CSV field");
  return rows;
}

function csvField(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const files = fs.readdirSync(publicDir)
  .filter((name) => /catalog.*\.csv$/i.test(name))
  .sort();

for (const name of files) {
  const filePath = path.join(publicDir, name);
  const rows = parseCsv(fs.readFileSync(filePath, "utf8"));
  const linkIndex = rows[0]?.indexOf("link") ?? -1;
  if (linkIndex >= 0) for (const row of rows) row.splice(linkIndex, 1);

  const header = rows[0] ?? [];
  for (const columnName of ["image_link", "additional_image_link"]) {
    const columnIndex = header.indexOf(columnName);
    if (columnIndex < 0) continue;
    for (const row of rows.slice(1)) {
      for (const retiredOrigin of RETIRED_IMAGE_ORIGINS) {
        row[columnIndex] = row[columnIndex]?.replaceAll(retiredOrigin, CURRENT_IMAGE_ORIGIN);
      }
    }
  }
  fs.writeFileSync(filePath, `${rows.map((row) => row.map(csvField).join(",")).join("\n")}\n`, "utf8");
  console.log(`${linkIndex >= 0 ? "Removed product links and normalized images" : "Normalized images"}: ${name}`);
}
