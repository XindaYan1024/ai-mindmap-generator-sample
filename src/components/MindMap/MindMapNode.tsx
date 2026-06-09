import {
  memo,
  useEffect,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import ReactMarkdown from 'react-markdown';
import { NODE_WIDTH, LEAF_NODE_WIDTH } from './layout';
import { ContentBadge } from './ContentBadge';

export interface MindMapNodeData {
  content: string;
  renderMarkdown: boolean;
  editable: boolean;
  hasParent: boolean;
  hasChildren: boolean;
  isDropTarget: boolean;
  /** Delay (ms) before this node's enter animation starts — staggers by level. */
  appearDelay?: number;
  /** Layout side: 'left' mirrors handles; 'root' adds dual source handles. */
  side?: 'left' | 'right' | 'root';
  /** Branch color hex (e.g. '#E05A5A'). Drives background + text color. */
  color?: string;
  onAddChild: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: string) => void;
  onAddContent?: (nodeId: string) => void;
  onRemoveContent?: (nodeId: string, item: any) => void;
  contents?: any[];
  [key: string]: unknown;
}

const MindMapNodeImpl = ({ id, data, selected }: NodeProps) => {
  const {
    content,
    renderMarkdown,
    editable,
    hasParent,
    hasChildren,
    isDropTarget,
    appearDelay,
    side,
    color,
    onUpdate,
    onAddContent,
    onRemoveContent,
    contents,
  } = data as MindMapNodeData;

  const isLeft = side === 'left';
  const isRoot = side === 'root';

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(content);

  useEffect(() => {
    if (!isEditing) setDraft(content);
  }, [content, isEditing]);

  const commit = () => {
    onUpdate(id, draft);
    setIsEditing(false);
  };
  const cancel = () => {
    setDraft(content);
    setIsEditing(false);
  };

  // Enter edit mode on double-click. stopPropagation keeps ReactFlow's
  // zoom-on-double-click from firing for the node itself.
  const handleDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!editable || isEditing) return;
    event.stopPropagation();
    setIsEditing(true);
  };

  // Escape discards edits; clicking outside the field (blur) saves them.
  const handleEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
    }
  };

  return (
    <div
      className={[
        'rcl-mind-map__node',
        'rcl-mind-map__node--enter',
        selected ? 'rcl-mind-map__node--selected' : '',
        isDropTarget ? 'rcl-mind-map__node--drop-target' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        // Leaf nodes are twice as wide; height is left to content as before.
        width: hasChildren ? NODE_WIDTH : LEAF_NODE_WIDTH,
        ...(appearDelay ? { animationDelay: `${appearDelay}ms` } : {}),
        // Branch color: overrides CSS defaults for background and text.
        ...(color ? { backgroundColor: color, color: '#ffffff' } : {}),
      }}
      onDoubleClick={handleDoubleClick}
    >
      {hasParent && (
        <Handle
          type="target"
          position={isLeft ? Position.Right : Position.Left}
          className="rcl-mind-map__handle"
        />
      )}

      {onAddContent && (
        <div className="rcl-mind-map__actions nodrag">
          <ContentBadge
            contents={contents ?? []}
            onAdd={() => onAddContent(id)}
            onRemove={(item) => onRemoveContent?.(id, item)}
          />
        </div>
      )}

      <div className="rcl-mind-map__node-content">
        {isEditing ? (
          <textarea
            className="rcl-mind-map__editor nodrag"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.max(2, draft.split('\n').length)}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleEditorKeyDown}
            onBlur={commit}
          />
        ) : renderMarkdown ? (
          <div className="rcl-mind-map__markdown">
            <ReactMarkdown>{content || '*(empty)*'}</ReactMarkdown>
          </div>
        ) : (
          <pre className="rcl-mind-map__raw">{content}</pre>
        )}
      </div>

      {/* Root in balanced layout: one source handle per side with explicit IDs. */}
      {isRoot && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="source-right"
            className="rcl-mind-map__handle"
          />
          <Handle
            type="source"
            position={Position.Left}
            id="source-left"
            className="rcl-mind-map__handle"
          />
        </>
      )}
      {!isRoot && hasChildren && (
        <Handle
          type="source"
          position={isLeft ? Position.Left : Position.Right}
          className="rcl-mind-map__handle"
        />
      )}
      {!isRoot && !hasChildren && (
        <Handle
          type="source"
          position={isLeft ? Position.Left : Position.Right}
          className="rcl-mind-map__handle rcl-mind-map__handle--hidden"
        />
      )}
    </div>
  );
};

export const MindMapNode = memo(MindMapNodeImpl);
