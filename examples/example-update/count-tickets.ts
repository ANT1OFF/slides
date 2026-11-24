// Refreshes tickets.data.json from tickets-by-area.csv, an export from the helpdesk
// (Reports → Tickets by area → Export CSV, for the quarter). Run by `npm run refresh example-update`.
// If the export is missing, it stops with a message and the old numbers stay in the deck.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = import.meta.dirname;
const csv = resolve(dir, "tickets-by-area.csv");
if (!existsSync(csv)) {
  console.error("tickets-by-area.csv not found: export it from the helpdesk first.");
  process.exit(1);
}
const rows = readFileSync(csv, "utf8")
  .trim()
  .split("\n")
  .slice(1)
  .map((line) => {
    const [area, tickets] = line.split(",");
    return { label: area.trim(), value: Number(tickets) };
  });

const file = resolve(dir, "tickets.data.json");
const data = JSON.parse(readFileSync(file, "utf8"));
data.values = { total: rows.reduce((s, r) => s + r.value, 0), byArea: rows };
data.updated = new Date().toISOString().slice(0, 10);
writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
