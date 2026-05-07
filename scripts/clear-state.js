import { rmSync } from "fs";

rmSync("sync-state.json", { force: true });

console.log("Cleared sync-state.json");
