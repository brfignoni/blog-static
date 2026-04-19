# GeneXus Blog Pipeline — Implementation Checklist (Option 1: Traditional Automation + Eleventy)

## Phase 1: Google Cloud Setup

- [x] Create a Google Cloud project (or use existing one)
- [x] Enable the Google Drive API
- [x] Enable the Google Docs API
- [x] Create a Service Account and download the JSON key
  > A service account is a non-human Google identity that your sync script uses to authenticate against the Drive and Docs APIs. Instead of logging in as a user, the script uses the JSON key file to prove its identity — no browser or interactive login needed. You share the Drive folder with the service account email just like you would with a colleague.
  1. Go to **Google Cloud Console → IAM & Admin → Service Accounts**
  2. Click **"Create Service Account"**
  3. Name: `blog-drive-sync` — Description: "Syncs blog posts from Google Drive to the blog-static GitHub repo."
  4. Skip "Grant this service account access to project" (no roles needed)
  5. Skip "Grant users access to this service account" — leave blank, click **Done**
  6. Click into the new account → **Keys** tab → **Add Key → Create new key → JSON**
  7. Save the downloaded `.json` file (you'll store it as a GitHub Secret later)
- [x] Create a dedicated Drive folder for blog posts
- [x] Share the Drive folder with the service account email
  > Go to the Drive folder, click **Share**, and add the service account email (e.g., `blog-drive-sync@blog-static-2025.iam.gserviceaccount.com`) as a **Viewer**. This is what gives the sync script permission to read the docs — no project-level IAM needed.
- [ ] Define a metadata convention for docs
  <!-- Auto-extracted from Drive/Docs API: Title (doc title), Slug (folder + doc title), Author (file owner), Date (createdTime), Category (subfolder name) -->
  - **Tags** — a line at the top of the doc, e.g., `tags: eleventy, static-site, google-docs`
  - **Status** — prefix the doc title with `[DRAFT]` or `[ARCHIVED]` (no prefix = published)
- [ ] Write a sample Google Doc following the convention

## Phase 2: Eleventy Site Scaffold

- [x] Initialize the repo (`npm init`)
- [x] Install Eleventy (`npm install @11ty/eleventy`)
- [x] Set up folder structure:
  - `src/` — source files
  - `src/posts/` — Markdown blog posts
  - `src/_includes/` — layout templates
  - `src/_data/` — global data files
  - `_site/` — build output (add to `.gitignore`)
- [x] Create a base layout template (Nunjucks or Liquid)
- [x] Create a post layout template
- [x] Create a blog index page (list of posts)
- [x] Add a sample Markdown post manually and verify it builds
- [x] Configure `eleventy.config.js` (input/output dirs, Markdown options, passthrough copy)
- [x] Add npm scripts: `"start": "eleventy --serve"`, `"build": "eleventy"`
- [x] Install and configure essential plugins:
  - [x] `@11ty/eleventy-plugin-syntaxhighlight`
  - [x] `@11ty/eleventy-plugin-rss`
- [x] Verify local dev server works (`npm start`)

## Phase 3: Google Docs → Markdown Parser

- [ ] Install Google API client (`npm install googleapis` or `@googleapis/docs @googleapis/drive`)
- [ ] Write a script to authenticate with the service account
- [ ] Write a script to list docs in the designated Drive folder
- [ ] Write a script to fetch a doc's structured content via the Docs API (`documents.get`)
- [ ] Build the Docs-to-Markdown walker (~200-400 lines of TypeScript):
  - [ ] Handle headings (H1, H2, H3)
  - [ ] Handle paragraphs and inline formatting (bold, italic, code)
  - [ ] Handle ordered and unordered lists
  - [ ] Handle links
  - [ ] Handle code blocks
  - [ ] Handle tables
  - [ ] Extract the metadata block and convert to YAML frontmatter
- [ ] **Iteration 1 shortcut for images:** skip image extraction — either ignore or link to Drive URLs temporarily
- [ ] Write output as `.md` files to `src/posts/<slug>.md`
- [ ] Test the parser end-to-end with the sample doc

## Phase 4: Sync Logic

- [ ] Write a sync script that:
  - [ ] Lists all docs in the Drive folder
  - [ ] Compares `modifiedTime` against a stored state file (e.g., `sync-state.json`) or git log
  - [ ] Identifies new or changed docs
  - [ ] Runs the parser only on changed docs
  - [ ] Commits the resulting `.md` files to the repo
- [ ] Store the service account JSON key as a GitHub Secret
- [ ] Test the sync script locally

## Phase 5: GitHub Actions Workflow

- [ ] Create `.github/workflows/sync-and-deploy.yml`
- [ ] Set up a cron schedule (e.g., hourly: `cron: '0 * * * *'`)
- [ ] Workflow steps:
  - [ ] Checkout the repo
  - [ ] Set up Node.js
  - [ ] Install dependencies
  - [ ] Run the sync script (using the service account key from Secrets)
  - [ ] If new commits were created, push to `main`
  - [ ] Run `npm run build` to generate the static site
  - [ ] Deploy the `_site/` output to the hosting provider
- [ ] Test the workflow manually via `workflow_dispatch`
- [ ] Verify the full loop: edit doc → cron fires → post appears on site

## Phase 6: Deployment

- [ ] Choose a hosting provider (Cloudflare Pages, Netlify, or Vercel)
- [ ] Connect the repo to the hosting provider
- [ ] Configure build command (`npm run build`) and output directory (`_site`)
- [ ] Set up a custom domain (e.g., `blog.genexus.com`)
- [ ] Configure DNS records
- [ ] Verify HTTPS is working
- [ ] Test a deploy end-to-end

## Phase 7: Validation & Handoff

- [ ] Write a second blog post via Google Docs and verify it flows through automatically
- [ ] Check the site renders correctly on mobile
- [ ] Validate RSS feed output
- [ ] Document the metadata convention for authors
- [ ] Document the workflow for the team (write doc → wait for sync → post goes live)
- [ ] Share the working demo with the team

---

## Future iterations (not for now)

- [ ] **Iteration 2:** Image extraction + re-hosting, draft/published states, deploy previews per PR
- [ ] **Iteration 3:** "Publish" button via Google Apps Script, Slack notifications
- [ ] **Iteration 4:** MDX/shortcodes, Pagefind search, RSS, related posts
- [ ] **Iteration 5:** AI layer (auto-tagging, translations, SEO suggestions via Claude API)
