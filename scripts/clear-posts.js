import { rmSync, readdirSync, statSync } from "fs";
import { join } from "path";

// Remove only subdirectories (post category folders) inside each language dir,
// leaving index.njk and other template files untouched.
for (const lang of ["src/es", "src/en", "src/pt"]) {
  let entries;
  try {
    entries = readdirSync(lang);
  } catch {
    continue; // dir doesn't exist yet
  }
  for (const entry of entries) {
    const full = join(lang, entry);
    if (statSync(full).isDirectory()) {
      rmSync(full, { recursive: true, force: true });
    }
  }
}

console.log("Cleared post folders inside src/es, src/en, src/pt");
