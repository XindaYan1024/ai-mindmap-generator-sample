import { useCallback, useState } from 'react';
import { MindMap } from '../MindMap';
import { MarkdownTree } from '../MarkdownTree';
import { ChatDialog } from '../ChatDialog';
import type { MarkdownTreeNode } from '../MarkdownTree/types';
import type { ChatReply } from '../ChatDialog/types';
import type { ChatWorkspaceProps } from './types';
import questionReply from '../../question.json';
import './ChatWorkspace.css';

// Static reply loaded in place of a backend call. Its structure matches the
// `ChatReply` the backend used to return: text plus a MindMap attachment.
const localReply = questionReply as ChatReply;

const DEFAULT_LABELS = {
  mindMap: 'MindMap',
  markdownTree: 'MarkdownTree',
  chat: 'ChatDialog',
};

/**
 * Bundles MindMap, MarkdownTree and ChatDialog into a single drop-in
 * component. All three share one tree (controlled or uncontrolled), so an edit
 * in any view — including a MindMap embedded in a chat reply — updates the
 * others immediately.
 */
export const ChatWorkspace = ({
  value,
  defaultValue,
  onChange,
  onChatSubmit,
  mindMapJson,
  showMindMap = true,
  showMarkdownTree = true,
  showChat = true,
  labels,
  mindMapHeight = 520,
  chatHeight = 560,
  chatAttachmentHeight = 360,
  className,
}: ChatWorkspaceProps) => {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<MarkdownTreeNode[]>(
    defaultValue ?? [],
  );
  const tree = isControlled ? (value as MarkdownTreeNode[]) : internal;

  const setTree = useCallback(
    (next: MarkdownTreeNode[]) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  // Build a chat responder: an explicit handler wins, otherwise every send
  // resolves to the JSON passed via `mindMapJson`, falling back to the locally
  // bundled `question.json` — no backend call either way.
  const localSubmit = useCallback(
    async (_input: string): Promise<ChatReply> => mindMapJson ?? localReply,
    [mindMapJson],
  );

  const chatSubmit = onChatSubmit ?? localSubmit;

  const resolvedLabels = labels === false ? null : { ...DEFAULT_LABELS, ...labels };

  return (
    <div
      className={['rcl-chat-workspace', className].filter(Boolean).join(' ')}
    >
      {showMindMap && (
        <section className="rcl-chat-workspace__section">
          {resolvedLabels && <h2>{resolvedLabels.mindMap}</h2>}
          <MindMap value={tree} onChange={setTree} height={mindMapHeight} />
        </section>
      )}

      {showMarkdownTree && (
        <section className="rcl-chat-workspace__section">
          {resolvedLabels && <h2>{resolvedLabels.markdownTree}</h2>}
          <MarkdownTree value={tree} onChange={setTree} />
        </section>
      )}

      {showChat && (
        <section className="rcl-chat-workspace__section">
          {/* {resolvedLabels && <h2>{resolvedLabels.chat}</h2>} */}
          <ChatDialog
            height={chatHeight}
            attachmentHeight={chatAttachmentHeight}
            mindMapValue={tree}
            onMindMapChange={setTree}
            defaultMindMapTree={tree}
            onSubmit={chatSubmit}
          />
        </section>
      )}
    </div>
  );
};
