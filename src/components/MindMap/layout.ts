import type { MarkdownTreeNode } from '../MarkdownTree/types';
import type { LayoutPosition } from './types';

// Single source of truth for node width — drives layout spacing, the ReactFlow
// node width, drag hit-testing, and the rendered node box. 1.5× the 220 base.
export const NODE_WIDTH = 220 * 1.5;
// Leaf nodes (no children) render twice as wide as a normal node; height is
// unchanged. Derived from NODE_WIDTH so it tracks the single width source.
export const LEAF_NODE_WIDTH = NODE_WIDTH * 2;
export const NODE_HEIGHT = 80;

// Layered tree tuning.
const LEVEL_GAP_X = 90; // horizontal gap between levels
const GAP_Y = 30; // vertical gap between sibling leaf rows
// Extra breathing room between leaf rows only (readability). Applied to the
// leaf gap; non-leaf nodes are unaffected. Tune in one place.
const LEAF_GAP_MULTIPLIER = 1.5;

/**
 * Left-to-right layered tree layout. Every node at the same depth shares one
 * vertical axis (identical `x`), so each level reads as a clean column. Leaves
 * are packed into successive rows top-to-bottom and each parent is centered
 * vertically over the span of its children, producing a classic hierarchical
 * tree that expands rightward from the root.
 *
 * Returns the same `Map<id, {x, y}>` contract as before — positions are the
 * node's top-left corner. Because all nodes share one height, centering the
 * top-left over the children's span also centers the node over them.
 */
export const layoutTree = (
  tree: MarkdownTreeNode[],
): Map<string, LayoutPosition> => {
  const positions = new Map<string, LayoutPosition>();
  const yCursor = { value: 0 };

  // Place `node` and its subtree, returning the node's y so the parent can
  // center itself over its children. x is fixed by depth → shared per level.
  const place = (node: MarkdownTreeNode, depth: number): number => {
    const children = node.children ?? [];
    const x = depth * (NODE_WIDTH + LEVEL_GAP_X);

    if (children.length === 0) {
      const y = yCursor.value;
      positions.set(node.id, { x, y });
      // Leaf-only: widen the vertical gap between consecutive leaf rows.
      yCursor.value += NODE_HEIGHT + GAP_Y * LEAF_GAP_MULTIPLIER;
      return y;
    }

    const childYs = children.map((c) => place(c, depth + 1));
    const y = (childYs[0]! + childYs[childYs.length - 1]!) / 2;
    positions.set(node.id, { x, y });
    return y;
  };

  for (const root of tree) {
    place(root, 0);
    // Extra gap so independent root subtrees don't touch.
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
