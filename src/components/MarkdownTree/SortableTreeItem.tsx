import { useState, type CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ReactMarkdown from 'react-markdown';

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

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="none">
    <path
      d="M3 3l6 6M9 3l-6 6"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

export interface SortableTreeItemProps {
  id: string;
  content: string;
  depth: number;
  indentationWidth: number;
  renderMarkdown: boolean;
  editable: boolean;
  isOverlay?: boolean;
  isGhost?: boolean;
  isLeaf?: boolean;
  onAddChild: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: string) => void;
}

export const SortableTreeItem = ({
  id,
  content,
  depth,
  indentationWidth,
  renderMarkdown,
  editable,
  isOverlay = false,
  isGhost = false,
  isLeaf = false,
  onAddChild,
  onDelete,
  onUpdate,
}: SortableTreeItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(content);

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    paddingLeft: `${depth * indentationWidth}px`,
    opacity: isGhost ? 0.4 : 1,
  };

  const startEdit = () => {
    setDraft(content);
    setIsEditing(true);
  };
  const commit = () => {
    onUpdate(id, draft);
    setIsEditing(false);
  };
  const cancel = () => {
    setDraft(content);
    setIsEditing(false);
  };

  return (
    <li
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      className={[
        'rcl-md-tree__item',
        isDragging && !isOverlay ? 'rcl-md-tree__item--dragging' : '',
        isOverlay ? 'rcl-md-tree__item--overlay' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="rcl-md-tree__row">
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="rcl-md-tree__handle"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>

        <div className="rcl-md-tree__content">
          {isEditing ? (
            <textarea
              className="rcl-md-tree__editor"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={Math.max(2, draft.split('\n').length)}
              autoFocus
            />
          ) : renderMarkdown ? (
            <div className="rcl-md-tree__markdown">
              <ReactMarkdown>{content || '*(empty)*'}</ReactMarkdown>
            </div>
          ) : (
            <pre className="rcl-md-tree__raw">{content}</pre>
          )}
        </div>

        {!isOverlay && !isLeaf && (
          <div className="rcl-md-tree__actions">
            {isEditing ? (
              <>
                <button type="button" onClick={commit}>Save</button>
                <button type="button" onClick={cancel}>Cancel</button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="rcl-md-tree__icon-btn rcl-md-tree__icon-btn--add"
                  onClick={() => onAddChild(id)}
                  aria-label="Add child"
                  title="Add child"
                >
                  <PlusIcon />
                </button>
                {editable && (
                  <button
                    type="button"
                    className="rcl-md-tree__icon-btn rcl-md-tree__icon-btn--edit"
                    onClick={startEdit}
                    aria-label="Edit"
                    title="Edit"
                  >
                    <PencilIcon />
                  </button>
                )}
                <button
                  type="button"
                  className="rcl-md-tree__icon-btn rcl-md-tree__icon-btn--delete"
                  onClick={() => onDelete(id)}
                  aria-label="Delete"
                  title="Delete"
                >
                  <CloseIcon />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
};
