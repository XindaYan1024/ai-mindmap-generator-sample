import type { MarkdownTreeNode } from '../MarkdownTree/types';
import type { LayoutPosition } from './types';

export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 80;
const GAP_X = 80;
const GAP_Y = 24;

/**
 * Compute a simple horizontal tree layout: root(s) on the left, children to the right.
 * Each leaf claims one vertical slot; internal nodes are vertically centered on their
 * children.
 */
export const layoutTree = (
  tree: MarkdownTreeNode[],
): Map<string, LayoutPosition> => {
  const positions = new Map<string, LayoutPosition>();
  const yCursor = { value: 0 };

  const place = (node: MarkdownTreeNode, depth: number): number => {
    const children = node.children ?? [];
    const x = depth * (NODE_WIDTH + GAP_X);

    if (children.length === 0) {
      const y = yCursor.value;
      positions.set(node.id, { x, y });
      yCursor.value += NODE_HEIGHT + GAP_Y;
      return y;
    }

    const childYs = children.map((c) => place(c, depth + 1));
    const y = (childYs[0]! + childYs[childYs.length - 1]!) / 2;
    positions.set(node.id, { x, y });
    return y;
  };

  for (const root of tree) {
    place(root, 0);
    yCursor.value += GAP_Y;
  }

  return positions;
};

/**
 * Walk the tree and return [parentId, childId] edge pairs.
 */
export const collectEdges = (
  tree: MarkdownTreeNode[],
): Array<{ source: string; target: string }> => {
  const edges: Array<{ source: string; target: string }> = [];
  const visit = (node: MarkdownTreeNode) => {
    for (const child of node.children ?? []) {
      edges.push({ source: node.id, target: child.id });
      visit(child);
    }
  };
  tree.forEach(visit);
  return edges;
};

/**
 * Walk the tree and return a flat array of nodes in level-order (BFS), with
 * their parent ID: root(s) first, then every direct child, then each deeper
 * level in turn. Rendering follows this array, so the map mounts hierarchically
 * — a parent is always emitted before its children, and all nodes of one level
 * precede any node of the next.
 *
 * Implemented as recursion over levels: each call emits the current level and
 * recurses into the level it collects. Output shape and parent-child links are
 * identical to before — only the ordering changed.
 */
export const flattenForMindMap = (
  tree: MarkdownTreeNode[],
): Array<{ id: string; content: string; parentId: string | null }> => {
  const out: Array<{ id: string; content: string; parentId: string | null }> = [];

  type LevelEntry = { node: MarkdownTreeNode; parentId: string | null };

  const visitLevel = (level: LevelEntry[]) => {
    if (level.length === 0) return;
    const nextLevel: LevelEntry[] = [];
    for (const { node, parentId } of level) {
      out.push({ id: node.id, content: node.content, parentId });
      for (const child of node.children ?? []) {
        nextLevel.push({ node: child, parentId: node.id });
      }
    }
    visitLevel(nextLevel);
  };

  visitLevel(tree.map((root) => ({ node: root, parentId: null })));
  return out;
};
