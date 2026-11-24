// npm run new <name>  →  creates src/decks/<name>/ as a copy of the starter deck, src/decks/_starter/,
// with the new deck's title in place of "New deck". The starter is the team's to change.
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { format, resolveConfig } from "prettier";

const STARTER = "src/decks/_starter";
const PLACEHOLDER = "New deck";

const name = process.argv[2];
if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(name)) {
  console.error("Usage: npm run new <name>   (lowercase letters, digits and dashes, e.g. my-talk)");
  process.exit(1);
}

const dir = `src/decks/${name}`;
if (existsSync(dir)) {
  console.error(`${dir} already exists`);
  process.exit(1);
}
if (!existsSync(`${STARTER}/index.tsx`)) {
  console.error(
    `${STARTER}/index.tsx is missing: it is the deck new decks are copied from. Restore it (git checkout -- ${STARTER}) or write one.`,
  );
  process.exit(1);
}

const title = name.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

cpSync(STARTER, dir, { recursive: true });
const file = `${dir}/index.tsx`;
// Drop the starter's own header comment (everything above the first import), then set the title.
const source = readFileSync(file, "utf8")
  .replace(/^(?:\/\/.*\n)+(?=import )/, "")
  .replaceAll(PLACEHOLDER, title);
// Format it like the rest of the repo, so `npm run check` passes on a fresh deck.
writeFileSync(file, await format(source, { ...(await resolveConfig(file)), filepath: file }));

console.log(`Created ${file}

  npm run dev               then open http://localhost:5173/?deck=${name}
  npm run build ${name}     writes dist/${name}.html`);
