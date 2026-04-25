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

  let markdown = "";
  let tags = [];

  for (const element of body) {
    if (element.paragraph) {
      const result = convertParagraph(element.paragraph);

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

function convertParagraph(paragraph) {
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
    // We can't easily distinguish ordered vs unordered from the API without
    // checking the list properties, so we use "-" for all lists in iteration 1.
    // TODO: check doc.lists[listId].listProperties for ordered lists
    return `${indent}- ${text}\n`;
  }

  return `${text}\n\n`;
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
