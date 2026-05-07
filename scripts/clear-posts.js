import { rmSync } from "fs";

for (const dir of ["src/es", "src/en", "src/pt"]) {
  rmSync(dir, { recursive: true, force: true });
}

console.log("Cleared src/es, src/en, src/pt");
