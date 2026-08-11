import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import axios from 'axios';
import { Bot, CheckCircle2, Headphones, History, MessageSquare, Send, User } from 'lucide-react';
import { chatSessionsApi } from '@/features/chat/api/chatSessionsApi';
import type { ChatMessage, ChatSession } from '@/features/chat/api/chatSessionsApi';
import { ChatComparisonTable } from '@/features/chat/components/ChatComparisonTable';
import { ChatLinkifiedText } from '@/features/chat/components/ChatLinkifiedText';
import { notifyError } from '@/utils/notifications';

const statusLabel: Record<string, string> = {
  Waiting: 'Đang chờ',
  InProgress: 'Đang xử lý',
  Closed: 'Đã kết thúc',
};

const resolutionLabels: Record<string, string> = {
  Resolved: 'Đã giải quyết xong',
  CustomerNoResponse: 'Khách hàng không phản hồi',
  CustomerEnded: 'Khách hàng chủ động kết thúc',
};

const getSessionStatusLabel = (session: ChatSession) => {
  if (session.handoffstatus === 'Closed') {
    return session.resolutioncode
      ? resolutionLabels[session.resolutioncode] ?? session.resolutioncode
      : 'Đã kết thúc';
  }
  return statusLabel[session.handoffstatus ?? ''] ?? session.handoffstatus ?? 'Mới';
};

