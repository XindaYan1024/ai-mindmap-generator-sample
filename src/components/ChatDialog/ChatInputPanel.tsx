import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MutableRefObject,
} from 'react';
import type { ChatMessage } from './types';
import './ChatInputPanel.css';

export type ChatInputPanelPlacement = 'center' | 'docked';

// Outward arrows → grow the panel to its full UI.
const MaximizeIcon = () => (
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

// A single "−" bar → collapse the panel to the input-only bar.
const MinimizeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none">
    <path
      d="M3 7h8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Presentation-only chat panel: floating input + plain-string history with a
 * Minimize/Maximize toggle. It owns NO chat logic — every piece of state and
 * every handler is supplied by `ChatDialog` and simply wired to the DOM here.
 * The only state it owns is its own UI mode (expanded vs. compact).
 */
export interface ChatInputPanelProps {
  /** Full message list. Only entries with text are shown; attachments ignored. */
  messages: ChatMessage[];
  /** True while a reply is in flight (drives the typing indicator + collapse). */
  isPending: boolean;
  /** Current input draft (owned by ChatDialog). */
  draft: string;
  /** Forward input edits back to ChatDialog. */
  onDraftChange: (value: string) => void;
  /** ChatDialog's keydown handler (Enter-to-send + history navigation). */
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  /** ChatDialog's submit handler. */
  onSubmit: () => void;
  /** Shared textarea ref so ChatDialog's caret/history effects keep working. */
  inputRef: MutableRefObject<HTMLTextAreaElement | null>;
  placeholder?: string;
  /** Centered on init; docked bottom-center once a mind map is on screen. */
  placement?: ChatInputPanelPlacement;
  /** Height of the history area when expanded (≈ 1/4 of the dialog). */
  historyHeight?: number | string;
}

export const ChatInputPanel = ({
  messages,
  isPending,
  draft,
  onDraftChange,
  onKeyDown,
  onSubmit,
  inputRef,
  placeholder = 'Type a message and press Enter…',
  placement = 'center',
  historyHeight = 120,
}: ChatInputPanelProps) => {
  // The ONLY state this component owns: whether the full UI (history) is shown.
  const [mode, setMode] = useState<'expanded' | 'compact'>('expanded');
  const listRef = useRef<HTMLDivElement | null>(null);

  // Collapse to compact the instant a send begins. This observes existing
  // state (isPending) only — it does not change how the message is sent.
  useEffect(() => {
    if (isPending) setMode('compact');
  }, [isPending]);

  // Keep the history pinned to the newest message while it's visible.
  useLayoutEffect(() => {
    if (mode !== 'expanded') return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isPending, mode]);

  // Plain-string history only — mind-map attachments are intentionally excluded
  // (ChatDialog renders the map fullscreen behind this panel).
  const textMessages = messages.filter((m) => m.content);

  // Expanded history height is exposed as a CSS var so the collapse can be a
  // pure-CSS `max-height` transition (0 ↔ this value) driven by the mode class.
  const expandedHistory =
    typeof historyHeight === 'number' ? `${historyHeight}px` : historyHeight;

  return (
    <div
      className={[
        'rcl-chat-input-panel',
        `rcl-chat-input-panel--${mode}`,
        `rcl-chat-input-panel--${placement}`,
      ].join(' ')}
      style={{ ['--rcl-history-h' as string]: expandedHistory } as CSSProperties}
      role="group"
      aria-label="Chat input"
    >
      <div className="rcl-chat-input-panel__toolbar">
        {mode === 'compact' ? (
          <button
            type="button"
            className="rcl-chat-input-panel__tool"
            onClick={() => setMode('expanded')}
            aria-label="Maximize"
            title="Maximize"
          >
            <MaximizeIcon />
          </button>
        ) : (
          <button
            type="button"
            className="rcl-chat-input-panel__tool"
            onClick={() => setMode('compact')}
            aria-label="Minimize"
            title="Minimize"
          >
            <MinimizeIcon />
          </button>
        )}
      </div>

      <div className="rcl-chat-input-panel__history-wrap">
        <div className="rcl-chat-input-panel__history" ref={listRef}>
          {textMessages.length === 0 && !isPending ? (
            <p className="rcl-chat-input-panel__empty">
              Ask the Mindmap assistant to generate template questions...
            </p>
          ) : (
            textMessages.map((message) => (
              <div
                key={message.id}
                className={[
                  'rcl-chat-input-panel__row',
                  `rcl-chat-input-panel__row--${message.role}`,
                ].join(' ')}
              >
                <div
                  className={[
                    'rcl-chat-input-panel__bubble',
                    `rcl-chat-input-panel__bubble--${message.role}`,
                  ].join(' ')}
                >
                  {message.content}
                </div>
              </div>
            ))
          )}

          {isPending && (
            <div className="rcl-chat-input-panel__row rcl-chat-input-panel__row--assistant">
              <div className="rcl-chat-input-panel__bubble rcl-chat-input-panel__bubble--assistant rcl-chat-input-panel__bubble--typing">
                <span className="rcl-chat-input-panel__dot" />
                <span className="rcl-chat-input-panel__dot" />
                <span className="rcl-chat-input-panel__dot" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rcl-chat-input-panel__composer">
        <textarea
          ref={inputRef}
          className="rcl-chat-input-panel__input"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setMode('expanded')}
          placeholder={placeholder}
          rows={1}
          disabled={isPending}
        />
        <button
          type="button"
          className="rcl-chat-input-panel__send"
          onClick={onSubmit}
          disabled={isPending || draft.trim().length === 0}
          aria-label="Send message"
        >
          Send
        </button>
      </div>
    </div>
  );
};
