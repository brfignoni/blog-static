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
