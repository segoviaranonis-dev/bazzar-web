import fs from "fs";
import {
  loadPePrendasAmTalleIndex,
  remapTallas638DesdePpd,
  resolveAmTallesForProducto,
} from "../lib/catalogo/enrich-grada-638";

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  )
    v = v.slice(1, -1);
  if (!process.env[m[1].trim()]) process.env[m[1].trim()] = v;
}

const idx = await loadPePrendasAmTalleIndex(["40000", "40004"]);
const am = resolveAmTallesForProducto(idx, "40000", "2", null);
console.log("40000-2 PE talles", am);
const rem = remapTallas638DesdePpd(
  [
    { combinacion_id: 1, codigo: "34", orden: 1, stock: 1 },
    { combinacion_id: 2, codigo: "35", orden: 2, stock: 1 },
    { combinacion_id: 3, codigo: "36", orden: 3, stock: 2 },
    { combinacion_id: 4, codigo: "37", orden: 4, stock: 2 },
    { combinacion_id: 5, codigo: "38", orden: 5, stock: 1 },
    { combinacion_id: 6, codigo: "39", orden: 6, stock: 1 },
  ],
  am,
);
console.log(
  "remap",
  rem.map((t) => `${t.codigo}:${t.stock}`).join(" · "),
  "Σ",
  rem.reduce((s, t) => s + t.stock, 0),
);
console.log(
  rem.length && !rem.some((t) => Number(t.codigo) >= 33) ? "OK" : "FAIL",
);
