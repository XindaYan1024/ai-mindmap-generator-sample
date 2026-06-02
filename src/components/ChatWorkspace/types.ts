import type { MarkdownTreeNode } from '../MarkdownTree/types';
import type { ChatDialogProps } from '../ChatDialog/types';

export interface ChatWorkspaceProps {
  /**
   * Controlled tree shared by the MindMap, MarkdownTree and the chat's
   * embedded MindMap attachments. When provided, the workspace is controlled.
   */
  value?: MarkdownTreeNode[];
  /** Initial tree when uncontrolled. */
  defaultValue?: MarkdownTreeNode[];
  /** Called whenever any of the three views mutates the shared tree. */
  onChange?: (next: MarkdownTreeNode[]) => void;

  /**
   * Custom chat responder, forwarded to ChatDialog. Returns a plain string or
   * a `ChatReply`. When omitted, every send resolves to the locally bundled
   * `question.json` (no backend call) — its MindMap attachment is rendered in
   * the reply.
   */
  onChatSubmit?: ChatDialogProps['onSubmit'];
  /**
   * MindMap reply JSON (shaped like the backend `ChatReply`, e.g. an external
   * repo's `question.json`). When provided and `onChatSubmit` is not given,
   * every send resolves to this JSON instead of the bundled default. Lets
   * consuming repos supply their own MindMap data via props.
   */
  mindMapJson?: ChatDialogProps['mindMapJson'];

  /** Toggle each panel. All default to true. */
  showMindMap?: boolean;
  showMarkdownTree?: boolean;
  showChat?: boolean;

  /** Section headings. Set to false to hide all headings. */
  labels?:
    | false
    | {
        mindMap?: string;
        markdownTree?: string;
        chat?: string;
      };

  /** Height of the MindMap canvas. Defaults to 520. */
  mindMapHeight?: number | string;
  /** Height of the ChatDialog. Defaults to 560. */
  chatHeight?: number | string;
  /** Height of MindMap attachments rendered inside chat replies. Defaults to 360. */
  chatAttachmentHeight?: number | string;

  /** Extra class name for the wrapper. */
  className?: string;
}
