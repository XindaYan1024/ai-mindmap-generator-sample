export { MindMap, ContentBadge } from './components/MindMap';
export type { MindMapProps, ContentBadgeProps } from './components/MindMap';

export {
  MarkdownTree,
  MarkdownEditor,
  treeToMarkdown,
  markdownToTree,
} from './components/MarkdownTree';
export type {
  MarkdownTreeProps,
  MarkdownTreeMode,
  MarkdownEditorProps,
  MarkdownTreeNode as MarkdownTreeNodeData,
} from './components/MarkdownTree';

export { ChatDialog, ChatInputPanel } from './components/ChatDialog';
export type {
  ChatAttachment,
  ChatDialogProps,
  ChatInputPanelProps,
  ChatInputPanelPlacement,
  ChatMessage,
  ChatReply,
  ChatRole,
} from './components/ChatDialog';

export { ChatWorkspace } from './components/ChatWorkspace';
export type { ChatWorkspaceProps } from './components/ChatWorkspace';

export { convertToMindMap, convertFromMindMap } from './components/ChatWorkspace/json2MindMap';
export type { MindMapInput, MindMapOutput } from './components/ChatWorkspace/json2MindMap';
