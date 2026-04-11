// File: src/components/AIChatbot.jsx
// Purpose: Floating AI chatbot for NairobiAlert — powered by Gemini, styled to match
//          the teal/mono design system. Handles flood queries, safety info, shelter
//          lookups, and incident reporting guidance.
// Dependencies: react, lucide-react (already in project via EveShield pattern),
//               @google/generative-ai (add to package.json)
//
// Setup:
//   1. npm install @google/generative-ai
//   2. Add VITE_GEMINI_API_KEY to your .env
//   3. Import and drop <AIChatbot /> anywhere in PublicLayout.jsx

import { useState, useRef, useEffect, useCallback } from 'react';

/* ── Icons (inline SVG — no extra dep, matches project pattern) ────────────── */
function IconBot({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <path d="M8 15h.01M12 15h.01M16 15h.01" />
    </svg>
  );
}

function IconSend({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function IconX({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconWave({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M2 12 Q5 8 8 12 Q11 16 14 12 Q17 8 20 12 Q22 14 23 12" />
    </svg>
  );
}

/* ── Gemini API call ─────────────────────────────────────────────────────── */
async function callGemini(userMessage, apiKey) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

  const systemPrompt = `You are NairobiAlert AI, a calm and knowledgeable assistant for NairobiAlert — a real-time flood crisis coordination platform serving Nairobi, Kenya.

Your role:
- Help residents understand what to do during flooding events
- Explain how to submit an incident report via the web form, USSD (*384#), or SMS (22384)
- Guide users to open shelters and how to read the live map
- Provide safety guidance specific to Kibera, Mathare, Mukuru, and other flood-prone zones
- Answer general flood preparedness questions

Platform features you know:
1. Live Map (/map) — shows verified incidents, open shelters, deployed teams
2. Report Form (/report) — submit incidents with GPS location, no account needed
3. USSD *384# — works on any phone, no internet needed
4. SMS 22384 — text FLOOD [Location] [Details]
5. Admin verification — reports are reviewed before appearing on the public map

Emergency guidance rules:
- If someone is in immediate danger, tell them to call 999 (Police) or 1199 (Kenya Red Cross) FIRST
- Never tell someone to wait for the app if they are in physical danger
- Shelters information is live on the map at /map

Tone:
- Calm, direct, reassuring — this is a crisis tool
- Short responses preferred — users may be on slow connections
- No markdown headers, keep formatting minimal
- If you do not know something specific about NairobiAlert, say so and suggest the map or report form

User message: ${userMessage}`;

  const result = await model.generateContent(systemPrompt);
  return result.response.text();
}

/* ── Message formatter ───────────────────────────────────────────────────── */
function FormattedMessage({ text }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        if (line.trim().startsWith('*') || line.trim().startsWith('•')) {
          return (
            <div key={i} className="flex gap-1.5 items-start">
              <span className="mt-1 flex-shrink-0 w-1 h-1 rounded-full bg-current opacity-60" />
              <span>{line.replace(/^[*•]\s*/, '')}</span>
            </div>
          );
        }
        // Bold **text**
        const parts = line.split('**');
        return (
          <div key={i}>
            {parts.map((part, j) =>
              j % 2 === 1
                ? <strong key={j} className="font-semibold">{part}</strong>
                : part
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Typing indicator ────────────────────────────────────────────────────── */
function TypingDots() {
  return (
    <div className="flex gap-1 items-center py-0.5">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-1.5 h-1.5 rounded-full bg-teal animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

/* ── Quick prompts ───────────────────────────────────────────────────────── */
const QUICK_PROMPTS = [
  'How do I report flooding?',
  'Where are open shelters?',
  'What to do if flooding starts?',
  'How does USSD *384# work?',
];

/* ── Initial bot message ─────────────────────────────────────────────────── */
const INITIAL_MESSAGE = {
  id: 'init',
  role: 'bot',
  text: "Hi. I'm NairobiAlert AI. I can help you report incidents, find shelters, and stay safe during flooding. What do you need?",
  ts: new Date(),
};

/* ── Main component ──────────────────────────────────────────────────────── */
export default function AIChatbot() {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput]       = useState('');
  const [typing, setTyping]     = useState(false);
  const [error, setError]       = useState(null);
  const bottomRef               = useRef(null);
  const inputRef                = useRef(null);

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const send = useCallback(async (text) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || typing) return;

    setInput('');
    setError(null);

    const userMsg = {
      id:   Date.now(),
      role: 'user',
      text: trimmed,
      ts:   new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setTyping(true);

    try {
      if (!apiKey) throw new Error('VITE_GEMINI_API_KEY not set');
      const response = await callGemini(trimmed, apiKey);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'bot', text: response, ts: new Date() },
      ]);
    } catch (err) {
      console.error('[NairobiAlert AI]', err);
      setError('Connection issue. Try again or call 999 for emergencies.');
      setMessages((prev) => [
        ...prev,
        {
          id:   Date.now() + 1,
          role: 'bot',
          text: 'I could not connect right now. If you are in danger, call 999 or 1199 immediately.',
          ts:   new Date(),
          isError: true,
        },
      ]);
    } finally {
      setTyping(false);
    }
  }, [input, typing, apiKey]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const formatTime = (date) =>
    date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

  const showQuickPrompts = messages.length === 1 && !typing;

  return (
    <>
      {/* ── Floating trigger button ────────────────────────────────────── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open AI assistant"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-teal text-white pl-3 pr-4 py-3 rounded-full shadow-lg hover:bg-teal-dark transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2"
        >
          <IconBot size={20} />
          <span className="font-body font-semibold text-sm">Ask AI</span>
          {/* Live pulse dot */}
          <span className="relative flex h-2 w-2 ml-0.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
        </button>
      )}

      {/* ── Chat window ────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 flex flex-col bg-white border border-border rounded-radius-lg shadow-lg overflow-hidden"
          style={{ width: '360px', maxWidth: 'calc(100vw - 1.5rem)', height: '520px', maxHeight: 'calc(100vh - 3rem)' }}
          role="dialog"
          aria-label="NairobiAlert AI Assistant"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-teal text-white flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                <IconWave size={16} />
              </div>
              <div>
                <p className="font-body font-semibold text-sm leading-none">NairobiAlert AI</p>
                <p className="font-mono text-xs text-teal-mid leading-none mt-0.5">Flood response assistant</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-radius hover:bg-white/15 transition-colors duration-150"
              aria-label="Close assistant"
            >
              <IconX size={18} />
            </button>
          </div>

          {/* Emergency banner */}
          <div className="flex items-center gap-2 px-3 py-2 bg-red-light border-b border-red/20 flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-red flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <p className="font-mono text-xs text-red">
              In danger? Call <strong>999</strong> or <strong>1199</strong> now.
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                {msg.role === 'bot' && (
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-light border border-teal/20 flex items-center justify-center mb-0.5">
                    <IconWave size={12} />
                  </div>
                )}

                <div className={`max-w-[82%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  <div
                    className={`px-3 py-2.5 rounded-radius font-body text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-teal text-white rounded-br-sm'
                        : msg.isError
                        ? 'bg-red-light text-red border border-red/20 rounded-bl-sm'
                        : 'bg-bg text-text border border-border rounded-bl-sm'
                    }`}
                  >
                    {msg.role === 'bot'
                      ? <FormattedMessage text={msg.text} />
                      : msg.text
                    }
                  </div>
                  <span className="font-mono text-xs text-text-dim px-0.5">
                    {formatTime(msg.ts)}
                  </span>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div className="flex items-end gap-2">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-light border border-teal/20 flex items-center justify-center">
                  <IconWave size={12} />
                </div>
                <div className="bg-bg border border-border rounded-radius rounded-bl-sm px-3 py-2.5">
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick prompts — only on first load */}
          {showQuickPrompts && (
            <div className="px-3 pb-2 flex-shrink-0">
              <p className="font-mono text-xs text-text-dim mb-1.5">Quick questions:</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => send(prompt)}
                    className="font-body text-xs bg-teal-light text-teal border border-teal/20 px-2.5 py-1 rounded-full hover:bg-teal hover:text-white transition-colors duration-150"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-border flex-shrink-0">
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about flooding, shelters, reporting…"
                disabled={typing}
                className="flex-1 font-body text-xs bg-bg border border-border rounded-radius px-3 py-2.5 text-text placeholder-text-dim focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent disabled:opacity-60 transition-colors duration-150"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || typing}
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-teal text-white rounded-radius hover:bg-teal-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-1"
                aria-label="Send message"
              >
                <IconSend size={15} />
              </button>
            </div>
            <p className="font-mono text-xs text-text-dim mt-1.5 text-center">
              AI can make mistakes. Verify on the{' '}
              <a href="/map" className="text-teal hover:underline">live map</a>.
            </p>
          </div>
        </div>
      )}
    </>
  );
}