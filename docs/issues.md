# Issues

## Google Docs API: `modifiedTime` Sync Discrepancy Between `drive.files.list` and `docs.documents.get`

### The Core Issue

`drive.files.list` and `docs.documents.get` are backed by **two separate systems** — the Drive metadata layer and the Docs content backend. When a user edits a Google Doc, they update at different rates:

1. **Drive metadata** (powers `files.list`) updates `modifiedTime` **almost immediately** — it tracks any change signal, including autosaves, formatting tweaks, and internal Docs events.
2. **Docs content** (powers `documents.get`) may **lag behind by several seconds to minutes**, as the content pipeline has its own flush/commit cycle.

**Result:** You can poll `files.list`, see a fresh `modifiedTime`, fetch the document via `documents.get`, and get **stale content** — because the content hasn't fully propagated yet.

### Why This Happens

Google doesn't officially document this behavior, but it's a known eventual consistency issue across their distributed infrastructure. The Drive metadata index and the Docs content store are **eventually consistent with each other**. `modifiedTime` reflects the metadata layer, not content commit time.

Delays typically vary based on file size and server load — sometimes instant, other times several seconds or more.

### Why This Breaks `sync.js`

`sync.js` runs on a cron schedule and must decide — cheaply and correctly — whether a doc has new content worth fetching. If it used `modifiedTime` as the change signal, it would hit this race:

1. The cron fires and calls `drive.files.list` — `modifiedTime` is fresh, so the doc looks changed.
2. `sync.js` calls `docs.documents.get` to fetch the content.
3. The Docs content store hasn't caught up yet — it returns the **previous version** of the document.
4. `sync.js` writes that stale content to `src/posts/` and commits it to the repo.
5. On the next cron run, `modifiedTime` is still the same — so `sync.js` sees "no change" and never re-fetches the now-committed content.

The result is a silently wrong post in the repo that never self-corrects, because `modifiedTime` won't change again until the author edits the doc a second time.

### Solution Adopted

`sync.js` avoids `modifiedTime` entirely. Instead, it uses `drive.revisions.list` as the change signal and persists the last seen revision ID **per Google Doc** in a local `sync-state.json` file.

On each run:
1. Fetch all revision metadata for that specific doc via `drive.revisions.list` (no document content — revision IDs only, scoped to that file's history).
2. Compare it against the stored revision ID for that doc.
3. If unchanged → skip. If different (or new) → fetch content and write the file.
4. Save the new revision ID to state.

```js
const revisions = await drive.revisions.list({ fileId: doc.id, fields: "revisions(id)" });
const latestRevisionId = revisions.data.revisions?.at(-1)?.id;

if (state[doc.id] && state[doc.id] === latestRevisionId) {
  continue; // no changes
}

// ... fetch and write content ...

state[doc.id] = latestRevisionId;
```

This sidesteps the `modifiedTime` inconsistency entirely — content is only fetched when a new revision has been committed.

### Summary

| API | What it reflects | Latency |
|---|---|---|
| `drive.files.list` → `modifiedTime` | Metadata layer (change signal) | Near-instant |
| `docs.documents.get` → content | Docs content store | Seconds to minutes behind |
| `drive.revisions.list` → new revision | Committed content revision | Reliable content-ready signal |

**Key rule:** Always verify content readiness via `revisionId` or `revisions.list`, not `modifiedTime` alone.
