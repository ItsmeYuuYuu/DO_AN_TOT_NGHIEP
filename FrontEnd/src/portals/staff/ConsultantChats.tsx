import { useEffect, useRef, useState } from 'react';
import { Bot, CheckCircle2, Headphones, MessageSquare, Send, User } from 'lucide-react';
import { chatSessionsApi } from '@/features/chat/api/chatSessionsApi';
import type { ChatMessage, ChatSession } from '@/features/chat/api/chatSessionsApi';
import { ChatRecommendationCards } from '@/features/chat/components/ChatRecommendationCards';

const ConsultantChats = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadQueue = async () => {
    const data = await chatSessionsApi.getHandoffs();
    setSessions(data);
    if (activeSession) {
      const updated = data.find(item => item.sessionid === activeSession.sessionid);
      if (updated) setActiveSession(updated);
    }
  };

  const loadMessages = async (sessionId: number) => {
    try {
      setMessages(await chatSessionsApi.getMessages(sessionId));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch {
      setMessages([]);
    }
  };

  useEffect(() => {
    loadQueue().catch(() => setSessions([]));
    const timer = window.setInterval(() => {
      loadQueue().catch(() => undefined);
      if (activeSession?.handoffstatus === 'InProgress') {
        loadMessages(activeSession.sessionid).catch(() => undefined);
      }
    }, 3000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.sessionid, activeSession?.handoffstatus]);

  const selectSession = async (session: ChatSession) => {
    setActiveSession(session);
    if (session.handoffstatus === 'InProgress') {
      await loadMessages(session.sessionid);
    } else {
      setMessages([]);
    }
  };

  const accept = async () => {
    if (!activeSession) return;
    setBusy(true);
    try {
      const updated = await chatSessionsApi.acceptHandoff(activeSession.sessionid);
      setActiveSession(updated);
      await Promise.all([loadQueue(), loadMessages(updated.sessionid)]);
    } finally {
      setBusy(false);
    }
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeSession || !input.trim()) return;
    setBusy(true);
    try {
      await chatSessionsApi.postConsultantMessage(activeSession.sessionid, input.trim());
      setInput('');
      await loadMessages(activeSession.sessionid);
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    if (!activeSession) return;
    setBusy(true);
    try {
      await chatSessionsApi.closeHandoff(activeSession.sessionid);
      setActiveSession(null);
      setMessages([]);
      await loadQueue();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black text-slate-800">Tư vấn trực tiếp</h1>
        <p className="text-sm text-slate-500">Tiếp nhận cuộc trò chuyện được chuyển từ trợ lý AI.</p>
      </div>

      <div className="grid min-h-[650px] grid-cols-[320px_1fr] overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <aside className="border-r border-slate-200 bg-slate-50">
          <div className="border-b border-slate-200 bg-white p-4">
            <p className="font-bold text-slate-800">Hàng chờ ({sessions.length})</p>
          </div>
          <div className="space-y-2 p-3">
            {sessions.map(session => (
              <button
                key={session.sessionid}
                type="button"
                onClick={() => selectSession(session)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  activeSession?.sessionid === session.sessionid
                    ? 'border-teal-400 bg-teal-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold text-slate-800">
                    {session.customername ?? `Khách #${session.customerid ?? session.sessionid}`}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    session.handoffstatus === 'Waiting'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {session.handoffstatus === 'Waiting' ? 'Đang chờ' : 'Đang xử lý'}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">{session.title}</p>
                {session.assignedname && (
                  <p className="mt-1 text-[11px] text-teal-700">Phụ trách: {session.assignedname}</p>
                )}
              </button>
            ))}
            {sessions.length === 0 && (
              <div className="py-16 text-center text-sm text-slate-400">Không có khách đang chờ.</div>
            )}
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          {!activeSession ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-400">
              <Headphones size={54} className="text-slate-200" />
              <p>Chọn một cuộc trò chuyện để bắt đầu tư vấn.</p>
            </div>
          ) : (
            <>
              <header className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
                <div>
                  <p className="font-bold text-slate-800">
                    {activeSession.customername ?? `Khách #${activeSession.customerid ?? activeSession.sessionid}`}
                  </p>
                  <p className="text-xs text-slate-500">
                    Phiên #{activeSession.sessionid} · {activeSession.title}
                  </p>
                </div>
                {activeSession.handoffstatus === 'Waiting' ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={accept}
                    className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    <Headphones size={17} /> Tiếp nhận
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={close}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                  >
                    <CheckCircle2 size={17} /> Hoàn tất
                  </button>
                )}
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 p-5">
                {activeSession.handoffstatus === 'Waiting' && (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
                    <MessageSquare size={46} className="text-slate-200" />
                    <p className="text-sm">Tiếp nhận phiên để xem toàn bộ ngữ cảnh AI và trả lời khách.</p>
                  </div>
                )}
                {messages.map(message => {
                  if (message.sendertype === 'system') {
                    return (
                      <p key={message.messageid} className="text-center text-xs font-medium text-slate-400">
                        {message.messagecontent}
                      </p>
                    );
                  }
                  const fromCustomer = message.sendertype === 'user';
                  return (
                    <div key={message.messageid} className={`flex gap-3 ${fromCustomer ? '' : 'flex-row-reverse'}`}>
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${
                        fromCustomer ? 'bg-blue-600' : message.sendertype === 'assistant' ? 'bg-violet-500' : 'bg-teal-600'
                      }`}>
                        {fromCustomer ? <User size={16} /> : message.sendertype === 'assistant' ? <Bot size={16} /> : <Headphones size={16} />}
                      </div>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                        fromCustomer
                          ? 'rounded-tl-none border border-slate-200 bg-white text-slate-700'
                          : 'rounded-tr-none bg-teal-600 text-white'
                      }`}>
                        <p className="whitespace-pre-wrap">{message.messagecontent}</p>
                        {message.recommendations && message.recommendations.length > 0 && (
                          <ChatRecommendationCards
                            sessionId={activeSession.sessionid}
                            recommendations={message.recommendations}
                          />
                        )}
                        <p className={`mt-1 text-[10px] ${fromCustomer ? 'text-slate-400' : 'text-teal-100'}`}>
                          {message.sendertype === 'assistant' ? 'AI' : message.sendertype === 'consultant' ? 'Tư vấn viên' : 'Khách hàng'}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {activeSession.handoffstatus === 'InProgress' && (
                <form onSubmit={send} className="flex gap-3 border-t border-slate-200 p-4">
                  <input
                    value={input}
                    onChange={event => setInput(event.target.value)}
                    placeholder="Nhập nội dung tư vấn..."
                    className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-500"
                  />
                  <button
                    type="submit"
                    disabled={busy || !input.trim()}
                    className="rounded-xl bg-teal-600 p-3 text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    <Send size={20} />
                  </button>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default ConsultantChats;
