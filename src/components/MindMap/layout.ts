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
 * When the root has more than 4 direct children, the layout switches to a
 * balanced left-right mode: the first N/2 children go left, the rest go right.
 * Both halves are laid out independently and then vertically centered against
 * each other so the root sits in the middle.
 *
 * Returns `Map<id, {x, y, side}>`. `side` is set only in the balanced layout.
 */
export const layoutTree = (
  tree: MarkdownTreeNode[],
): Map<string, LayoutPosition> => {
  const positions = new Map<string, LayoutPosition>();
  const yCursor = { value: 0 };

  // ── helpers used only by the balanced layout ─────────────────────────────

  // Place `node` and its subtree expanding in `side` direction. Nodes at depth
  // d have their edge closest to the root at ±d*(NODE_WIDTH+LEVEL_GAP_X).
  // For left-side leaves the extra width is absorbed leftward so the right edge
  // stays flush with the non-leaf boundary.
  const placeDirectional = (
    node: MarkdownTreeNode,
    depth: number,
    side: 'left' | 'right',
    cursor: { value: number },
    out: Map<string, LayoutPosition>,
  ): number => {
    const children = node.children ?? [];
    const nodeWidth = children.length === 0 ? LEAF_NODE_WIDTH : NODE_WIDTH;
    const step = depth * (NODE_WIDTH + LEVEL_GAP_X);
    // For right side: left edge at +step.
    // For left side: right edge at -step, so left edge = -step - nodeWidth.
    //   Non-leaf extra = 0; leaf extra = LEAF_NODE_WIDTH - NODE_WIDTH = NODE_WIDTH.
    const x =
      side === 'right'
        ? step
        : -step - (nodeWidth - NODE_WIDTH); // simplifies to -step for non-leaf

    if (children.length === 0) {
      const y = cursor.value;
      out.set(node.id, { x, y, side });
      cursor.value += NODE_HEIGHT + GAP_Y * LEAF_GAP_MULTIPLIER;
      return y;
    }

    const childYs = children.map((c) =>
      placeDirectional(c, depth + 1, side, cursor, out),
    );
    const y = (childYs[0]! + childYs[childYs.length - 1]!) / 2;
    out.set(node.id, { x, y, side });
    return y;
  };

  // Shift every node in `node`'s subtree vertically by `dy`.
  const shiftSubtreeY = (
    node: MarkdownTreeNode,
    dy: number,
    map: Map<string, LayoutPosition>,
  ) => {
    const pos = map.get(node.id);
    if (pos) map.set(node.id, { ...pos, y: pos.y + dy });
    for (const child of node.children ?? []) shiftSubtreeY(child, dy, map);
  };

  // ── original single-direction (right-only) layout ────────────────────────

  const place = (node: MarkdownTreeNode, depth: number): number => {
    const children = node.children ?? [];
    const x = depth * (NODE_WIDTH + LEVEL_GAP_X);

    if (children.length === 0) {
      const y = yCursor.value;
      positions.set(node.id, { x, y });
      yCursor.value += NODE_HEIGHT + GAP_Y * LEAF_GAP_MULTIPLIER;
      return y;
    }

    const childYs = children.map((c) => place(c, depth + 1));
    const y = (childYs[0]! + childYs[childYs.length - 1]!) / 2;
    positions.set(node.id, { x, y });
    return y;
  };

  // ── main loop ─────────────────────────────────────────────────────────────

  for (const root of tree) {
    const children = root.children ?? [];
    const N = children.length;

    if (N >= 2) {
      // Balanced left-right layout: applies whenever there are 2+ root-level
      // children, ensuring the root stays centred regardless of topic count.
      // (The previous N>4 threshold left the root at the left edge for smaller
      // backend responses, making the layout inconsistent with JSON input.)
      const leftCount = Math.floor(N / 2);
      const leftChildren = children.slice(0, leftCount);
      const rightChildren = children.slice(leftCount);

      // Layout each half independently starting from y=0.
      const rightMap = new Map<string, LayoutPosition>();
      const rightCursor = { value: 0 };
      const rightYs = rightChildren.map((c) =>
        placeDirectional(c, 1, 'right', rightCursor, rightMap),
      );

      const leftMap = new Map<string, LayoutPosition>();
      const leftCursor = { value: 0 };
      leftChildren.forEach((c) =>
        placeDirectional(c, 1, 'left', leftCursor, leftMap),
      );

      const rightH = rightCursor.value;
      const leftH = leftCursor.value;
      const totalH = Math.max(rightH, leftH);

      // Shift each half so it is vertically centered within totalH, then
      // offset both by the global yCursor so roots stack correctly.
      const rightDy = yCursor.value + (totalH - rightH) / 2;
      const leftDy = yCursor.value + (totalH - leftH) / 2;
      for (const c of rightChildren) shiftSubtreeY(c, rightDy, rightMap);
      for (const c of leftChildren) shiftSubtreeY(c, leftDy, leftMap);

      for (const [id, pos] of rightMap) positions.set(id, pos);
      for (const [id, pos] of leftMap) positions.set(id, pos);

      // Root y = center of the right half (both halves share the same center).
      const rootY =
        (rightYs[0]! + rightYs[rightYs.length - 1]!) / 2 + rightDy;
      positions.set(root.id, { x: 0, y: rootY, side: 'root' });

      yCursor.value += totalH + GAP_Y;
    } else {
      place(root, 0);
      yCursor.value += GAP_Y;
    }
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
): Array<{ id: string; content: string; parentId: string | null; contents?: any[] }> => {
  const out: Array<{ id: string; content: string; parentId: string | null; contents?: any[] }> = [];

  type LevelEntry = { node: MarkdownTreeNode; parentId: string | null };

  const visitLevel = (level: LevelEntry[]) => {
    if (level.length === 0) return;
    const nextLevel: LevelEntry[] = [];
    for (const { node, parentId } of level) {
      out.push({ id: node.id, content: node.content, parentId, contents: node.contents });
      for (const child of node.children ?? []) {
        nextLevel.push({ node: child, parentId: node.id });
      }
    }
    visitLevel(nextLevel);
  };

  visitLevel(tree.map((root) => ({ node: root, parentId: null })));
  return out;
};
