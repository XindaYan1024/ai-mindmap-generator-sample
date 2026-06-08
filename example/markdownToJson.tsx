import type { MarkdownTreeNode } from '../src/components/MarkdownTree/types';

// Convert a mind-map Markdown string into the question.json-shaped tree JSON.
//
// This is the TS port of backend/app/ai/markdown_tree.py — given the same
// Markdown (the format stored in src/markdownAPIData.json), it produces the
// identical { content, attachment: { type, tree } } envelope.
//
// Markdown mapping:
//   # H1            → the single root node            (id "root")
//   ## H2           → a section node under the root    (id "section-N")
//   - bullet        → a point node under the section   (id "section-N-q-M")
//   (indented) -    → a one-sentence description under  (id "section-N-q-M-d-K")
//                     the point above it

/** A 3rd-level point with its one-sentence description (4th level). */
export interface Subtopic {
  title: string;
  description: string;
}

/** A 2nd-level section (`##`) and the points beneath it. */
export interface Topic {
  title: string;
  subtopics: Subtopic[];
}

/** The mockedAPI.json shape: a flat list of topics, H1 omitted. */
export interface MindmapData {
  topics: Topic[];
}

/** Strip leading heading hashes and surrounding whitespace from node content. */
const cleanTitle = (content: string): string =>
  content.split('\n', 1)[0]!.replace(/^#+\s*/, '').trim();

// One level of bullet nesting is two spaces of indentation (a tab counts as one
// level). Matches src/components/MarkdownTree/markdown.ts and the backend.
const INDENT_UNIT = 2;

const H1_RE = /^#\s+(.*)$/;
const HEADING_RE = /^(#{2,})\s+(.*)$/;
const BULLET_RE = /^(\s*)[-*]\s+(.*)$/;

/** Parse a mind-map Markdown string into a question.json-shaped tree. */
export function markdownToTree(markdown: string): MarkdownTreeNode[] {
  let root: MarkdownTreeNode | null = null;
  let section: MarkdownTreeNode | null = null;
  let point: MarkdownTreeNode | null = null;
  let lastNode: MarkdownTreeNode | null = null;
  let sectionCount = 0;
  let leafCount = 0;
  let descCount = 0;

  const ensureRoot = (): MarkdownTreeNode => {
    if (root === null) {
      root = { id: 'root', content: '# Mind Map' };
      lastNode = root;
    }
    return root;
  };

  for (let raw of (markdown ?? '').split('\n')) {
    // Normalize tabs so indentation math is uniform; keep the raw line for
    // bullet-depth detection, and a stripped copy for headings.
    raw = raw.replace(/\t/g, ' '.repeat(INDENT_UNIT));
    const line = raw.trim();
    if (!line) continue;

    // H1 → root. The first H1 wins; any later H1 is demoted to a section.
    const h1 = line.match(H1_RE);
    let working = line;
    if (h1 && !line.startsWith('##')) {
      if (root === null) {
        root = { id: 'root', content: line };
        lastNode = root;
        section = null;
        point = null;
        sectionCount = 0;
        continue;
      }
      working = `## ${h1[1]!.trim()}`; // demote, handled below
    }

    // H2 (or any deeper heading / demoted H1) → section
    const heading = working.match(HEADING_RE);
    if (heading) {
      const r = ensureRoot();
      sectionCount += 1;
      leafCount = 0;
      point = null;
      section = { id: `section-${sectionCount}`, content: `## ${heading[2]!.trim()}` };
      (r.children ??= []).push(section);
      lastNode = section;
      continue;
    }

    // Bullets. A top-level bullet is a point under the current section; an
    // indented bullet is the one-sentence description of the point above it.
    const bullet = raw.match(BULLET_RE);
    if (bullet) {
      const r = ensureRoot();
      const depth = Math.floor(bullet[1]!.length / INDENT_UNIT);
      const text = bullet[2]!.trim();

      if (depth >= 1 && point !== null) {
        descCount += 1;
        const desc: MarkdownTreeNode = { id: `${point.id}-d-${descCount}`, content: text };
        (point.children ??= []).push(desc);
        lastNode = desc;
        continue;
      }

      leafCount += 1;
      descCount = 0;
      const parent = section ?? r;
      point = { id: `${parent.id}-q-${leafCount}`, content: text };
      (parent.children ??= []).push(point);
      lastNode = point;
      continue;
    }

    // Anything else is a continuation line → append to the most recent node.
    if (lastNode !== null) {
      lastNode.content = `${lastNode.content}\n${line}`.trim();
    }
  }

  return root !== null ? [root] : [];
}

/**
 * Convert the Markdown into the mockedAPI.json shape: each `##` section becomes
 * a topic, each top-level bullet a subtopic, and that bullet's nested bullet its
 * description. The `#` H1 is not represented in this structure.
 */
export function markdownToMindmapData(markdown: string): MindmapData {
  const tree = markdownToTree(markdown);
  const root = tree[0];
  const sections = root?.children ?? [];

  const topics: Topic[] = sections.map((section) => ({
    title: cleanTitle(section.content),
    subtopics: (section.children ?? []).map((point) => ({
      title: cleanTitle(point.content),
      description: point.children?.[0]
        ? cleanTitle(point.children[0].content)
        : '',
    })),
  }));

  return { topics };
}
