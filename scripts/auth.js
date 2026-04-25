import { google } from "googleapis";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

function findKeyFile() {
  // In CI, use the GOOGLE_SERVICE_ACCOUNT_KEY env var
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  }

  // Locally, find the first .json file that looks like a service account key
  const root = resolve(process.cwd());
  const files = readdirSync(root).filter(
    (f) =>
      f.endsWith(".json") &&
      f !== "package.json" &&
      f !== "package-lock.json" &&
      f !== "sync-state.json"
  );

  for (const file of files) {
    const content = JSON.parse(readFileSync(resolve(root, file), "utf-8"));
    if (content.type === "service_account") {
      return content;
    }
  }

  throw new Error("No service account key file found");
}

export function getAuth() {
  const credentials = findKeyFile();
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/documents.readonly",
    ],
  });
}

export function getDrive() {
  return google.drive({ version: "v3", auth: getAuth() });
}

export function getDocs() {
  return google.docs({ version: "v1", auth: getAuth() });
}
