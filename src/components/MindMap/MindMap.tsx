import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  useReactFlow,
  type Node,
  type Edge,
  type NodeChange,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { MarkdownTreeNode } from '../MarkdownTree/types';
import type { MindMapProps, LayoutPosition } from './types';
import { MindMapNode } from './MindMapNode';
import {
  layoutTree,
  collectEdges,
  flattenForMindMap,
  NODE_WIDTH,
  NODE_HEIGHT,
} from './layout';
import {
  addChildDeep,
  removeItemDeep,
  updateItemDeep,
  moveNode,
  findNode,
  collectDescendantIds,
} from './tree';
import './MindMap.css';

const generateId = () =>
  `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const nodeTypes: NodeTypes = {
  mindmap: MindMapNode,
};

const MindMapInner = ({
  value,
  defaultValue,
  onChange,
  renderMarkdown = true,
  editable = true,
  height = 480,
  className,
}: MindMapProps) => {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<MarkdownTreeNode[]>(defaultValue ?? []);
  const tree = isControlled ? (value as MarkdownTreeNode[]) : internal;

  const [overrides, setOverrides] = useState<Map<string, LayoutPosition>>(
    new Map(),
  );
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const dropTargetIdRef = useRef<string | null>(null);

  const { getNodes } = useReactFlow();

  const commit = useCallback(
    (next: MarkdownTreeNode[]) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  const handleAddChild = useCallback(
    (parentId: string) => {
      const newNode: MarkdownTreeNode = { id: generateId(), content: 'New child' };
      commit(addChildDeep(tree, parentId, newNode));
    },
    [tree, commit],
  );

  const handleDelete = useCallback(
    (id: string) => {
      commit(removeItemDeep(tree, id));
      setOverrides((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    },
    [tree, commit],
  );

  const handleUpdate = useCallback(
    (id: string, content: string) => {
      commit(updateItemDeep(tree, id, content));
    },
    [tree, commit],
  );

  const handleAddRoot = () => {
    const newNode: MarkdownTreeNode = { id: generateId(), content: '# New node' };
    commit([...tree, newNode]);
  };

  const handleResetLayout = () => setOverrides(new Map());

  // Stable handler refs so node `data` objects don't capture stale closures
  const handlersRef = useRef({ handleAddChild, handleDelete, handleUpdate });
  handlersRef.current = { handleAddChild, handleDelete, handleUpdate };

  const flatItems = useMemo(() => flattenForMindMap(tree), [tree]);
  const autoPositions = useMemo(() => layoutTree(tree), [tree]);

  const childCountByParent = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of flatItems) {
      if (item.parentId) {
        map.set(item.parentId, (map.get(item.parentId) ?? 0) + 1);
      }
    }
    return map;
  }, [flatItems]);

  const nodes: Node[] = useMemo(
    () =>
      flatItems.map((item) => {
        const pos =
          overrides.get(item.id) ?? autoPositions.get(item.id) ?? { x: 0, y: 0 };
        return {
          id: item.id,
          type: 'mindmap',
          position: pos,
          width: NODE_WIDTH,
          data: {
            content: item.content,
            renderMarkdown,
            editable,
            hasParent: item.parentId !== null,
            hasChildren: (childCountByParent.get(item.id) ?? 0) > 0,
            isDropTarget: dropTargetId === item.id,
            onAddChild: (id: string) => handlersRef.current.handleAddChild(id),
            onDelete: (id: string) => handlersRef.current.handleDelete(id),
            onUpdate: (id: string, c: string) =>
              handlersRef.current.handleUpdate(id, c),
          },
        };
      }),
    [
      flatItems,
      overrides,
      autoPositions,
      childCountByParent,
      renderMarkdown,
      editable,
      dropTargetId,
    ],
  );

  const edges: Edge[] = useMemo(
    () =>
      collectEdges(tree).map(({ source, target }) => ({
        id: `${source}->${target}`,
        source,
        target,
        type: 'smoothstep',
      })),
    [tree],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const positionChanges = changes.filter(
        (c): c is Extract<NodeChange, { type: 'position' }> => c.type === 'position',
      );
      if (positionChanges.length === 0) return;

      const updated = applyNodeChanges(positionChanges, nodes);
      setOverrides((prev) => {
        const next = new Map(prev);
        for (const change of positionChanges) {
          if (change.position) {
            const node = updated.find((n) => n.id === change.id);
            if (node) next.set(node.id, { x: node.position.x, y: node.position.y });
          }
        }
        return next;
      });
    },
    [nodes],
  );

  const handleNodeDrag = useCallback(
    (_event: React.MouseEvent, draggedNode: Node) => {
      const dragged = findNode(tree, draggedNode.id);
      if (!dragged) {
        if (dropTargetIdRef.current !== null) {
          dropTargetIdRef.current = null;
          setDropTargetId(null);
        }
        return;
      }

      // Any node at any depth in the dragged subtree is forbidden as a target
      // (self + descendants). Anything else — root or nested — is allowed.
      const forbidden = collectDescendantIds(dragged);
      forbidden.add(draggedNode.id);

      // Hit-test by the dragged node's centroid. This is depth-agnostic and
      // unambiguous: whichever rendered node contains the dragged node's
      // center is the drop target. If multiple nodes contain the center
      // (shouldn't happen with our layout, but defensive), pick the smallest
      // — the most specific target.
      const dragW =
        draggedNode.measured?.width ?? draggedNode.width ?? NODE_WIDTH;
      const dragH =
        draggedNode.measured?.height ?? draggedNode.height ?? NODE_HEIGHT;
      const cx = draggedNode.position.x + dragW / 2;
      const cy = draggedNode.position.y + dragH / 2;

      let bestId: string | null = null;
      let bestArea = Infinity;

      for (const n of getNodes()) {
        if (forbidden.has(n.id)) continue;
        const w = n.measured?.width ?? n.width ?? NODE_WIDTH;
        const h = n.measured?.height ?? n.height ?? NODE_HEIGHT;
        const x1 = n.position.x;
        const y1 = n.position.y;
        const x2 = x1 + w;
        const y2 = y1 + h;
        if (cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2) {
          const area = w * h;
          if (area < bestArea) {
            bestArea = area;
            bestId = n.id;
          }
        }
      }

      if (dropTargetIdRef.current !== bestId) {
        dropTargetIdRef.current = bestId;
        setDropTargetId(bestId);
      }
    },
    [getNodes, tree],
  );

  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, draggedNode: Node) => {
      const target = dropTargetIdRef.current;
      dropTargetIdRef.current = null;
      setDropTargetId(null);

      if (!target) return;

      const next = moveNode(tree, draggedNode.id, target);
      if (next === tree) return;

      commit(next);
      // Clear any mid-drag position override so the moved subtree snaps under
      // its new parent via auto-layout.
      setOverrides((prev) => {
        const dragged = findNode(tree, draggedNode.id);
        const idsToClear = new Set<string>([draggedNode.id]);
        if (dragged) {
          for (const id of collectDescendantIds(dragged)) idsToClear.add(id);
        }
        let mutated = false;
        const map = new Map(prev);
        for (const id of idsToClear) {
          if (map.delete(id)) mutated = true;
        }
        return mutated ? map : prev;
      });
    },
    [tree, commit],
  );

  return (
    <div
      className={['rcl-mind-map', className].filter(Boolean).join(' ')}
      style={{ height }}
    >
      <div className="rcl-mind-map__toolbar">
        <button type="button" onClick={handleAddRoot}>
          + Add root node
        </button>
        <button type="button" onClick={handleResetLayout}>
          Reset layout
        </button>
        <span className="rcl-mind-map__hint">
          Tip: drop a node on another node to re-parent it.
        </span>
      </div>

      <div className="rcl-mind-map__canvas">
        {nodes.length === 0 ? (
          <p className="rcl-mind-map__empty">
            No nodes yet. Click <strong>+ Add root node</strong> to start, or
            add nodes from the markdown tree.
          </p>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onNodeDrag={handleNodeDrag}
            onNodeDragStop={handleNodeDragStop}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={2}
            nodesConnectable={false}
            elementsSelectable
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} size={1} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable />
          </ReactFlow>
        )}
      </div>
    </div>
  );
};

export const MindMap = (props: MindMapProps) => (
  <ReactFlowProvider>
    <MindMapInner {...props} />
  </ReactFlowProvider>
);
