import { memo, useEffect, useState } from 'react';
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

const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="none">
    <path
      d="M6 2v8M2 6h8"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const PencilIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" fill="none">
    <path
      d="M11.5 1.9a1.6 1.6 0 0 1 2.26 2.26L5.0 12.93 2 13.9l.97-3.0L11.5 1.9z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
    <path
      d="M10.4 3.0l2.6 2.6"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

const MindMapNodeImpl = ({ id, data, selected }: NodeProps) => {
  const {
    content,
    renderMarkdown,
    editable,
    hasParent,
    hasChildren,
    isDropTarget,
    appearDelay,
    onAddChild,
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
    >
      {hasParent && (
        <Handle
          type="target"
          position={Position.Left}
          className="rcl-mind-map__handle"
        />
      )}

      {!isEditing && hasChildren && (
        <div className="rcl-mind-map__actions nodrag">
          <button
            type="button"
            className="rcl-mind-map__icon-btn rcl-mind-map__icon-btn--add"
            onClick={() => onAddChild(id)}
            aria-label="Add child"
            title="Add child"
          >
            <PlusIcon />
          </button>
          {editable && (
            <button
              type="button"
              className="rcl-mind-map__icon-btn rcl-mind-map__icon-btn--edit"
              onClick={() => setIsEditing(true)}
              aria-label="Edit"
              title="Edit"
            >
              <PencilIcon />
            </button>
          )}
        </div>
      )}

      <div className="rcl-mind-map__node-content">
        {isEditing ? (
          <textarea
            className="rcl-mind-map__editor"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.max(2, draft.split('\n').length)}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : renderMarkdown ? (
          <div className="rcl-mind-map__markdown">
            <ReactMarkdown>{content || '*(empty)*'}</ReactMarkdown>
          </div>
        ) : (
          <pre className="rcl-mind-map__raw">{content}</pre>
        )}
      </div>

      {isEditing && (
        <div className="rcl-mind-map__edit-actions nodrag">
          <button type="button" onClick={commit}>Save</button>
          <button type="button" onClick={cancel}>Cancel</button>
        </div>
      )}

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
