import { arrayMove } from '@dnd-kit/sortable';
import type { MarkdownTreeNode } from './types';

export interface FlattenedItem {
  id: string;
  content: string;
  parentId: string | null;
  depth: number;
  index: number;
  children: MarkdownTreeNode[];
}

export const flattenTree = (
  items: MarkdownTreeNode[],
  parentId: string | null = null,
  depth = 0,
): FlattenedItem[] =>
  items.reduce<FlattenedItem[]>((acc, item, index) => {
    const children = item.children ?? [];
    return [
      ...acc,
      { id: item.id, content: item.content, parentId, depth, index, children },
      ...flattenTree(children, item.id, depth + 1),
    ];
  }, []);

export const buildTree = (flat: FlattenedItem[]): MarkdownTreeNode[] => {
  const root: MarkdownTreeNode = { id: 'root', content: '', children: [] };
  const byId = new Map<string, MarkdownTreeNode>();
  byId.set('root', root);

  for (const item of flat) {
    const node: MarkdownTreeNode = {
      id: item.id,
      content: item.content,
      children: [],
    };
    byId.set(item.id, node);
    const parent = byId.get(item.parentId ?? 'root');
    if (parent) {
      parent.children = parent.children ?? [];
      parent.children.push(node);
    }
  }

  const stripEmpty = (nodes: MarkdownTreeNode[]): MarkdownTreeNode[] =>
    nodes.map((n) => {
      const children = n.children ?? [];
      if (children.length === 0) {
        const { children: _omit, ...rest } = n;
        return rest;
      }
      return { ...n, children: stripEmpty(children) };
    });

  return stripEmpty(root.children ?? []);
};

const getDescendantIds = (
  items: FlattenedItem[],
  id: string,
): string[] => {
  const direct = items.filter((i) => i.parentId === id).map((i) => i.id);
  return direct.reduce<string[]>(
    (acc, childId) => [...acc, childId, ...getDescendantIds(items, childId)],
    [],
  );
};

/**
 * Remove the dragged node's descendants from the visible list while dragging,
 * so the user cannot drop a node into its own subtree.
 */
export const removeDescendants = (
  items: FlattenedItem[],
  activeId: string,
): FlattenedItem[] => {
  const descendants = new Set(getDescendantIds(items, activeId));
  return items.filter((item) => !descendants.has(item.id));
};

export interface Projection {
  depth: number;
  parentId: string | null;
}

export const getProjection = (
  items: FlattenedItem[],
  activeId: string,
  overId: string,
  dragOffsetX: number,
  indentationWidth: number,
): Projection => {
  const overIndex = items.findIndex((i) => i.id === overId);
  const activeIndex = items.findIndex((i) => i.id === activeId);
  if (overIndex < 0 || activeIndex < 0) {
    return { depth: 0, parentId: null };
  }

  const activeItem = items[activeIndex]!;
  const newItems = arrayMove(items, activeIndex, overIndex);
  const previousItem = newItems[overIndex - 1];
  const nextItem = newItems[overIndex + 1];

  const dragDepth = Math.round(dragOffsetX / indentationWidth);
  const projectedDepth = activeItem.depth + dragDepth;

  const maxDepth = previousItem ? previousItem.depth + 1 : 0;
  const minDepth = nextItem ? nextItem.depth : 0;

  let depth = projectedDepth;
  if (projectedDepth >= maxDepth) depth = maxDepth;
  else if (projectedDepth < minDepth) depth = minDepth;

  let parentId: string | null = null;
  if (depth > 0 && previousItem) {
    if (depth === previousItem.depth) {
      parentId = previousItem.parentId;
    } else if (depth > previousItem.depth) {
      parentId = previousItem.id;
    } else {
      const ancestor = newItems
        .slice(0, overIndex)
        .reverse()
        .find((item) => item.depth === depth);
      parentId = ancestor?.parentId ?? null;
    }
  }

  return { depth, parentId };
};

export const findItemDeep = (
  nodes: MarkdownTreeNode[],
  id: string,
): MarkdownTreeNode | undefined => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findItemDeep(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
};

export const removeItemDeep = (
  nodes: MarkdownTreeNode[],
  id: string,
): MarkdownTreeNode[] =>
  nodes
    .filter((n) => n.id !== id)
    .map((n) =>
      n.children
        ? { ...n, children: removeItemDeep(n.children, id) }
        : n,
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
