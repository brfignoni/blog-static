import { getDocs } from "./auth.js";

/**
 * Fetches a Google Doc and converts its structured content to Markdown.
 * Returns { markdown, tags } where tags are extracted from a "tags:" line.
 */
export async function docToMarkdown(docId) {
  const docs = getDocs();
  const res = await docs.documents.get({ documentId: docId });
  const doc = res.data;
  const body = doc.body.content || [];
  const lists = doc.lists || {};

  let markdown = "";
  let tags = [];
  const listCounters = {};

  for (const element of body) {
    if (element.paragraph) {
      const result = convertParagraph(element.paragraph, lists, listCounters);

      // Check for tags line (e.g., "tags: foo, bar, baz")
      const tagsMatch = result.match(/^tags:\s*(.+)$/i);
      if (tagsMatch) {
        tags = tagsMatch[1].split(",").map((t) => t.trim());
        continue;
      }

      markdown += result;
    } else if (element.table) {
      markdown += convertTable(element.table);
    }
  }

  return { markdown: markdown.trim() + "\n", tags };
}

function convertParagraph(paragraph, lists, listCounters) {
  const style = paragraph.paragraphStyle?.namedStyleType || "NORMAL_TEXT";
  const elements = paragraph.elements || [];
  let text = "";

  for (const el of elements) {
    if (el.textRun) {
      text += convertTextRun(el.textRun);
    } else if (el.inlineObjectElement) {
      // Iteration 1: skip images
      text += "<!-- image skipped -->";
    }
  }

  // Trim trailing newline that Google Docs adds to every paragraph
  text = text.replace(/\n$/, "");

  if (!text.trim()) return "\n";

  // Headings
  if (style === "HEADING_1") return `# ${stripInline(text)}\n\n`;
  if (style === "HEADING_2") return `## ${stripInline(text)}\n\n`;
  if (style === "HEADING_3") return `### ${stripInline(text)}\n\n`;
  if (style === "HEADING_4") return `#### ${stripInline(text)}\n\n`;
  if (style === "HEADING_5") return `##### ${stripInline(text)}\n\n`;
  if (style === "HEADING_6") return `###### ${stripInline(text)}\n\n`;

  // Lists
  const bullet = paragraph.bullet;
  if (bullet) {
    const level = bullet.nestingLevel || 0;
    const indent = "  ".repeat(level);
    const listId = bullet.listId;
    const isOrdered = isOrderedList(lists, listId, level);

    if (isOrdered) {
      const key = `${listId}-${level}`;
      listCounters[key] = (listCounters[key] || 0) + 1;
      return `${indent}${listCounters[key]}. ${text}\n`;
    }

    return `${indent}- ${text}\n`;
  }

  // Reset list counters when we hit a non-list paragraph
  for (const key of Object.keys(listCounters)) {
    delete listCounters[key];
  }

  return `${text}\n\n`;
}

function isOrderedList(lists, listId, nestingLevel) {
  const list = lists[listId];
  if (!list) return false;
  const props = list.listProperties?.nestingLevels?.[nestingLevel];
  if (!props) return false;
  // If glyphType is set and not GLYPH_TYPE_UNSPECIFIED, it's ordered
  // Common ordered types: DECIMAL, UPPER_ALPHA, LOWER_ALPHA, UPPER_ROMAN, LOWER_ROMAN
  const glyphType = props.glyphType;
  if (glyphType && glyphType !== "GLYPH_TYPE_UNSPECIFIED") return true;
  // If glyphSymbol is set (e.g., bullet characters), it's unordered
  if (props.glyphSymbol) return false;
  return false;
}

function convertTextRun(textRun) {
  let text = textRun.content || "";
  const style = textRun.textStyle || {};

  // Apply inline formatting
  if (style.bold && style.italic) {
    text = wrapInline(text, "***");
  } else if (style.bold) {
    text = wrapInline(text, "**");
  } else if (style.italic) {
    text = wrapInline(text, "*");
  }

  if (style.strikethrough) {
    text = wrapInline(text, "~~");
  }

  if (style.weightedFontFamily?.fontFamily === "Courier New" || style.fontFamily === "Courier New") {
    text = wrapInline(text, "`");
  }

  // Links
  if (style.link?.url) {
    const linkText = text.replace(/\n$/, "");
    const trailing = text.endsWith("\n") ? "\n" : "";
    text = `[${linkText}](${style.link.url})${trailing}`;
  }

  return text;
}

/**
 * Wraps text with a marker (**, *, ~~, `) without wrapping the trailing newline.
 */
function wrapInline(text, marker) {
  const trailing = text.endsWith("\n") ? "\n" : "";
  const inner = text.replace(/\n$/, "");
  if (!inner.trim()) return text;
  return `${marker}${inner}${marker}${trailing}`;
}

/**
 * Strip inline markdown markers for use in headings (avoids double-formatting).
 */
function stripInline(text) {
  return text.trim();
}

function convertTable(table) {
  const rows = table.tableRows || [];
  if (rows.length === 0) return "";

  let md = "\n";

  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].tableCells || [];
    const cellTexts = cells.map((cell) => {
      const content = cell.content || [];
      return content
        .map((el) => {
          if (el.paragraph) {
            const elements = el.paragraph.elements || [];
            return elements.map((e) => (e.textRun?.content || "").replace(/\n/g, " ")).join("");
          }
          return "";
        })
        .join(" ")
        .trim();
    });

    md += `| ${cellTexts.join(" | ")} |\n`;

    // Add header separator after first row
    if (i === 0) {
      md += `| ${cellTexts.map(() => "---").join(" | ")} |\n`;
    }
  }

  md += "\n";
  return md;
}
