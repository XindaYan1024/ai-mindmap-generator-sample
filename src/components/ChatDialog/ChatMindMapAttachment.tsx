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

const ExpandIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none">
    <path
      d="M2 5V2h3M9 2h3v3M12 9v3H9M5 12H2V9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CollapseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none">
    <path
      d="M5 2v3H2M9 5h3V2M9 12V9h3M5 9H2v3"
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
