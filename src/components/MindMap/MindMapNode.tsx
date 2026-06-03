import {
  memo,
  useEffect,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import ReactMarkdown from 'react-markdown';

export interface MindMapNodeData {
  content: string;
  renderMarkdown: boolean;
  editable: boolean;
  hasParent: boolean;
  hasChildren: boolean;
  isDropTarget: boolean;
  /** Delay (ms) before this node's enter animation starts — staggers by level. */
  appearDelay?: number;
  onAddChild: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: string) => void;
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
    onUpdate,
  } = data as MindMapNodeData;

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
      style={
        appearDelay ? { animationDelay: `${appearDelay}ms` } : undefined
      }
      onDoubleClick={handleDoubleClick}
    >
      {hasParent && (
        <Handle
          type="target"
          position={Position.Left}
          className="rcl-mind-map__handle"
        />
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

      {hasChildren && (
        <Handle
          type="source"
          position={Position.Right}
          className="rcl-mind-map__handle"
        />
      )}
      {!hasChildren && (
        <Handle
          type="source"
          position={Position.Right}
          className="rcl-mind-map__handle rcl-mind-map__handle--hidden"
        />
      )}
    </div>
  );
};

export const MindMapNode = memo(MindMapNodeImpl);
