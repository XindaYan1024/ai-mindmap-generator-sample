import { useCallback, useEffect, useMemo, useState } from "react";
import { MindMap } from "../MindMap";
import { MarkdownTree } from "../MarkdownTree";
import { ChatDialog } from "../ChatDialog";
import type { MarkdownTreeNode } from "../MarkdownTree/types";
import type { ChatMessage, ChatReply } from "../ChatDialog/types";
import type { ChatWorkspaceProps } from "./types";
import questionReply from "../../question.json";
import "./ChatWorkspace.css";
import { convertToMindMap, convertFromMindMap } from "./json2MindMap";

const localReply = questionReply as ChatReply;

const DEFAULT_LABELS = {
  mindMap: "MindMap",
  markdownTree: "MarkdownTree",
  chat: "ChatDialog",
};

export const ChatWorkspace = ({
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
  jsonValue,
  jsonOnChange,
}: ChatWorkspaceProps) => {
  const [internal, setInternal] = useState<MarkdownTreeNode[]>(
    defaultValue ?? [],
  );

  // Convert jsonValue to the mindmap format. Memoized so the effect below only
  // fires when jsonValue actually changes, not on every render.
  const formattedJson = useMemo(
    () =>
      jsonValue
        ? convertToMindMap(
            jsonValue,
            "Summary",
            "A summary of your questions",
            "Here is the mind map.",
          )
        : null,
    [jsonValue],
  );

  // Sync jsonValue → internal tree whenever the caller applies new JSON.
  useEffect(() => {
    if (formattedJson) {
      setInternal(formattedJson.attachment.tree as MarkdownTreeNode[]);
    }
  }, [formattedJson]);

  // Single source of truth: always the internal state. Both JSON application
  // (via the effect above) and backend replies (via the wrapped submit below)
  // flow through setInternal so all three panels stay in sync.
  const tree = internal;

  const setTree = useCallback(
    (next: MarkdownTreeNode[]) => {
      setInternal(next);
      onChange?.(next);
      const test = convertFromMindMap({ content: "", attachment: { type: "mindmap", tree: next } });
      console.log('yanx123-1');
      console.log(test);
      jsonOnChange?.(test);
    },
    [onChange],
  );

  const localSubmit = useCallback(
    async (_input: string): Promise<ChatReply> => mindMapJson ?? localReply,
    [mindMapJson],
  );

  const baseChatSubmit = onChatSubmit ?? localSubmit;

  // Intercept every reply: if it carries a mindmap tree, push it into the
  // shared tree so the MindMap and MarkdownTree panels update immediately.
  const chatSubmit = useCallback(
    async (input: string): Promise<string | ChatReply> => {
      const raw = await baseChatSubmit(input);
      const reply: ChatReply = typeof raw === "string" ? { content: raw } : raw;
      if (
        reply.attachment?.type === "mindmap" &&
        Array.isArray(reply.attachment.tree)
      ) {
        setTree(reply.attachment.tree as MarkdownTreeNode[]);
      }
      return raw;
    },
    [baseChatSubmit, setTree],
  );

  // Seed ChatDialog with the initial mindmap when jsonValue is provided.
  const chatDefaultMessages = useMemo<ChatMessage[] | undefined>(() => {
    if (!formattedJson) return undefined;
    return [
      {
        id: "init-mindmap",
        role: "assistant",
        content: formattedJson.content,
        attachment: formattedJson.attachment as {
          type: "mindmap";
          tree: MarkdownTreeNode[];
        },
        createdAt: 0,
      },
    ];
  }, [formattedJson]);

  const resolvedLabels =
    labels === false ? null : { ...DEFAULT_LABELS, ...labels };

  return (
    <div
      className={["rcl-chat-workspace", className].filter(Boolean).join(" ")}
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
          <ChatDialog
            height={chatHeight}
            attachmentHeight={chatAttachmentHeight}
            mindMapValue={tree}
            onMindMapChange={setTree}
            defaultMindMapTree={tree}
            onSubmit={chatSubmit}
            defaultValue={chatDefaultMessages}
          />
        </section>
      )}
    </div>
  );
};
