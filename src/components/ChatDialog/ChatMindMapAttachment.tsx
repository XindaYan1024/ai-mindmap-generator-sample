import { useEffect, useState } from 'react';
import { MindMap } from '../MindMap';
import type { MarkdownTreeNode } from '../MarkdownTree/types';

interface ChatMindMapAttachmentProps {
  /** Initial tree captured on the message. Used as the seed when uncontrolled. */
  tree: MarkdownTreeNode[];
  /** Height used in the inline (non-fullscreen) state. */
  height: number | string;
  /**
   * Controlled tree. When provided, the embedded MindMap is fully controlled
   * by the parent and every edit fires `onChange`, allowing chat → markdown
   * tree (and any other consumer) to stay in sync.
   */
  value?: MarkdownTreeNode[];
  onChange?: (next: MarkdownTreeNode[]) => void;
}

// Maximize-window style: a framed rectangle with an arrow launching out of the top-right corner.
const ExpandIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none">
    <rect x="1.5" y="4" width="8.5" height="7.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M8.5 1.5H12.5V5.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line x1="8" y1="6" x2="12.5" y2="1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Restore-window style: two overlapping rectangles (browser restore metaphor).
const CollapseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none">
    <rect x="1.5" y="4.5" width="7.5" height="7.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M5 4.5V2.5a1 1 0 0 1 1-1h5.5a1 1 0 0 1 1 1V8a1 1 0 0 1-1 1H10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ChatMindMapAttachment = ({
  tree,
  height,
  value,
  onChange,
}: ChatMindMapAttachmentProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isControlled = value !== undefined;

  // Escape exits fullscreen — intuitive for users coming from other apps.
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullscreen]);

  return (
    <div
      className={[
        'rcl-chat-dialog__attachment',
        'rcl-chat-dialog__attachment--mindmap',
        isFullscreen ? 'rcl-chat-dialog__attachment--fullscreen' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="rcl-chat-dialog__attachment-controls">
        {isFullscreen ? (
          <button
            type="button"
            className="rcl-chat-dialog__attachment-btn"
            onClick={() => setIsFullscreen(false)}
            aria-label="Restore"
            title="Restore"
          >
            <CollapseIcon />
          </button>
        ) : (
          <button
            type="button"
            className="rcl-chat-dialog__attachment-btn"
            onClick={() => setIsFullscreen(true)}
            aria-label="Fullscreen"
            title="Fullscreen"
          >
            <ExpandIcon />
          </button>
        )}
      </div>

      <MindMap
        value={isControlled ? value : undefined}
        defaultValue={isControlled ? undefined : tree}
        onChange={onChange}
        height={isFullscreen ? '100%' : height}
      />
    </div>
  );
};
