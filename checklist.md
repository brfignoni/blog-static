# GeneXus Blog Pipeline — Implementation Checklist (Option 1: Traditional Automation + Eleventy)

## Phase 1: Google Cloud Setup

- [ ] Create a Google Cloud project (or use existing one)
- [ ] Enable the Google Drive API
- [ ] Enable the Google Docs API
- [ ] Create a Service Account and download the JSON key
- [ ] Create a dedicated Drive folder for blog posts
- [ ] Share the Drive folder with the service account email
- [ ] Define a metadata convention for docs (e.g., a YAML block or table at the top: `Title`, `Slug`, `Author`, `Date`, `Tags`, `Status`)
- [ ] Write a sample Google Doc following the metadata convention

## Phase 2: Eleventy Site Scaffold

- [ ] Initialize the repo (`npm init`)
- [ ] Install Eleventy (`npm install @11ty/eleventy`)
- [ ] Set up folder structure:
  - `src/` — source files
  - `src/posts/` — Markdown blog posts
  - `src/_includes/` — layout templates
  - `src/_data/` — global data files
  - `_site/` — build output (add to `.gitignore`)
- [ ] Create a base layout template (Nunjucks or Liquid)
- [ ] Create a post layout template
- [ ] Create a blog index page (list of posts)
- [ ] Add a sample Markdown post manually and verify it builds
- [ ] Configure `.eleventy.js` (input/output dirs, Markdown options, passthrough copy)
- [ ] Add npm scripts: `"start": "eleventy --serve"`, `"build": "eleventy"`
- [ ] Install and configure essential plugins:
  - [ ] `@11ty/eleventy-plugin-syntaxhighlight`
  - [ ] `@11ty/eleventy-plugin-rss`
- [ ] Verify local dev server works (`npm start`)

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
