import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";

export default function AssistantPanel({ logs }) {
  const [query, setQuery] = useState("");
  const [conversation, setConversation] = useState([
    {
      role: "assistant",
      content:
        "Hello! I'm your **LLM-powered** SOC Assistant. Ask me anything about the security logs.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [useLLM, setUseLLM] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  const handleAsk = async () => {
    if (!query.trim()) return;
    const userMsg = { role: "user", content: query };
    setConversation((prev) => [...prev, userMsg]);
    setQuery("");
    setLoading(true);

    const endpoint = useLLM ? "/api/llm/ask" : "/api/assistant/query";
    const backendUrl = "http://127.0.0.1:5000";
    const fullUrl = `${backendUrl}${endpoint}`;

    console.log("Sending to:", fullUrl);
    console.log("Query:", query);
    console.log("Logs count:", logs?.length);

    try {
      const res = await fetch(fullUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          logs: Array.isArray(logs) ? logs.slice(0, 200) : [],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const assistantMsg = {
        role: "assistant",
        content: data.answer || "No answer received.",
      };
      setConversation((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error(`Assistant error: ${err.message}`);
      setConversation((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed right-4 top-20 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 flex flex-col h-[500px]">
      <div className="p-3 border-b border-slate-700 font-semibold text-white flex justify-between items-center">
        <span>🤖 SOC Assistant {useLLM && "(LLM Mode)"}</span>
        <div className="flex gap-2">
          <button
            onClick={() => setUseLLM(!useLLM)}
            className={`text-xs px-2 py-1 rounded ${useLLM ? "bg-blue-600" : "bg-slate-600"}`}
          >
            {useLLM ? "LLM" : "Rule"}
          </button>
          <button
            onClick={() => setConversation([conversation[0]])}
            className="text-xs text-gray-400 hover:text-white"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {conversation.map((msg, i) => (
          <div
            key={i}
            className={`text-sm ${msg.role === "user" ? "text-right" : "text-left"}`}
          >
            <span
              className={`inline-block p-2 rounded-lg max-w-[90%] ${msg.role === "user" ? "bg-blue-600" : "bg-slate-700"}`}
            >
              {msg.content}
            </span>
          </div>
        ))}
        {loading && (
          <div className="text-center text-gray-400 text-sm">
            Assistant is thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-3 border-t border-slate-700 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleAsk()}
          placeholder="Ask about threats..."
          className="flex-1 bg-slate-700 text-white p-2 rounded text-sm"
        />
        <button
          onClick={handleAsk}
          className="bg-blue-600 px-3 py-2 rounded text-white text-sm"
        >
          Send
        </button>
      </div>
    </div>
  );
}
