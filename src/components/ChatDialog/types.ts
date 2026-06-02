import type { MarkdownTreeNode } from '../MarkdownTree/types';

export type ChatRole = 'user' | 'assistant';

/**
 * Optional rich payload attached to a message. Rendered as an interactive
 * block below the text bubble.
 */
export type ChatAttachment = {
  type: 'mindmap';
  /** Tree used to seed the embedded MindMap (uncontrolled by default). */
  tree: MarkdownTreeNode[];
};

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt?: number;
  attachment?: ChatAttachment;
}

/** Shape returned by `onSubmit` when a richer reply is needed. */
export interface ChatReply {
  content: string;
  attachment?: ChatAttachment;
}

export interface ChatDialogProps {
  /** Controlled message list. When provided, the component is controlled. */
  value?: ChatMessage[];
  /** Initial messages when uncontrolled. */
  defaultValue?: ChatMessage[];
  /** Called whenever the message list changes (user submit + assistant reply). */
  onChange?: (next: ChatMessage[]) => void;
  /**
   * Custom responder. Returns either a plain string or a `ChatReply` with an
   * optional attachment. Defaults to the static recommended questions response.
   */
  onSubmit?: (
    input: string,
  ) => string | ChatReply | Promise<string | ChatReply>;
  /**
   * When set, the built-in static response will attach a MindMap seeded with
   * this tree below the text. Ignored if `onSubmit` is provided.
   */
  defaultMindMapTree?: MarkdownTreeNode[];
  /**
   * Static reply payload (the parsed `question.json`, shaped like the backend
   * `ChatReply`) used to build the MindMap response. When provided — and no
   * `onSubmit` is given — every send resolves to this JSON instead of the
   * built-in `defaultMindMapTree` response, letting external repos supply their
   * own MindMap data via props. Ignored if `onSubmit` is provided.
   */
  mindMapJson?: ChatReply;
  /**
   * Controlled tree shared by every embedded MindMap attachment. When provided
   * together with `onMindMapChange`, edits inside any chat MindMap flow back
   * out and the same tree can drive a sibling MarkdownTree / MindMap for a
   * single source of truth.
   */
  mindMapValue?: MarkdownTreeNode[];
  /** Called whenever any embedded MindMap mutates the shared tree. */
  onMindMapChange?: (next: MarkdownTreeNode[]) => void;
  /** Height passed to embedded MindMap attachments. Defaults to 360. */
  attachmentHeight?: number | string;
  /** Optional title rendered in the dialog header. */
  title?: string;
  /** Placeholder text for the input box. */
  placeholder?: string;
  /** Pixel (or CSS) height of the dialog. Defaults to 480. */
  height?: number | string;
  /** Extra class name for the wrapper. */
  className?: string;
}
