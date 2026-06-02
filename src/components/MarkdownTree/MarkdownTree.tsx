import { useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableTreeItem } from './SortableTreeItem';
import {
  flattenTree,
  buildTree,
  getProjection,
  removeDescendants,
  removeItemDeep,
  updateItemDeep,
  addChildDeep,
  type Projection,
} from './utils';
import type { MarkdownTreeNode, MarkdownTreeProps } from './types';
import './MarkdownTree.css';

const INDENTATION_WIDTH = 24;

const generateId = () =>
  `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const MarkdownTree = ({
  value,
  defaultValue,
  onChange,
  renderMarkdown = true,
  editable = true,
  className,
}: MarkdownTreeProps) => {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<MarkdownTreeNode[]>(
    defaultValue ?? [],
  );
  const tree = isControlled ? (value as MarkdownTreeNode[]) : internal;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [offsetLeft, setOffsetLeft] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const flattened = useMemo(() => {
    const all = flattenTree(tree);
    return activeId ? removeDescendants(all, activeId) : all;
  }, [tree, activeId]);

  const sortedIds = useMemo(() => flattened.map((i) => i.id), [flattened]);

  const projected: Projection | null =
    activeId && overId
      ? getProjection(flattened, activeId, overId, offsetLeft, INDENTATION_WIDTH)
      : null;

  const projectedRef = useRef(projected);
  projectedRef.current = projected;

  const activeItem = activeId
    ? flattened.find((i) => i.id === activeId) ??
      flattenTree(tree).find((i) => i.id === activeId)
    : null;

  const commit = (next: MarkdownTreeNode[]) => {
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };

  const handleAddRoot = () => {
    const newNode: MarkdownTreeNode = {
      id: generateId(),
      content: '# New node',
    };
    commit([...tree, newNode]);
  };

  const handleAddChild = (parentId: string) => {
    const newNode: MarkdownTreeNode = {
      id: generateId(),
      content: 'New child',
    };
    commit(addChildDeep(tree, parentId, newNode));
  };

  const handleDelete = (id: string) => {
    commit(removeItemDeep(tree, id));
  };

  const handleUpdate = (id: string, content: string) => {
    commit(updateItemDeep(tree, id, content));
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
    setOverId(String(active.id));
  };

  const handleDragMove = ({ delta }: DragMoveEvent) => {
    setOffsetLeft(delta.x);
  };

  const handleDragOver = ({ over }: DragOverEvent) => {
    setOverId(over ? String(over.id) : null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    resetDrag();
    if (!over || !projectedRef.current) return;

    const allFlat = flattenTree(tree);
    const visibleFlat = removeDescendants(allFlat, String(active.id));
    const activeIndex = visibleFlat.findIndex((i) => i.id === active.id);
    const overIndex = visibleFlat.findIndex((i) => i.id === over.id);
    if (activeIndex < 0 || overIndex < 0) return;

    const moved = arrayMove(visibleFlat, activeIndex, overIndex);
    const { depth, parentId } = projectedRef.current;
    moved[overIndex] = {
      ...moved[overIndex]!,
      depth,
      parentId,
    };

    // Re-attach descendants of the dragged node right after it,
    // rebasing their depth relative to the new parent depth.
    const descendants = allFlat.filter((i) => {
      let cur = i.parentId;
      while (cur) {
        if (cur === String(active.id)) return true;
        const parent = allFlat.find((p) => p.id === cur);
        cur = parent?.parentId ?? null;
      }
      return false;
    });
    const originalDepth = allFlat.find((i) => i.id === active.id)!.depth;
    const depthDelta = depth - originalDepth;
    const rebasedDescendants = descendants.map((d) => ({
      ...d,
      depth: d.depth + depthDelta,
    }));

    const withDescendants = [
      ...moved.slice(0, overIndex + 1),
      ...rebasedDescendants,
      ...moved.slice(overIndex + 1),
    ];

    commit(buildTree(withDescendants));
  };

  const handleDragCancel = () => {
    resetDrag();
  };

  const resetDrag = () => {
    setActiveId(null);
    setOverId(null);
    setOffsetLeft(0);
  };

  return (
    <div className={['rcl-md-tree', className].filter(Boolean).join(' ')}>
      <div className="rcl-md-tree__toolbar">
        <button type="button" onClick={handleAddRoot}>
          + Add root node
        </button>
      </div>

      {flattened.length === 0 ? (
        <p className="rcl-md-tree__empty">
          No nodes yet. Click <strong>+ Add root node</strong> to start.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={sortedIds}
            strategy={verticalListSortingStrategy}
          >
            <ul className="rcl-md-tree__list">
              {flattened.map((item) => {
                const projectedDepth =
                  activeId === item.id && projected ? projected.depth : item.depth;
                return (
                  <SortableTreeItem
                    key={item.id}
                    id={item.id}
                    content={item.content}
                    depth={projectedDepth}
                    indentationWidth={INDENTATION_WIDTH}
                    renderMarkdown={renderMarkdown}
                    editable={editable}
                    isGhost={activeId === item.id}
                    isLeaf={item.children.length === 0}
                    onAddChild={handleAddChild}
                    onDelete={handleDelete}
                    onUpdate={handleUpdate}
                  />
                );
              })}
            </ul>
          </SortableContext>

          <DragOverlay>
            {activeItem ? (
              <ul className="rcl-md-tree__list rcl-md-tree__list--overlay">
                <SortableTreeItem
                  id={activeItem.id}
                  content={activeItem.content}
                  depth={0}
                  indentationWidth={INDENTATION_WIDTH}
                  renderMarkdown={renderMarkdown}
                  editable={editable}
                  isOverlay
                  onAddChild={() => {}}
                  onDelete={() => {}}
                  onUpdate={() => {}}
                />
              </ul>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
};
