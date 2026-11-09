import React from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Strictly sanitize URLs for markdown inline links.
 * Only http:, https:, mailto:, and root-relative paths are allowed.
 */
function isSafeUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("/")
  );
}

/**
 * Parses sanitized inline Markdown without using dangerouslySetInnerHTML.
 * Supports links, bold (**text** and __text__), italics, and strikethrough.
 */
function parseInline(text: string): React.ReactNode[] {
  const tokenRegex =
    /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*\n]+)\*\*|__([^_\n]+)__|~~([^~\n]+)~~|\*([^*\n]+)\*|(?<!\w)_([^_\n]+)_(?!\w))/g;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.substring(lastIndex, match.index));
    }

    const fullMatch = match[0];
    const linkText = match[2];
    const linkUrl = match[3];
    const boldText = match[4] || match[5];
    const strikeText = match[6];
    const italicText = match[7] || match[8];
    const key = `md-${match.index}-${elements.length}`;

    if (linkText && linkUrl) {
      if (isSafeUrl(linkUrl)) {
        const isExternal = /^https?:\/\//i.test(linkUrl.trim());
        elements.push(
          <a
            key={key}
            href={linkUrl.trim()}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            className="underline font-bold hover:text-black transition-colors"
          >
            {parseInline(linkText)}
          </a>
        );
      } else {
        elements.push(linkText);
      }
    } else if (boldText) {
      elements.push(
        <strong key={key} className="font-bold" style={{ fontWeight: 700 }}>
          {parseInline(boldText)}
        </strong>
      );
    } else if (strikeText) {
      elements.push(
        <del key={key} className="line-through opacity-80">
          {parseInline(strikeText)}
        </del>
      );
    } else if (italicText) {
      elements.push(
        <em key={key} className="italic">
          {parseInline(italicText)}
        </em>
      );
    } else {
      elements.push(fullMatch);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return elements.length > 0 ? elements : [text];
}

function renderBlocks(lines: string[]): React.ReactNode[] {
  const blocks: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingClass =
        level <= 2
          ? "text-base sm:text-lg font-black leading-tight"
          : "text-sm sm:text-base font-bold leading-tight";
      blocks.push(
        React.createElement(
          `h${level}`,
          { key: `heading-${index}`, className: headingClass },
          parseInline(headingMatch[2])
        )
      );
      index += 1;
      continue;
    }

    const unorderedMatch = /^\s*[-*+]\s+(.+)$/.exec(line);
    if (unorderedMatch) {
      const items: React.ReactNode[] = [];
      const startIndex = index;
      while (index < lines.length) {
        const itemMatch = /^\s*[-*+]\s+(.+)$/.exec(lines[index]);
        if (!itemMatch) break;
        items.push(<li key={`unordered-item-${index}`}>{parseInline(itemMatch[1])}</li>);
        index += 1;
      }
      blocks.push(
        <ul key={`unordered-${startIndex}`} className="ml-5 list-disc space-y-0.5">
          {items}
        </ul>
      );
      continue;
    }

    const orderedMatch = /^\s*\d+[.)]\s+(.+)$/.exec(line);
    if (orderedMatch) {
      const items: React.ReactNode[] = [];
      const startIndex = index;
      while (index < lines.length) {
        const itemMatch = /^\s*\d+[.)]\s+(.+)$/.exec(lines[index]);
        if (!itemMatch) break;
        items.push(<li key={`ordered-item-${index}`}>{parseInline(itemMatch[1])}</li>);
        index += 1;
      }
      blocks.push(
        <ol key={`ordered-${startIndex}`} className="ml-5 list-decimal space-y-0.5">
          {items}
        </ol>
      );
      continue;
    }

    if (!line.trim()) {
      blocks.push(<span key={`space-${index}`} className="block h-2" aria-hidden="true" />);
    } else {
      blocks.push(
        <span key={`line-${index}`} className="block">
          {parseInline(line)}
        </span>
      );
    }
    index += 1;
  }

  return blocks;
}

/**
 * Sanitized Markdown renderer used by public and admin-authored copy.
 * Supports headings, links, bold, italics, strikethrough, lists, and line breaks.
 */
export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  if (!content) return null;

  return (
    <div className={`space-y-1 ${className}`.trim()}>
      {renderBlocks(content.split("\n"))}
    </div>
  );
}
