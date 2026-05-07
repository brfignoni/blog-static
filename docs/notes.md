## Google Cloud:
- project id: `blog-static-2026`
- service email: `blog-drive-sync@blog-static-2026.iam.gserviceaccount.com`

## Google Drive
- posts folder id: `1yuwh2sJq9l7NixJ8tCcZjOM1mA0yJQ_b`

## Eleventy

### i18n — `EleventyI18nPlugin`

Built-in plugin (no extra package). Register once in `eleventy.config.js`:

```js
const { EleventyI18nPlugin } = require("@11ty/eleventy");

eleventyConfig.addPlugin(EleventyI18nPlugin, {
  defaultLanguage: "es"
});
```

Language detection is automatic based on folder structure — files under `src/es/` are Spanish, `src/en/` English, `src/pt/` Portuguese. No frontmatter needed for this.

#### `locale_url` filter

Rewrites the language prefix of a URL to match the current page's language:

```nunjucks
<a href="{{ '/es/posts/' | locale_url }}">Blog</a>
```

Renders `/es/posts/` on an `es` page, `/en/posts/` on an `en` page, etc.

**Limitation:** only swaps the prefix — assumes the rest of the URL is the same across languages. Since post and category slugs are translated (different strings per language), `locale_url` is only reliable for structural pages like `/posts/`, `/about/`, etc. For post-level cross-language links, use `locale_links`.

#### `locale_links` filter

Returns all translations of the current page — the right tool for a language switcher:

```nunjucks
{% for link in page.url | locale_links %}
  <a href="{{ link.url }}" lang="{{ link.lang }}">{{ link.label }}</a>
{% endfor %}
```

Because slugs differ per language, the plugin can't match translations by URL alone. Pages need a shared `translationKey` in frontmatter — the Google Drive doc ID is perfect since it's the same for all language tabs of the same post:

```yaml
translationKey: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
```

`sync.js` adds this automatically using `doc.id`.

#### Folder structure

```text
src/
  es/posts/<category-slug>/<title-slug>.md   ← Spanish (main body, no tab)
  en/posts/<category-slug>/<title-slug>.md   ← English tab
  pt/posts/<category-slug>/<title-slug>.md   ← Portuguese tab
```

#### i18n data — `src/_data/i18n.json`

Single source of truth for language labels and category name translations. Eleventy exposes it automatically as `i18n` in all templates.

```json
{
  "languages": {
    "es": { "label": "Español" },
    "en": { "label": "English" },
    "pt": { "label": "Português" }
  },
  "categories": {
    "interes-general": {
      "es": { "label": "Interés General",              "slug": "interes-general" },
      "en": { "label": "General Interest",             "slug": "general-interest" },
      "pt": { "label": "Interesse Geral",              "slug": "interesse-geral" }
    }
  }
}
```

`sync.js` uses this file to resolve the correct category slug per language when writing output files.
