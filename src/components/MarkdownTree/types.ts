export interface MarkdownTreeNode {
  id: string;
  /** Markdown content for the node. */
  content: string;
  children?: MarkdownTreeNode[];
  /** Content items associated with this node (selected via content picker). */
  contents?: any[];
}

/** Editing surfaces the component can present. */
export type MarkdownTreeMode = 'tree' | 'markdown';

export interface MarkdownTreeProps {
  /** Controlled tree value. When provided, the component is controlled. */
  value?: MarkdownTreeNode[];
  /** Initial tree when uncontrolled. */
  defaultValue?: MarkdownTreeNode[];
  /** Called whenever the tree changes (add / delete / edit). */
  onChange?: (next: MarkdownTreeNode[]) => void;
  /** Render markdown using react-markdown. Defaults to true. */
  renderMarkdown?: boolean;
  /** Allow editing node content inline. Defaults to true. */
  editable?: boolean;
  /** Extra class name for the wrapper. */
  className?: string;
  /**
   * Expose the "Markdown Input Mode" toggle so users can author the tree as
   * raw Markdown text. Defaults to true.
   */
  enableMarkdownMode?: boolean;
  /** Which surface to show first. Defaults to 'tree'. */
  defaultMode?: MarkdownTreeMode;
  /** Notified whenever the user switches between tree and markdown modes. */
  onModeChange?: (mode: MarkdownTreeMode) => void;
}
