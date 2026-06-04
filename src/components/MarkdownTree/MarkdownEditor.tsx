import './MarkdownEditor.css';

export interface MarkdownEditorProps {
  /** Current Markdown text. */
  value: string;
  /** Called on every edit with the full updated text. */
  onChange: (next: string) => void;
  /** Placeholder shown when empty. */
  placeholder?: string;
  /** Disable editing (read-only view of the Markdown). */
  readOnly?: boolean;
  /** Extra class name for the wrapper. */
  className?: string;
}

const DEFAULT_PLACEHOLDER = [
  'Write your outline as a nested bullet list:',
  '',
  '- # Topic',
  '  - ## Subtopic',
  '    - A detail',
].join('\n');

/**
 * A minimal, self-contained Markdown text editor (plain textarea).
 *
 * It knows nothing about the tree — it only emits raw text. The parent owns the
 * Markdown <-> tree conversion, which keeps this component reusable and avoids
 * coupling it to the tree's drag/edit logic.
 */
export const MarkdownEditor = ({
  value,
  onChange,
  placeholder = DEFAULT_PLACEHOLDER,
  readOnly = false,
  className,
}: MarkdownEditorProps) => (
  <div
    className={['rcl-md-editor', className].filter(Boolean).join(' ')}
  >
    <textarea
      className="rcl-md-editor__textarea"
      value={value}
      placeholder={placeholder}
      readOnly={readOnly}
      spellCheck={false}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Markdown editor"
    />
  </div>
);
