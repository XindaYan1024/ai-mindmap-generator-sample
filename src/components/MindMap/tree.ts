import type { MarkdownTreeNode } from '../MarkdownTree/types';

export const findNode = (
  nodes: MarkdownTreeNode[],
  id: string,
): MarkdownTreeNode | undefined => {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findNode(n.children, id);
      if (found) return found;
    }
  }
  return undefined;
};

export const collectDescendantIds = (node: MarkdownTreeNode): Set<string> => {
  const ids = new Set<string>();
  const visit = (n: MarkdownTreeNode) => {
    for (const c of n.children ?? []) {
      ids.add(c.id);
      visit(c);
    }
  };
  visit(node);
  return ids;
};

export const isInSubtree = (
  root: MarkdownTreeNode,
  candidateId: string,
): boolean => {
  if (root.id === candidateId) return true;
  return (root.children ?? []).some((c) => isInSubtree(c, candidateId));
};

export const findParent = (
  nodes: MarkdownTreeNode[],
  id: string,
): MarkdownTreeNode | null => {
  for (const n of nodes) {
    if ((n.children ?? []).some((c) => c.id === id)) return n;
    if (n.children) {
      const inChild = findParent(n.children, id);
      if (inChild) return inChild;
    }
  }
  return null;
};

export const removeItemDeep = (
  nodes: MarkdownTreeNode[],
  id: string,
): MarkdownTreeNode[] =>
  nodes
    .filter((n) => n.id !== id)
    .map((n) =>
      n.children ? { ...n, children: removeItemDeep(n.children, id) } : n,
    );

export const updateItemDeep = (
  nodes: MarkdownTreeNode[],
  id: string,
  content: string,
): MarkdownTreeNode[] =>
  nodes.map((n) => {
    if (n.id === id) return { ...n, content };
    if (n.children) {
      return { ...n, children: updateItemDeep(n.children, id, content) };
    }
    return n;
  });

export const addChildDeep = (
  nodes: MarkdownTreeNode[],
  parentId: string,
  child: MarkdownTreeNode,
): MarkdownTreeNode[] =>
  nodes.map((n) => {
    if (n.id === parentId) {
      return { ...n, children: [...(n.children ?? []), child] };
    }
    if (n.children) {
      return { ...n, children: addChildDeep(n.children, parentId, child) };
    }
    return n;
  });

/**
 * Move `draggedId` to become a child of `newParentId`.
 * Returns the input array unchanged when the move is a no-op or invalid:
 *  - dragging onto itself
 *  - dragging onto a descendant (would create a cycle)
 *  - the node is already a direct child of the target
 */
export const moveNode = (
  nodes: MarkdownTreeNode[],
  draggedId: string,
  newParentId: string,
): MarkdownTreeNode[] => {
  if (draggedId === newParentId) return nodes;

  const dragged = findNode(nodes, draggedId);
  if (!dragged) return nodes;

  // Cycle check: the new parent cannot be inside the dragged subtree.
  if (isInSubtree(dragged, newParentId)) return nodes;

  // Already a direct child — no-op.
  const currentParent = findParent(nodes, draggedId);
  if (currentParent && currentParent.id === newParentId) return nodes;

  const withoutDragged = removeItemDeep(nodes, draggedId);
  // Clone the subtree to avoid sharing references across the tree
  const detached: MarkdownTreeNode = {
    id: dragged.id,
    content: dragged.content,
    ...(dragged.children ? { children: dragged.children } : {}),
  };
  return addChildDeep(withoutDragged, newParentId, detached);
};
