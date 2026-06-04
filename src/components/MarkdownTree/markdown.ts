import type { MarkdownTreeNode } from './types';

/**
 * Bidirectional conversion between the tree node format used everywhere in the
 * app ({ id, content, children }) and a plain-text Markdown outline.
 *
 * The canonical text representation is a *nested bullet list*: each node is one
 * `- ` bullet, and nesting depth is expressed with two spaces of indentation
 * per level. A node's `content` may itself be multi-line Markdown (headings,
 * bold, paragraphs); continuation lines are indented to align under the bullet
 * text so the document round-trips cleanly.
 *
 * This module is intentionally standalone — it has no React/DOM dependency and
 * no knowledge of the tree component's drag/edit logic.
 */

/** Spaces of indentation that represent one level of nesting. */
const INDENT_UNIT = 2;

const generateId = () =>
  `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Serialize a tree into a nested-bullet Markdown outline. */
export const treeToMarkdown = (nodes: MarkdownTreeNode[]): string => {
  const lines: string[] = [];

  const walk = (items: MarkdownTreeNode[], depth: number) => {
    for (const item of items) {
      const pad = ' '.repeat(depth * INDENT_UNIT);
      const contentPad = pad + ' '.repeat(INDENT_UNIT);
      const [first = '', ...rest] = (item.content ?? '').split('\n');

      lines.push(`${pad}- ${first}`);
      for (const line of rest) {
        // Keep blank lines blank; indent real content to align under the text.
        lines.push(line.length ? `${contentPad}${line}` : '');
      }

      if (item.children?.length) walk(item.children, depth + 1);
    }
  };

  walk(nodes, 0);
  return lines.join('\n');
};

interface ParsedLine {
  depth: number;
  contentLines: string[];
}

const BULLET_RE = /^(\s*)[-*]\s?(.*)$/;

/** Drop trailing blank lines a user may have typed between nodes. */
const trimTrailingBlanks = (lines: string[]): string[] => {
  const out = [...lines];
  while (out.length > 1 && out[out.length - 1]!.trim() === '') out.pop();
  return out;
};

/**
 * Parse a Markdown outline back into the tree node format.
 *
 * Indentation is measured in {@link INDENT_UNIT}-space units (tabs count as one
 * unit). Relative nesting is what matters: a more-indented bullet becomes a
 * child of the nearest less-indented bullet, so unevenly indented input still
 * produces a sensible tree.
 *
 * When `previous` is supplied, node ids are reused in pre-order so that editing
 * Markdown text keeps stable node identity wherever the structure lines up
 * (only added nodes receive fresh ids).
 */
export const markdownToTree = (
  markdown: string,
  previous?: MarkdownTreeNode[],
): MarkdownTreeNode[] => {
  const parsed: ParsedLine[] = [];
  let current: ParsedLine | null = null;

  for (const original of markdown.split('\n')) {
    // Normalize tabs so indentation math is uniform.
    const raw = original.replace(/\t/g, ' '.repeat(INDENT_UNIT));
    const match = raw.match(BULLET_RE);

    if (match) {
      const indent = match[1]!.length;
      const depth = Math.floor(indent / INDENT_UNIT);
      current = { depth, contentLines: [match[2] ?? ''] };
      parsed.push(current);
    } else if (current) {
      // Continuation line: strip the bullet's content indent, keep the rest.
      const stripCount = current.depth * INDENT_UNIT + INDENT_UNIT;
      const stripped = raw.startsWith(' '.repeat(stripCount))
        ? raw.slice(stripCount)
        : raw.replace(/^\s+/, '');
      current.contentLines.push(stripped);
    }
    // Lines before the first bullet are ignored.
  }

  // Reuse ids from the previous tree in pre-order for stable identity.
  const reusableIds: string[] = [];
  const collectIds = (items: MarkdownTreeNode[]) => {
    for (const item of items) {
      reusableIds.push(item.id);
      if (item.children) collectIds(item.children);
    }
  };
  if (previous) collectIds(previous);
  let idIndex = 0;
  const nextId = () => reusableIds[idIndex++] ?? generateId();

  const roots: MarkdownTreeNode[] = [];
  const stack: { node: MarkdownTreeNode; depth: number }[] = [];

  for (const line of parsed) {
    const content = trimTrailingBlanks(line.contentLines).join('\n');
    const node: MarkdownTreeNode = { id: nextId(), content };

    while (stack.length && stack[stack.length - 1]!.depth >= line.depth) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      const parent = stack[stack.length - 1]!.node;
      parent.children = parent.children ?? [];
      parent.children.push(node);
    }

    stack.push({ node, depth: line.depth });
  }

  return roots;
};
