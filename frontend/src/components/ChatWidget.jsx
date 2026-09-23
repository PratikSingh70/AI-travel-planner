import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";

// Change this if your API is hosted somewhere else
// For production (Render), use your full backend URL
const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm Sky, your travel assistant. Ask me anything about your trip! ✈️",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // ─── Get tripId from URL ───
  // useParams works if this component is rendered inside a <Route path="/trips/:id">
  // Fallback to regex on the pathname if not inside a routed component.
  const params = useParams();
  const location = useLocation();

  const tripId =
    params?.id ||
    location.pathname.match(/\/trips\/([a-f0-9]{24})/)?.[1] ||
    sessionStorage.getItem("activeTripId") ||
    null;

  // Auto-scroll to the newest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Store activeTripId so the widget still works if it's rendered globally
  useEffect(() => {
    if (tripId) {
      sessionStorage.setItem("activeTripId", tripId);
    }
  }, [tripId]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Add the user's message immediately
    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content:
              "You need to be logged in to chat. Please log in and try again.",
          },
        ]);
        setLoading(false);
        return;
      }

      // Strip the initial greeting (it's not part of the conversation the
      // AI needs to see)
      const conversation = newMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: conversation,
          tripId, // ← this is what makes the AI aware of your trip
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || `Request failed (${res.status})`);
      }

      setMessages([
        ...newMessages,
        { role: "assistant", content: data.reply || "Sorry, I didn't catch that." },
      ]);

      // Optional: log whether trip context was used
      if (data.hasTripContext) {
        console.log(`[Chat] Reply used trip context: ${data.tripDestination}`);
      } else {
        console.log("[Chat] Reply was general (no trip context)");
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't reach the server. Please check your connection and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Toggle chat"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "#a3e635",
          color: "#000",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          fontSize: "24px",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isOpen ? "✕" : "💬"}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "96px",
            right: "24px",
            width: "380px",
            maxWidth: "calc(100vw - 32px)",
            height: "560px",
            maxHeight: "calc(100vh - 140px)",
            background: "#0f0f0f",
            color: "#fff",
            borderRadius: "16px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 999,
            border: "1px solid #222",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid #222",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#a3e635",
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: "14px" }}>Sky</div>
              <div style={{ fontSize: "11px", color: "#888" }}>
                {tripId ? "Trip context loaded" : "Travel assistant"}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  padding: "10px 14px",
                  borderRadius:
                    m.role === "user"
                      ? "14px 14px 2px 14px"
                      : "14px 14px 14px 2px",
                  background: m.role === "user" ? "#a3e635" : "#1e1e1e",
                  color: m.role === "user" ? "#000" : "#fff",
                  fontSize: "13px",
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div
                style={{
                  alignSelf: "flex-start",
                  padding: "10px 14px",
                  background: "#1e1e1e",
                  borderRadius: "14px 14px 14px 2px",
                  fontSize: "13px",
                  color: "#888",
                }}
              >
                Sky is typing…
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: "12px",
              borderTop: "1px solid #222",
              display: "flex",
              gap: "8px",
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={tripId ? "Ask about your trip…" : "Ask anything…"}
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 14px",
                background: "#1e1e1e",
                color: "#fff",
                border: "1px solid #333",
                borderRadius: "10px",
                fontSize: "13px",
                outline: "none",
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                padding: "10px 16px",
                background: input.trim() && !loading ? "#a3e635" : "#333",
                color: input.trim() && !loading ? "#000" : "#666",
                border: "none",
                borderRadius: "10px",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}