const ConsultantChats = () => {
  const [viewMode, setViewMode] = useState<'queue' | 'history'>('queue');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [resolutionCode, setResolutionCode] = useState('');
  const [customerTyping, setCustomerTyping] = useState(false);
  const messagesPaneRef = useRef<HTMLDivElement>(null);
  const lastTypingSentRef = useRef(0);
  const lastMessageIdRef = useRef(0);
  const queuePollingRef = useRef(false);
  const chatPollingRef = useRef(false);

  const loadQueue = useCallback(async () => {
    const data = viewMode === 'history'
      ? await chatSessionsApi.getConsultationHistory()
      : await chatSessionsApi.getHandoffs();
    setSessions(data);
    setActiveSession(current => {
      if (!current) return current;
      return data.find(item => item.sessionid === current.sessionid) ?? current;
    });
  }, [viewMode]);

  const loadMessages = useCallback(async (sessionId: number, forceScroll = false) => {
    const pane = messagesPaneRef.current;
    const distanceFromBottom = pane
      ? pane.scrollHeight - pane.scrollTop - pane.clientHeight
      : 0;
    const shouldScroll = forceScroll || !pane || distanceFromBottom < 96;

    try {
      const latestMessages = await chatSessionsApi.getMessages(sessionId);
      setMessages(latestMessages);
      lastMessageIdRef.current = latestMessages.reduce((max, message) => Math.max(max, message.messageid), 0);
      if (shouldScroll) {
        window.setTimeout(() => {
          const currentPane = messagesPaneRef.current;
          currentPane?.scrollTo({
            top: currentPane.scrollHeight,
            behavior: forceScroll ? 'auto' : 'smooth',
          });
        }, 50);
      }
    } catch {
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    loadQueue().catch(() => setSessions([]));
    const timer = window.setInterval(async () => {
      if (document.hidden || queuePollingRef.current) return;
      queuePollingRef.current = true;
      try { await loadQueue(); } catch { /* giữ dữ liệu hiện tại khi mạng chập chờn */ }
      finally { queuePollingRef.current = false; }
    }, 8000);
    return () => window.clearInterval(timer);
  }, [loadQueue]);

  useEffect(() => {
    if (viewMode !== 'queue' || activeSession?.handoffstatus !== 'InProgress') return;
    const sessionId = activeSession.sessionid;
    const timer = window.setInterval(async () => {
      if (document.hidden || chatPollingRef.current) return;
      chatPollingRef.current = true;
      try {
        const updates = await chatSessionsApi.getUpdates(sessionId, lastMessageIdRef.current);
        setActiveSession(updates.session);
        setSessions(current => current.map(item => item.sessionid === sessionId ? updates.session : item));
        setCustomerTyping(updates.userTyping);
        if (updates.messages.length > 0) {
          lastMessageIdRef.current = Math.max(lastMessageIdRef.current, ...updates.messages.map(message => message.messageid));
          setMessages(current => {
            const existing = new Set(current.map(message => message.messageid));
            return [...current, ...updates.messages.filter(message => !existing.has(message.messageid))];
          });
        }
      } catch { /* bỏ qua một nhịp polling lỗi */ }
      finally { chatPollingRef.current = false; }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [activeSession?.handoffstatus, activeSession?.sessionid, viewMode]);

  const selectSession = async (session: ChatSession) => {
    setActiveSession(session);
    setResolutionCode('');
    if (viewMode === 'history' || session.handoffstatus === 'InProgress') {
      await loadMessages(session.sessionid, true);
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
      await Promise.all([loadQueue(), loadMessages(updated.sessionid, true)]);
    } finally {
      setBusy(false);
    }
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeSession || !input.trim()) return;
    setBusy(true);
    try {
      await chatSessionsApi.postConsultantMessage(activeSession.sessionid, input.trim());
      setInput('');
      await loadMessages(activeSession.sessionid, true);
    } finally {
      setBusy(false);
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
    if (!activeSession || !event.target.value.trim()) return;

    const now = Date.now();
    if (now - lastTypingSentRef.current < 2500) return;
    lastTypingSentRef.current = now;
    void chatSessionsApi.setTyping(activeSession.sessionid).catch(() => undefined);
  };

  const close = async () => {
    if (!activeSession || !resolutionCode) return;
    setBusy(true);
    try {
      await chatSessionsApi.closeHandoff(activeSession.sessionid, resolutionCode);
      setActiveSession(null);
      setMessages([]);
      await loadQueue();
    } catch (error) {
      notifyError(axios.isAxiosError(error)
        ? error.response?.data?.message ?? 'Không thể kết thúc phiên tư vấn.'
        : 'Không thể kết thúc phiên tư vấn.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="ops-hero">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 className="ops-hero-title">Chăm sóc khách hàng</h1>
          </div>
          <div className="rounded-full border border-red-100 bg-white px-4 py-2 text-sm font-black text-[#c4000b] shadow-sm">
            {sessions.length} {viewMode === 'history' ? 'phiên tư vấn đã lưu' : 'phiên đang chờ xử lý'}
          </div>
        </div>
      </section>

      <div className="grid min-h-[680px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)] lg:h-[clamp(560px,72vh,760px)] lg:min-h-0 lg:grid-cols-[340px_1fr]">
        <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-slate-50">
          <div className="border-b border-slate-200 bg-white p-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setViewMode('queue');
                  setActiveSession(null);
                  setMessages([]);
                }}
                className={`px-3 py-2 text-xs font-black ${viewMode === 'queue' ? 'bg-[#e30613] text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                Hàng đợi
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('history');
                  setActiveSession(null);
                  setMessages([]);
                }}
                className={`inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-black ${viewMode === 'history' ? 'bg-[#e30613] text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                <History size={14} /> Lịch sử
              </button>
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-400">
              {viewMode === 'history'
                ? 'Xem lại nội dung và nhân viên đã phụ trách từng phiên.'
                : 'Các phiên khách cần nhân viên hỗ trợ trực tiếp.'}
            </p>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3">
            {sessions.map(session => (
              <button
                key={session.sessionid}
                type="button"
                onClick={() => selectSession(session)}
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  activeSession?.sessionid === session.sessionid
                    ? 'border-teal-400 bg-teal-50 shadow-[0_10px_28px_rgba(15,23,42,0.06)]'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-black text-[#172033]">
                    {session.customername ?? `Khách #${session.customerid ?? session.sessionid}`}
                  </span>
                  <span className={`shrink-0 whitespace-nowrap px-2 py-0.5 text-[10px] font-black ${
                    session.handoffstatus === 'Waiting'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {getSessionStatusLabel(session)}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs font-semibold text-slate-500">{session.title}</p>
                {session.assignedname && (
                  <p className="mt-1 text-[11px] font-bold text-teal-700">Phụ trách: {session.assignedname}</p>
                )}
              </button>
            ))}
            {sessions.length === 0 && (
              <div className="py-16 text-center text-sm font-semibold text-slate-400">
                {viewMode === 'history' ? 'Chưa có lịch sử tư vấn.' : 'Không có khách đang chờ.'}
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col">
          {!activeSession ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-white text-slate-400">
              <Headphones size={54} className="text-slate-200" />
              <p className="font-semibold">Chọn một cuộc trò chuyện để bắt đầu tư vấn.</p>
            </div>
          ) : (
            <>
              <header className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
                <div>
                  <p className="font-black text-[#172033]">
                    {activeSession.customername ?? `Khách #${activeSession.customerid ?? activeSession.sessionid}`}
                  </p>
                  <p className="text-xs font-semibold text-slate-500">
                    Phiên #{activeSession.sessionid} · {activeSession.title}
                  </p>
                </div>
                {viewMode === 'history' ? (
                  <div className="text-right text-xs font-bold text-slate-500"><p>Phụ trách: {activeSession.assignedname ?? 'Chưa phân công'}</p>{activeSession.resolutioncode && <p className="mt-1 text-emerald-700">{resolutionLabels[activeSession.resolutioncode] ?? activeSession.resolutioncode}</p>}</div>
                ) : activeSession.handoffstatus === 'Waiting' ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={accept}
                    className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-2 text-sm font-black text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    <Headphones size={17} /> Tiếp nhận
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <select value={resolutionCode} onChange={event => setResolutionCode(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-emerald-400">
                      <option value="">Chọn kết quả xử lý</option>
                      <option value="Resolved">Đã giải quyết xong</option>
                      <option value="CustomerNoResponse">Khách không phản hồi (sau 5 phút)</option>
                      <option value="CustomerEnded">Khách chủ động kết thúc</option>
                    </select>
                    <button type="button" disabled={busy || !resolutionCode} onClick={close} className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
                      <CheckCircle2 size={17} /> Xác nhận
                    </button>
                  </div>
                )}
              </header>

              <div
                ref={messagesPaneRef}
                className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-[#f6f8fb] p-5"
              >
                {viewMode === 'queue' && activeSession.handoffstatus === 'Waiting' && (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
                    <MessageSquare size={46} className="text-slate-200" />
                    <p className="text-sm font-semibold">Tiếp nhận phiên để xem toàn bộ ngữ cảnh AI và trả lời khách.</p>
                  </div>
                )}
                {messages.map(message => {
                  if (message.sendertype === 'system') {
                    return (
                      <p key={message.messageid} className="text-center text-xs font-semibold text-slate-400">
                        {message.messagecontent}
                      </p>
                    );
                  }

                  const fromCustomer = message.sendertype === 'user';
                  const fromAssistant = message.sendertype === 'assistant';
                  return (
                    <div key={message.messageid} className={`flex gap-3 ${fromCustomer ? '' : 'flex-row-reverse'}`}>
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${
                        fromCustomer ? 'bg-[#e30613]' : fromAssistant ? 'bg-violet-500' : 'bg-teal-600'
                      }`}>
                        {fromCustomer ? <User size={16} /> : fromAssistant ? <Bot size={16} /> : <Headphones size={16} />}
                      </div>
                      <div className={`max-w-[78%] rounded-2xl border px-4 py-3 text-sm shadow-[0_10px_28px_rgba(15,23,42,0.06)] ${
                        fromCustomer
                          ? 'border-slate-200 bg-white text-slate-700'
                          : fromAssistant
                            ? 'border-violet-100 bg-white text-slate-700'
                            : 'border-teal-600 bg-teal-600 text-white'
                      }`}>
                        <p className="whitespace-pre-wrap">
                          <ChatLinkifiedText
                            text={message.messagecontent}
                            linkClassName={
                              fromAssistant
                                ? 'font-black text-[#c4000b] underline underline-offset-2'
                                : 'font-black text-current underline underline-offset-2'
                            }
                          />
                        </p>
                        {message.responsetype === 'comparison' && message.recommendations && (
                          <ChatComparisonTable recommendations={message.recommendations} />
                        )}

                        <p className={`mt-2 text-[10px] font-black uppercase tracking-wide ${
                          fromCustomer ? 'text-slate-400' : fromAssistant ? 'text-violet-400' : 'text-teal-100'
                        }`}>
                          {fromAssistant ? 'AI' : message.sendertype === 'consultant' ? 'Tư vấn viên' : 'Khách hàng'}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {customerTyping && activeSession.handoffstatus === 'InProgress' && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e30613] text-white">
                      <User size={16} />
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-500 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
                      Khách hàng đang nhập...
                    </div>
                  </div>
                )}
              </div>

              {viewMode === 'queue' && activeSession.handoffstatus === 'InProgress' && (
                <form onSubmit={send} className="flex gap-3 border-t border-slate-200 bg-white p-4">
                  <input
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Nhập nội dung tư vấn..."
                    className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold outline-none focus:border-teal-500 focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={busy || !input.trim()}
                    className="bg-teal-600 p-3 text-white hover:bg-teal-700 disabled:opacity-50 rounded-full flex items-center justify-center h-11 w-11 shrink-0"
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
