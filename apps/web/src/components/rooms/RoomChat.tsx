'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

interface Message {
  id: string;
  author: string;
  displayName: string;
  body: string;
  lang: 'he' | 'en';
  createdAt: string;
}

const MOCK_MESSAGES: Message[] = [
  { id: '1', author: 'trader_il', displayName: 'משה כהן', body: '$טבע מרגישה חזקה היום, מחכה לפריצה מעל 54', lang: 'he', createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  { id: '2', author: 'davidl', displayName: 'David L', body: 'Agreed on $TEVA, volume is picking up', lang: 'en', createdAt: new Date(Date.now() - 1000 * 60 * 4).toISOString() },
  { id: '3', author: 'tase_watcher', displayName: 'רחל מ', body: 'כן אבל שימו לב לאוצר האמריקאי, יכול להשפיע', lang: 'he', createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString() },
];

interface RoomChatProps {
  slug: string;
}

export function RoomChat({ slug }: RoomChatProps) {
  const locale = useLocale();
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage() {
    if (!input.trim()) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      author: 'me',
      displayName: locale === 'he' ? 'אני' : 'Me',
      body: input,
      lang: locale as 'he' | 'en',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput('');
  }

  return (
    <div className="bg-tsua-card border border-tsua-border rounded-2xl flex flex-col h-[600px]">
      {/* Header */}
      <div className="border-b border-tsua-border px-4 py-3 flex items-center gap-2">
        <span className="text-tsua-green font-bold">⚡</span>
        <h2 className="font-bold text-tsua-text">
          {locale === 'he' ? 'יומאים' : 'Day Traders'}
        </h2>
        <span className="text-xs text-tsua-muted ms-auto">1,243 {locale === 'he' ? 'חברים' : 'members'}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-2.5">
            <div className="w-8 h-8 rounded-full bg-tsua-green/20 flex items-center justify-center text-tsua-green text-xs font-bold shrink-0">
              {msg.displayName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-tsua-text">{msg.displayName}</span>
                <span className="text-[10px] text-tsua-muted">
                  {new Date(msg.createdAt).toLocaleTimeString(locale === 'he' ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p dir="auto" className="text-sm text-tsua-text/90 mt-0.5">{msg.body}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-tsua-border p-3 flex gap-2">
        <input
          dir="auto"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
          placeholder={locale === 'he' ? 'הקלד הודעה...' : 'Type a message...'}
          className="flex-1 bg-tsua-bg border border-tsua-border rounded-xl px-3 py-2 text-sm text-tsua-text placeholder:text-tsua-muted focus:outline-none focus:border-tsua-green transition-colors"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="bg-tsua-green text-tsua-bg p-2.5 rounded-xl hover:bg-tsua-green/90 disabled:opacity-40 transition-all"
        >
          <PaperAirplaneIcon className="w-4 h-4" style={{ transform: locale === 'he' ? 'scaleX(-1)' : 'none' }} />
        </button>
      </div>
    </div>
  );
}
