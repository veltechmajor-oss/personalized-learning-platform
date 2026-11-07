"use client";

import React from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Lightweight, safe React Markdown Renderer for AcademicIQ.
 * Formatted for clean, highly legible academic reading on light surfaces.
 */
export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  if (!content) return null;

  // Split content by lines
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let currentListItems: { type: "ul" | "ol"; items: string[] } | null = null;

  const flushList = () => {
    if (currentListItems) {
      if (currentListItems.type === "ul") {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc pl-5 my-2.5 space-y-1.5 text-[#17172B]">
            {currentListItems.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {renderInlineFormatting(item)}
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`ol-${elements.length}`} className="list-decimal pl-5 my-2.5 space-y-1.5 text-[#17172B]">
            {currentListItems.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {renderInlineFormatting(item)}
              </li>
            ))}
          </ol>
        );
      }
      currentListItems = null;
    }
  };

  const flushCodeBlock = () => {
    if (codeBlockLines.length > 0) {
      elements.push(
        <pre
          key={`code-${elements.length}`}
          className="my-3 p-4 rounded-xl bg-[#F7F7FA] border border-[#E4E3EC] text-[#0D1445] font-mono text-xs overflow-x-auto leading-relaxed shadow-xs"
        >
          <code>{codeBlockLines.join("\n")}</code>
        </pre>
      );
      codeBlockLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Check for fenced code block toggle
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      continue;
    }

    // Empty line
    if (!line) {
      flushList();
      continue;
    }

    // Headings
    if (line.startsWith("#### ")) {
      flushList();
      elements.push(
        <h4 key={`h4-${elements.length}`} className="text-xs font-bold text-[#0D1445] mt-4 mb-1.5 uppercase tracking-wide">
          {renderInlineFormatting(line.slice(5))}
        </h4>
      );
      continue;
    }
    if (line.startsWith("### ")) {
      flushList();
      elements.push(
        <h3
          key={`h3-${elements.length}`}
          className="text-sm font-bold text-[#0D1445] mt-5 mb-2 flex items-center gap-2 border-b border-[#E4E3EC] pb-1.5"
        >
          <span className="w-1.5 h-3.5 rounded-full bg-[#0D1445] inline-block"></span>
          {renderInlineFormatting(line.slice(4))}
        </h3>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      flushList();
      elements.push(
        <h2 key={`h2-${elements.length}`} className="text-base font-extrabold text-[#0D1445] mt-6 mb-2.5">
          {renderInlineFormatting(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith("# ")) {
      flushList();
      elements.push(
        <h1 key={`h1-${elements.length}`} className="text-lg font-black text-[#0D1445] mt-6 mb-3">
          {renderInlineFormatting(line.slice(2))}
        </h1>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      flushList();
      elements.push(
        <blockquote
          key={`quote-${elements.length}`}
          className="my-3 pl-4 py-2 border-l-4 border-[#0D1445] bg-[#F7F7FA] rounded-r-xl text-[#686A7D] italic text-xs leading-relaxed"
        >
          {renderInlineFormatting(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Unordered List items (- , * , • )
    const ulMatch = line.match(/^[-*•]\s+(.*)$/);
    if (ulMatch) {
      if (!currentListItems || currentListItems.type !== "ul") {
        flushList();
        currentListItems = { type: "ul", items: [] };
      }
      currentListItems.items.push(ulMatch[1]);
      continue;
    }

    // Numbered List items (1. , 2. )
    const olMatch = line.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      if (!currentListItems || currentListItems.type !== "ol") {
        flushList();
        currentListItems = { type: "ol", items: [] };
      }
      currentListItems.items.push(olMatch[1]);
      continue;
    }

    // Normal Paragraph
    flushList();
    elements.push(
      <p key={`p-${elements.length}`} className="my-2 text-[#17172B] leading-relaxed text-xs sm:text-sm">
        {renderInlineFormatting(line)}
      </p>
    );
  }

  flushList();
  if (inCodeBlock) {
    flushCodeBlock();
  }

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}

/**
 * Safely parse bold (**text**), italics (*text*), and inline code (`code`).
 */
function renderInlineFormatting(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const matchStart = match.index;
    if (matchStart > lastIndex) {
      parts.push(text.slice(lastIndex, matchStart));
    }

    const token = match[0];
    if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={`code-${matchStart}`}
          className="px-1.5 py-0.5 rounded-md bg-[#F2F2F9] border border-[#BFBFDB] text-[#0D1445] font-mono text-[11px]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={`bold-${matchStart}`} className="font-bold text-[#0D1445]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={`italic-${matchStart}`} className="italic text-[#58587A]">
          {token.slice(1, -1)}
        </em>
      );
    }

    lastIndex = matchStart + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
