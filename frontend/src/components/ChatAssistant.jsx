import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useTripActions } from "../context/TripActionsContext";
import "./ChatAssistant.css";

const SUGGESTIONS = [
  "Best time to visit?",
  "What should I pack?",
  "Cheap food spots?",
  "Local transport tips?",
];

const ChatAssistant = () => {
  const { user } = useAuth();
  const { actions } = useTripActions();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const tripContext = actions?.trip || null;

  // Welcome message helper
  const welcomeMessage = () => ({
    role: "assistant",
    content: tripContext
      ? `Hi! 👋 I can help with your trip to ${tripContext.destination}. Ask me anything — packing, budget, local tips, day plans.`
      : `Hi! 👋 I'm Sky, your travel assistant. Ask me anything — trip ideas, packing, budgets, local tips.`,
  });

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Welcome message on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([welcomeMessage()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Hide on landing page and when logged out
  if (location.pathname === "/" || !user) return null;

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post("/chat", {
        messages: next,
        tripId: tripContext?._id || null,
      });
      setMessages([...next, { role: "assistant", content: res.data.reply }]);
    } catch (err) {
      setMessages([
        ...next,
        {
          role: "assistant",
          content:
            err.response?.data?.message ||
            "Sorry, I couldn't reply just now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 🔄 Refresh — clears conversation and resets to welcome
  const handleRefresh = () => {
    if (loading) return;
    setMessages([welcomeMessage()]);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        className={`chat-fab ${open ? "open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open AI assistant"}
      >
        {open ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <span className="chat-fab-icon">✨</span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-header-avatar">✨</div>
            <div className="chat-header-info">
              <div className="chat-header-name">Sky</div>
              <div className="chat-header-sub">
                {tripContext
                  ? `Trip: ${tripContext.destination}`
                  : "AI Travel Assistant"}
              </div>
            </div>

            {/* 🔄 Refresh button */}
            <button
              type="button"
              className="chat-header-refresh"
              onClick={handleRefresh}
              disabled={loading}
              title="Start a new conversation"
              aria-label="Refresh chat"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
                <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
              </svg>
            </button>

            <button
              className="chat-header-close"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          <div className="chat-messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                <div className="chat-bubble">{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className="chat-msg assistant">
                <div className="chat-bubble chat-typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>

          {messages.length <= 1 && !loading && (
            <div className="chat-suggestions">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="chat-suggestion"
                  onClick={() => send(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="chat-input-row">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Ask anything..."
              className="chat-input"
              disabled={loading}
            />
            <button
              type="button"
              className="chat-send"
              onClick={() => send()}
              disabled={loading || !input.trim()}
              aria-label="Send"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatAssistant;