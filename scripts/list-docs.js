import { getDrive } from "./auth.js";
import { DRIVE_FOLDER_ID } from "./config.js";

/**
 * Lists all subfolders (categories) and their docs inside the main Drive folder.
 * Returns an array of { id, name, category, createdTime, modifiedTime, owners }.
 */
export async function listDocs() {
  const drive = getDrive();
  const docs = [];

  // Get subfolders (categories)
  const foldersRes = await drive.files.list({
    q: `'${DRIVE_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
  });

  const folders = foldersRes.data.files || [];

  // For each category folder, list the Google Docs inside it
  for (const folder of folders) {
    const docsRes = await drive.files.list({
      q: `'${folder.id}' in parents and mimeType = 'application/vnd.google-apps.document' and trashed = false`,
      fields: "files(id, name, createdTime, modifiedTime, owners)",
    });

    for (const doc of docsRes.data.files || []) {
      docs.push({
        id: doc.id,
        name: doc.name,
        category: folder.name,
        createdTime: doc.createdTime,
        modifiedTime: doc.modifiedTime,
        owners: doc.owners,
      });
    }
  }

  // Also list docs directly in the root folder (uncategorized)
  const rootDocsRes = await drive.files.list({
    q: `'${DRIVE_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.document' and trashed = false`,
    fields: "files(id, name, createdTime, modifiedTime, owners)",
  });

  for (const doc of rootDocsRes.data.files || []) {
    docs.push({
      id: doc.id,
      name: doc.name,
      category: null,
      createdTime: doc.createdTime,
      modifiedTime: doc.modifiedTime,
      owners: doc.owners,
    });
  }

  return docs;
}

// Run standalone for testing
if (process.argv[1] && process.argv[1].endsWith("list-docs.js")) {
  const docs = await listDocs();
  console.log(`Found ${docs.length} doc(s):\n`);
  for (const doc of docs) {
    console.log(`  [${doc.category || "uncategorized"}] ${doc.name} (${doc.id})`);
  }
}
