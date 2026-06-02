import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { ChatMindMapAttachment } from './ChatMindMapAttachment';
import type { ChatDialogProps, ChatMessage, ChatReply } from './types';
import './ChatDialog.css';

const DEFAULT_RESPONSE = 'Here is the recommended questions list.';

const generateId = () =>
  `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const ChatDialog = ({
  value,
  defaultValue,
  onChange,
  onSubmit,
  defaultMindMapTree,
  mindMapJson,
  mindMapValue,
  onMindMapChange,
  attachmentHeight = 360,
  title = 'Chat',
  placeholder = 'Type a message and press Enter…',
  height = 480,
  className,
}: ChatDialogProps) => {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<ChatMessage[]>(defaultValue ?? []);
  const messages = isControlled ? (value as ChatMessage[]) : internal;

  const [draft, setDraft] = useState('');
  const [isPending, setIsPending] = useState(false);

  // History of user-submitted messages (oldest first). historyIndex === null
  // means we're not navigating; otherwise it points to the entry currently
  // shown in the input. stashedDraft preserves whatever was typed before
  // navigation started so Down past the newest entry restores it.
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const stashedDraftRef = useRef('');

  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const commit = useCallback(
    (next: ChatMessage[]) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  // Track latest messages so async submit handlers append to fresh state.
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const handleSubmit = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed || isPending) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    };
    const afterUser = [...messagesRef.current, userMessage];
    commit(afterUser);
    setDraft('');
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(null);
    stashedDraftRef.current = '';
    setIsPending(true);

    try {
      // When using the default responder, seed the embedded mindmap from
      // whichever tree the caller provided. Prefer the shared controlled tree
      // (so the very first response already reflects the current state) and
      // fall back to `defaultMindMapTree`.
      const seedTree = mindMapValue ?? defaultMindMapTree;
      const raw = onSubmit
        ? await onSubmit(trimmed)
        : (mindMapJson ??
          ({
            content: DEFAULT_RESPONSE,
            attachment: seedTree
              ? { type: 'mindmap', tree: seedTree }
              : undefined,
          } satisfies ChatReply));
      const reply: ChatReply =
        typeof raw === 'string' ? { content: raw } : raw;
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: reply.content,
        attachment: reply.attachment,
        createdAt: Date.now(),
      };
      commit([...afterUser, assistantMessage]);
    } catch (error) {
      // Surface failures as an assistant message instead of silently dropping
      // the turn — otherwise the user sees their message with no reply.
      const detail =
        error instanceof Error ? error.message : 'Something went wrong.';
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `⚠️ ${detail}`,
        createdAt: Date.now(),
      };
      commit([...afterUser, errorMessage]);
    } finally {
      setIsPending(false);
    }
  }, [
    draft,
    isPending,
    onSubmit,
    defaultMindMapTree,
    mindMapJson,
    mindMapValue,
    commit,
  ]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return;

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
      return;
    }

    const ta = event.currentTarget;
    const caretAtStart = ta.selectionStart === 0 && ta.selectionEnd === 0;
    const caretAtEnd =
      ta.selectionStart === ta.value.length &&
      ta.selectionEnd === ta.value.length;

    // Only intercept arrows when the caret is at a boundary, so multi-line
    // drafts still allow normal cursor movement within the text.
    if (event.key === 'ArrowUp' && caretAtStart) {
      if (history.length === 0) return;
      event.preventDefault();
      if (historyIndex === null) {
        stashedDraftRef.current = draft;
        const next = history.length - 1;
        setHistoryIndex(next);
        setDraft(history[next]!);
      } else if (historyIndex > 0) {
        const next = historyIndex - 1;
        setHistoryIndex(next);
        setDraft(history[next]!);
      }
      return;
    }

    if (event.key === 'ArrowDown' && caretAtEnd) {
      if (historyIndex === null) return;
      event.preventDefault();
      if (historyIndex < history.length - 1) {
        const next = historyIndex + 1;
        setHistoryIndex(next);
        setDraft(history[next]!);
      } else {
        setHistoryIndex(null);
        setDraft(stashedDraftRef.current);
        stashedDraftRef.current = '';
      }
    }
  };

  // Auto-scroll to the latest message whenever the list grows or pending state
  // changes (so the typing indicator stays visible).
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isPending]);

  // After a history navigation pulls a value into the input, drop the caret at
  // the end so the user can keep editing the recalled message.
  useLayoutEffect(() => {
    if (historyIndex === null) return;
    const ta = inputRef.current;
    if (!ta) return;
    const len = ta.value.length;
    ta.setSelectionRange(len, len);
  }, [historyIndex, draft]);

  // Reset pending state if the component is unmounted mid-flight.
  useEffect(() => () => setIsPending(false), []);

  return (
    <div
      className={['rcl-chat-dialog', className].filter(Boolean).join(' ')}
      style={{ height }}
      role="dialog"
      aria-label={title}
    >
      {title && (
        <div className="rcl-chat-dialog__header">
          <span className="rcl-chat-dialog__title">{title}</span>
        </div>
      )}

      <div className="rcl-chat-dialog__messages" ref={listRef}>
        {messages.length === 0 ? (
          <p className="rcl-chat-dialog__empty">
            Ask anything to get started.
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={[
                'rcl-chat-dialog__bubble-row',
                `rcl-chat-dialog__bubble-row--${message.role}`,
              ].join(' ')}
            >
              <div className="rcl-chat-dialog__bubble-group">
                {message.content && (
                  <div
                    className={[
                      'rcl-chat-dialog__bubble',
                      `rcl-chat-dialog__bubble--${message.role}`,
                    ].join(' ')}
                  >
                    {message.content}
                  </div>
                )}
                {message.attachment?.type === 'mindmap' && (
                  <ChatMindMapAttachment
                    tree={message.attachment.tree}
                    height={attachmentHeight}
                    value={mindMapValue}
                    onChange={onMindMapChange}
                  />
                )}
              </div>
            </div>
          ))
        )}

        {isPending && (
          <div className="rcl-chat-dialog__bubble-row rcl-chat-dialog__bubble-row--assistant">
            <div className="rcl-chat-dialog__bubble rcl-chat-dialog__bubble--assistant rcl-chat-dialog__bubble--typing">
              <span className="rcl-chat-dialog__dot" />
              <span className="rcl-chat-dialog__dot" />
              <span className="rcl-chat-dialog__dot" />
            </div>
          </div>
        )}
      </div>

      <div className="rcl-chat-dialog__composer">
        <textarea
          ref={inputRef}
          className="rcl-chat-dialog__input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isPending}
        />
        <button
          type="button"
          className="rcl-chat-dialog__send"
          onClick={() => void handleSubmit()}
          disabled={isPending || draft.trim().length === 0}
          aria-label="Send message"
        >
          Send
        </button>
      </div>
    </div>
  );
};
