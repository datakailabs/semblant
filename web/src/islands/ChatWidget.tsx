import { useState, useRef, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatWidget({ name }: { name: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Request failed' }));
        setMessages((prev) => [...prev, { role: 'assistant', content: err.error || 'Something went wrong.' }]);
        return;
      }

      const data = await resp.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Network error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 100); }}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg transition-all hover:scale-105 z-50"
        style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="text-sm font-medium">Ask about {name.split(' ')[0]}</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        maxHeight: '500px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
          Chat with {name.split(' ')[0]}
        </span>
        <button
          onClick={() => setOpen(false)}
          className="text-xs px-2 py-1 rounded transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          close
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: '200px', maxHeight: '350px' }}>
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Ask anything about {name}'s experience, skills, or projects.
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center mt-3">
              {['What do you specialize in?', 'Tell me about your projects', 'What certifications do you have?'].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); setTimeout(() => send(), 0); }}
                  className="text-xs px-2.5 py-1 rounded-full transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: '#fff',
                    opacity: 0.7,
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[80%] px-3 py-2 rounded-lg text-sm"
              style={msg.role === 'user'
                ? { backgroundColor: 'var(--color-accent)', color: '#fff' }
                : { backgroundColor: 'var(--color-border)', color: 'var(--color-text)' }
              }
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-3" style={{ borderTop: '1px solid var(--color-border)' }}>
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            maxLength={500}
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-30"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
