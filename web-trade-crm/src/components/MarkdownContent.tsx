import React from "react";
import "./MarkdownContent.css";

/**
 * Renders the small Markdown subset the legal documents use: ATX headings
 * (`#`, `##`, `###`), paragraphs, `-` bullet lists, `**bold**` spans, and
 * two-trailing-space hard line breaks.
 *
 * Deliberately tiny and dependency-free. The project has no Markdown library,
 * and adding one would mean rebuilding the web image (dependencies aren't
 * volume-mounted in the dev stack) — while legal text must display exactly as
 * written. So the source stays a `.md` file imported with Vite's `?raw` and only
 * the *formatting* is interpreted here; the wording is never re-typed.
 */
const BOLD = /\*\*(.+?)\*\*/;

/** Splits a line into text and `<strong>` runs. */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let rest = text;
  let index = 0;
  let match = BOLD.exec(rest);

  while (match !== null) {
    if (match.index > 0) {
      nodes.push(rest.slice(0, match.index));
    }
    nodes.push(<strong key={`${keyPrefix}-${index}`}>{match[1]}</strong>);
    rest = rest.slice(match.index + match[0].length);
    index += 1;
    match = BOLD.exec(rest);
  }

  if (rest) {
    nodes.push(rest);
  }

  return nodes;
}

interface ParagraphLine {
  text: string;
  /** True when the source line ended in two spaces (Markdown hard break). */
  hardBreak: boolean;
}

/** Parses the source into block-level React nodes. */
function renderMarkdown(source: string): React.ReactNode[] {
  const blocks: React.ReactNode[] = [];
  let paragraph: ParagraphLine[] = [];
  let bullets: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const children: React.ReactNode[] = [];
    paragraph.forEach((line, i) => {
      if (i > 0) {
        children.push(
          paragraph[i - 1].hardBreak ? (
            <br key={`br-${key}-${i}`} />
          ) : (
            // Lines of one paragraph are joined with a space, the way Markdown
            // soft-wraps them.
            " "
          ),
        );
      }
      children.push(...renderInline(line.text, `p-${key}-${i}`));
    });
    blocks.push(<p key={`p-${key++}`}>{children}</p>);
    paragraph = [];
  };

  const flushBullets = () => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={`ul-${key++}`}>
        {bullets.map((item, i) => (
          <li key={`li-${key}-${i}`}>{renderInline(item, `li-${key}-${i}`)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  for (const rawLine of source.replace(/\r\n/g, "\n").split("\n")) {
    const hardBreak = /\s{2,}$/.test(rawLine);
    const line = rawLine.trim();
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);

    if (line === "") {
      flushParagraph();
      flushBullets();
    } else if (heading) {
      flushParagraph();
      flushBullets();
      const Tag = `h${heading[1].length}` as "h1" | "h2" | "h3";
      const headingKey = key++;
      blocks.push(
        <Tag key={`h-${headingKey}`}>
          {renderInline(heading[2], `h-${headingKey}`)}
        </Tag>,
      );
    } else if (line.startsWith("- ")) {
      flushParagraph();
      bullets.push(line.slice(2));
    } else {
      flushBullets();
      paragraph.push({ text: line, hardBreak });
    }
  }

  flushParagraph();
  flushBullets();

  return blocks;
}

/** Displays a Markdown document (see the subset documented above). */
const MarkdownContent: React.FC<{ source: string }> = ({ source }) => (
  <div className="markdown-content">{renderMarkdown(source)}</div>
);

export default MarkdownContent;
