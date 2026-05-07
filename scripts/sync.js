import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import { createRequire } from "module";
import { listDocs } from "./list-docs.js";
import { docToMarkdown } from "./docs-to-markdown.js";
import { getDrive } from "./auth.js";
import { POSTS_DIR } from "./config.js";

const require = createRequire(import.meta.url);
const I18N = require("../src/_data/i18n.json");

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

    // Check latest revision (lightweight call) to detect content changes
    const drive = getDrive();
    const revisions = await drive.revisions.list({ fileId: doc.id, fields: "revisions(id)" });
    const latestRevisionId = revisions.data.revisions?.at(-1)?.id;

    if (state[doc.id] && state[doc.id] === latestRevisionId) {
      console.log(`  No changes: ${doc.name}`);
      continue;
    }

    console.log(`  Syncing: ${doc.name}...`);

    const docTitle = cleanTitle(doc.name);
    const docCategory = doc.category || null;
    const author = doc.owners?.[0]?.displayName || "Unknown";
    const date = doc.createdTime.split("T")[0];

    // Only fetch full content when revision changed
    const { tabs } = await docToMarkdown(doc.id);

    if (Object.keys(tabs).length === 0) {
      console.log(`  Warning: no valid language tabs (en/es/pt) found in "${doc.name}" — skipping`);
      continue;
    }

    for (const [lang, { markdown, tags, title: tabTitle, category: tabCategory }] of Object.entries(tabs)) {
      const title = tabTitle || docTitle;
      const docCategorySlug = docCategory ? slugify(docCategory) : null;
      const categorySlug = docCategorySlug
        ? I18N.categories[docCategorySlug]?.[lang]?.slug ?? docCategorySlug
        : null;
      const titleSlug = slugify(title);

      // Build frontmatter
      let frontmatter = `---\n`;
      frontmatter += `title: "${title}"\n`;
      frontmatter += `author: ${author}\n`;
      frontmatter += `date: ${date}\n`;
      frontmatter += `lang: ${lang}\n`;
      if (categorySlug) frontmatter += `category: ${categorySlug}\n`;
      frontmatter += `tags:\n  - posts\n`;
      for (const tag of tags) {
        frontmatter += `  - ${tag}\n`;
      }
      frontmatter += `---\n\n`;

      // Write to src/<lang>/posts/<category>/<title-slug>.md
      const outputDir = categorySlug
        ? resolve(process.cwd(), "src", lang, "posts", categorySlug)
        : resolve(process.cwd(), "src", lang, "posts");
      mkdirSync(outputDir, { recursive: true });

      const filePath = join(outputDir, `${titleSlug}.md`);
      writeFileSync(filePath, frontmatter + markdown);
      console.log(`  Wrote [${lang}]: ${filePath}`);
    }

    // Save the revision ID from drive.revisions.list
    state[doc.id] = latestRevisionId;
    synced++;
  }

  saveState(state);
  console.log(`\nDone. Synced ${synced} doc(s).`);
}

sync().catch((err) => {
  console.error("Sync failed:", err.message);
  process.exit(1);
});
