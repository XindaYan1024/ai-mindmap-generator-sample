export interface MarkdownTreeNode {
  id: string;
  /** Markdown content for the node. */
  content: string;
  children?: MarkdownTreeNode[];
}

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
}
