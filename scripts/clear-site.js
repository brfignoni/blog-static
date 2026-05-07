import { rmSync } from "fs";

rmSync("_site", { recursive: true, force: true });

console.log("Cleared _site");
