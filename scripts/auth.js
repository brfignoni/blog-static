import { google } from "googleapis";
import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve } from "path";

function findKeyFile() {
  // In CI, use the GOOGLE_SERVICE_ACCOUNT_KEY env var
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  }

  // Locally, look for a service account key in .secrets/
  const secretsDir = resolve(process.cwd(), ".secrets");
  if (existsSync(secretsDir)) {
    const files = readdirSync(secretsDir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const content = JSON.parse(readFileSync(resolve(secretsDir, file), "utf-8"));
      if (content.type === "service_account") {
        return content;
      }
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
