import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import { listDocs } from "./list-docs.js";
import { docToMarkdown } from "./docs-to-markdown.js";
import { POSTS_DIR } from "./config.js";

const STATE_FILE = resolve(process.cwd(), "sync-state.json");

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/\[draft\]\s*/i, "")
    .replace(/\[archived\]\s*/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function loadState() {
  if (existsSync(STATE_FILE)) {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  }
  return {};
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function isDraft(docName) {
  return /^\[DRAFT\]/i.test(docName);
}

function isArchived(docName) {
  return /^\[ARCHIVED\]/i.test(docName);
}

function cleanTitle(docName) {
  return docName.replace(/^\[(DRAFT|ARCHIVED)\]\s*/i, "").trim();
}

async function sync() {
  console.log("Fetching docs from Google Drive...");
  const docs = await listDocs();
  console.log(`Found ${docs.length} doc(s)`);

  const state = loadState();
  let synced = 0;

  for (const doc of docs) {
    // Skip drafts and archived docs
    if (isDraft(doc.name) || isArchived(doc.name)) {
      console.log(`  Skipping [${isDraft(doc.name) ? "DRAFT" : "ARCHIVED"}] ${doc.name}`);
      continue;
    }

    // Skip if not modified since last sync
    if (state[doc.id] && state[doc.id] === doc.modifiedTime) {
      console.log(`  No changes: ${doc.name}`);
      continue;
    }

    console.log(`  Syncing: ${doc.name}...`);

    const title = cleanTitle(doc.name);
    const slug = slugify(title);
    const category = doc.category ? slugify(doc.category) : null;
    const author = doc.owners?.[0]?.displayName || "Unknown";
    const date = doc.createdTime.split("T")[0];

    // Convert doc to Markdown
    const { markdown, tags } = await docToMarkdown(doc.id);

    // Build frontmatter
    let frontmatter = `---\n`;
    frontmatter += `title: "${title}"\n`;
    frontmatter += `author: ${author}\n`;
    frontmatter += `date: ${date}\n`;
    if (category) frontmatter += `category: ${category}\n`;
    if (tags.length > 0) {
      frontmatter += `tags:\n  - posts\n`;
      for (const tag of tags) {
        frontmatter += `  - ${tag}\n`;
      }
    } else {
      frontmatter += `tags:\n  - posts\n`;
    }
    frontmatter += `---\n\n`;

    // Write the file
    const outputDir = category
      ? resolve(process.cwd(), POSTS_DIR, category)
      : resolve(process.cwd(), POSTS_DIR);
    mkdirSync(outputDir, { recursive: true });

    const filePath = join(outputDir, `${slug}.md`);
    writeFileSync(filePath, frontmatter + markdown);
    console.log(`  Wrote: ${filePath}`);

    // Update state
    state[doc.id] = doc.modifiedTime;
    synced++;
  }

  saveState(state);
  console.log(`\nDone. Synced ${synced} doc(s).`);
}

sync().catch((err) => {
  console.error("Sync failed:", err.message);
  process.exit(1);
});
