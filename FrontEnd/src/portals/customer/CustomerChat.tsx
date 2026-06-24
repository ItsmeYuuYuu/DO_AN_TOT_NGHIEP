import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Bot,
  Camera,
  Headphones,
  MessageSquare,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  User,
  Zap,
} from 'lucide-react';
import { chatSessionsApi } from '../../features/chat/api/chatSessionsApi';
import type { ChatMessage, ChatSession } from '../../features/chat/api/chatSessionsApi';
import { ChatComparisonTable } from '@/features/chat/components/ChatComparisonTable';
import { ChatRecommendationCards } from '@/features/chat/components/ChatRecommendationCards';
import { formatDateTime } from '../../utils/formatters';
import { getApiErrorMessage } from '@/utils/apiError';
import { confirmAction, notifyError } from '@/utils/notifications';


const quickPrompts = [
  { label: 'Chụp ảnh đẹp', prompt: 'Tôi cần điện thoại chụp ảnh đẹp trong tầm giá hợp lý', icon: Camera },
  { label: 'Pin dùng lâu', prompt: 'Gợi ý điện thoại pin lâu, sạc nhanh, dùng cả ngày', icon: Zap },
  { label: 'Chơi game', prompt: 'Tôi cần điện thoại chơi game mượt, máy mát, RAM tốt', icon: Sparkles },
  { label: 'So sánh 3 máy', prompt: 'So sánh 3 điện thoại đáng mua theo giá, camera, pin và cấu hình', icon: Search },
];

export default function CustomerChat() {
  const [searchParams] = useSearchParams();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState(() => (searchParams.get('q') ?? '').slice(0, 500));
  const [loading, setLoading] = useState(false);
  const messagesPaneRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    window.setTimeout(() => {
      const pane = messagesPaneRef.current;
      if (pane) {
        pane.scrollTo({ top: pane.scrollHeight, behavior: 'smooth' });
        return;
      }
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const selectSession = async (session: ChatSession) => {
    setActiveSession(session);
    setLoading(true);
    try {
      const msgs = await chatSessionsApi.getMessages(session.sessionid);
      setMessages(msgs);
      scrollToBottom();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const data = await chatSessionsApi.getMySessions();
      setSessions(data);
      if (data.length > 0 && !activeSession) {
        await selectSession(data[0]);
      }
    } catch {
      // A new account may not have any chat sessions yet.
    }
  };

  useEffect(() => {
    void fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeSession?.handoffstatus || activeSession.handoffstatus === 'Closed') return;

    const timer = window.setInterval(async () => {
      try {
        const [session, latestMessages] = await Promise.all([
          chatSessionsApi.getSession(activeSession.sessionid),
          chatSessionsApi.getMessages(activeSession.sessionid),
        ]);
        setActiveSession(session);
        setSessions(prev => prev.map(item => item.sessionid === session.sessionid ? session : item));
        setMessages(latestMessages);
      } catch {
        // Ignore transient polling errors and keep the conversation visible.
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [activeSession?.sessionid, activeSession?.handoffstatus]);

  const createSession = async () => {
    try {
      const newSession = await chatSessionsApi.createSession('Cuộc hội thoại mới');
      setSessions([newSession, ...sessions]);
      await selectSession(newSession);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteSession = async (id: number, event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    if (!(await confirmAction('Bạn có chắc muốn xóa cuộc hội thoại này?', { danger: true, confirmLabel: 'Xóa' }))) return;
    try {
      await chatSessionsApi.deleteSession(id);
      setSessions(current => current.filter(session => session.sessionid !== id));
      if (activeSession?.sessionid === id) {
        setActiveSession(null);
        setMessages([]);
      }
    } catch (err) {
      console.error(err);
      notifyError(getApiErrorMessage(err, 'Không thể xóa cuộc hội thoại này.'));
    }
  };

  const submitMessage = async (content: string) => {
    if (!content.trim() || loading) return;

    let currentSession = activeSession;
    if (!currentSession) {
      currentSession = await chatSessionsApi.createSession('Hội thoại mới');
      setSessions([currentSession, ...sessions]);
      setActiveSession(currentSession);
    }

    const tempMsg: ChatMessage = {
      messageid: Date.now(),
      sessionid: currentSession.sessionid,
      sendertype: 'user',
      messagecontent: content,
      sentat: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempMsg]);
    setInputMsg('');
    setLoading(true);
    scrollToBottom();

    try {
      const responseMessage = await chatSessionsApi.postMessage(currentSession.sessionid, content.trim());
      if (responseMessage.sendertype === 'user') {
        setMessages(await chatSessionsApi.getMessages(currentSession.sessionid));
      } else {
        setMessages(prev => [...prev, responseMessage]);
      }
      scrollToBottom();
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Lỗi khi gửi tin nhắn'));
      setMessages(prev => prev.filter(message => message.messageid !== tempMsg.messageid));
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    await submitMessage(inputMsg);
  };

  const requestConsultant = async () => {
    if (!activeSession) return;
    try {
      const updated = await chatSessionsApi.requestHandoff(activeSession.sessionid);
      setActiveSession(updated);
      setSessions(prev => prev.map(item => item.sessionid === updated.sessionid ? updated : item));
      setMessages(await chatSessionsApi.getMessages(activeSession.sessionid));
      scrollToBottom();
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Không thể chuyển cuộc trò chuyện cho nhân viên.'));
    }
  };

  const renderMessageContent = (content: string) =>
    content.split(/(\/products\/\d+)/g).map((part, index) =>
      /^\/products\/\d+$/.test(part) ? (
        <Link
          key={`${part}-${index}`}
          to={part}
          className="font-black text-[#c4000b] underline underline-offset-2"
        >
          {part}
        </Link>
      ) : (
        part
      ),
    );

  const renderAssistantMessageContent = (content: string) => {
    const lines = content.split('\n');

    return (
      <div className="space-y-2 text-sm leading-7">
        {lines.map((line, index) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={`gap-${index}`} className="h-1" />;
          }

          const isReason = trimmed.toLowerCase().startsWith('lý do gợi ý:');
          const isProductTitle = /^\d+\.\s+/.test(trimmed);
          const isVariantLine = /^-\s+/.test(trimmed);

          if (isReason) {
            return (
              <div
                key={`${trimmed}-${index}`}
                className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] font-semibold text-amber-900"
              >
                {renderMessageContent(trimmed)}
              </div>
            );
          }

          return (
            <div
              key={`${trimmed}-${index}`}
              className={
                isProductTitle
                  ? 'pt-1 font-black text-slate-900'
                  : isVariantLine
                    ? 'pl-3 text-slate-700'
                    : 'text-slate-700'
              }
            >
              {renderMessageContent(trimmed)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="customer-shell px-0 py-0 md:px-4 md:py-6">
      <div className="customer-container grid h-[calc(100dvh-8.75rem)] min-h-[460px] overflow-hidden border border-[#e5e7eb] bg-[#ffffff] shadow-[0_18px_45px_rgba(15,23,42,0.08)] md:h-[calc(100vh-12rem)] md:min-h-[560px] md:max-h-[calc(100vh-8rem)] md:rounded-[28px] lg:grid-cols-[320px_1fr]">
        <aside className="hidden min-h-0 border-r border-[#e5e7eb] bg-white lg:flex lg:flex-col">
          <div className="border-b border-[#e5e7eb] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="customer-label">AI history</p>
                <h2 className="mt-1 flex items-center gap-2 text-xl font-black text-[#1f2937]">
                  <MessageSquare size={19} /> Lịch sử chat
                </h2>
              </div>
              <button
                type="button"
                onClick={createSession}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1f2937] text-white hover:bg-[#c4000b]"
                title="Tạo hội thoại mới"
              >
                <Plus size={19} />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {sessions.length === 0 ? (
              <div className="border border-dashed border-[#e5e7eb] px-4 py-10 text-center text-sm text-slate-400">
                Chưa có cuộc hội thoại nào.
              </div>
            ) : (
              sessions.map(session => (
                <div
                  key={session.sessionid}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectSession(session)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      void selectSession(session);
                    }
                  }}
                  className={`group flex w-full items-start justify-between gap-3 border p-3 text-left transition ${
                    activeSession?.sessionid === session.sessionid
                      ? 'border-[#e30613] bg-[#e30613] text-white shadow-[0_12px_28px_rgba(227,6,19,0.18)]'
                      : 'border-[#e5e7eb] bg-[#ffffff] text-[#1f2937] hover:border-[#1f2937]'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">{session.title}</span>
                    <span className={`mt-1 block text-xs ${
                      activeSession?.sessionid === session.sessionid ? 'text-white/55' : 'text-slate-400'
                    }`}>
                      {formatDateTime(session.starttime)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={event => deleteSession(session.sessionid, event)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.stopPropagation();
                      }
                    }}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center opacity-0 transition group-hover:opacity-100 focus:opacity-100 ${
                      activeSession?.sessionid === session.sessionid ? 'text-white/60 hover:text-white' : 'text-slate-300 hover:text-red-600'
                    }`}
                    title="Xóa cuộc hội thoại"
                    aria-label="Xóa cuộc hội thoại"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col">
          <header className="shrink-0 border-b border-[#e5e7eb] bg-white p-3 md:p-5">
            <div className="mb-4 lg:hidden">
              <div className="mb-2 flex items-center justify-between">
                <p className="customer-label">Lịch sử chat</p>
                <button
                  type="button"
                  onClick={createSession}
                  className="inline-flex items-center gap-2 rounded-full bg-[#1f2937] px-3 py-2 text-xs font-black text-white"
                >
                  <Plus size={14} /> Mới
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {sessions.length === 0 ? (
                  <span className="shrink-0 rounded-full border border-dashed border-[#e5e7eb] px-4 py-2 text-xs font-bold text-slate-400">
                    Chưa có hội thoại
                  </span>
                ) : (
                  sessions.map(session => (
                    <button
                      key={session.sessionid}
                      type="button"
                      onClick={() => selectSession(session)}
                      className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black ${
                        activeSession?.sessionid === session.sessionid
                          ? 'border-[#e30613] bg-[#e30613] text-white'
                          : 'border-[#e5e7eb] bg-white text-[#1f2937]'
                      }`}
                    >
                      {session.title}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start md:gap-4">
              <div>
                <p className="customer-label">AI consultation</p>
                <h1 className="customer-display mt-1 line-clamp-2 text-2xl font-bold text-[#1f2937] sm:text-3xl">
                  {activeSession ? activeSession.title : 'Tư vấn chọn điện thoại'}
                </h1>
                {activeSession && (
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    ID: {activeSession.sessionid}
                    {activeSession.handoffstatus === 'Waiting' && ' · Đang chờ nhân viên tư vấn'}
                    {activeSession.handoffstatus === 'InProgress' && ` · Đang tư vấn${activeSession.assignedname ? ` bởi ${activeSession.assignedname}` : ''}`}
                    {activeSession.handoffstatus === 'Closed' && ' · Phiên tư vấn đã kết thúc'}
                  </p>
                )}
              </div>
              {activeSession && !activeSession.handoffstatus && (
                <button
                  type="button"
                  onClick={requestConsultant}
                  className="customer-button-outline"
                >
                  <Headphones size={16} /> Gặp nhân viên tư vấn
                </button>
              )}
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 md:mt-5">
              {quickPrompts.map(({ label, prompt, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => submitMessage(prompt)}
                  disabled={loading}
                  className="inline-flex shrink-0 items-center gap-2 border border-[#e5e7eb] bg-[#ffffff] px-3 py-2 text-xs font-black text-[#1f2937] hover:border-[#1f2937] disabled:opacity-50"
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </header>

          <div ref={messagesPaneRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#f3f4f6] p-3 md:space-y-6 md:p-6">
            {!activeSession && sessions.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#1f2937] text-[#ffd166]">
                  <Bot size={42} />
                </div>
                <h2 className="customer-display text-3xl font-bold text-[#1f2937]">
                  Trợ lý mua sắm đã sẵn sàng
                </h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
                  Hỏi theo nhu cầu, ngân sách hoặc sản phẩm bạn đang phân vân. AI sẽ lọc từ dữ liệu thật của cửa hàng.
                </p>
              </div>
            )}

            {messages.map((message, index) => {
              const isUser = message.sendertype === 'user';
              if (message.sendertype === 'system') {
                return (
                  <div key={message.messageid || index} className="text-center text-xs font-bold text-slate-400">
                    {message.messagecontent}
                  </div>
                );
              }

              return (
                <div key={message.messageid || index} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center ${
                      isUser ? 'rounded-[22px] bg-[#e30613] text-white' : 'rounded-[22px] bg-[#1f2937] text-[#ffd166]'
                  }`}>
                    {isUser ? <User size={16} /> : message.sendertype === 'consultant' ? <Headphones size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`${message.recommendations?.length ? 'max-w-[88vw] md:max-w-[92%]' : 'max-w-[82%] md:max-w-[76%]'} border p-3 md:p-4 ${
                    isUser
                      ? 'border-[#e30613] bg-[#e30613] text-white'
                      : 'border-[#e5e7eb] bg-white text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.08)]'
                  }`}>
                    {isUser ? (
                      <p className="whitespace-pre-wrap text-sm leading-7">
                        {renderMessageContent(message.messagecontent)}
                      </p>
                    ) : (
                      renderAssistantMessageContent(message.messagecontent)
                    )}

                    {message.responsetype === 'comparison' && message.recommendations && (
                      <ChatComparisonTable recommendations={message.recommendations} />
                    )}

                    {message.recommendations && message.recommendations.length > 0 && activeSession && (
                      <>
                        {message.responsetype === 'comparison' && (
                          <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                            Chọn mua nhanh
                          </p>
                        )}
                        <ChatRecommendationCards
                          sessionId={activeSession.sessionid}
                          recommendations={message.recommendations}
                          allowAddToCart
                        />
                      </>
                    )}

                    {!isUser &&
                      index === messages.length - 1 &&
                      message.quickreplies &&
                      message.quickreplies.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.quickreplies.map(reply => (
                            <button
                              key={reply}
                              type="button"
                              disabled={loading}
                              onClick={() => submitMessage(reply)}
                              className="border border-[#ffd166] bg-[#ffd166]/20 px-3 py-1.5 text-xs font-black text-[#1f2937] transition hover:bg-[#ffd166] disabled:opacity-50"
                            >
                              {reply}
                            </button>
                          ))}
                        </div>
                      )}

                    <span className={`mt-2 block text-[10px] ${isUser ? 'text-white/60' : 'text-slate-400'}`}>
                      {message.sentat ? new Date(message.sentat).toLocaleTimeString() : 'Đang gửi...'}
                    </span>
                  </div>
                </div>
              );
            })}

            {loading && activeSession && (
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1f2937] text-[#ffd166]">
                  <Bot size={16} />
                </div>
                <div className="flex items-center gap-2 rounded-[22px] border border-[#e5e7eb] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-[#1f2937]" style={{ animationDelay: '0ms' }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-[#1f2937]" style={{ animationDelay: '150ms' }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-[#1f2937]" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="shrink-0 flex items-center gap-2 border-t border-[#e5e7eb] bg-white p-3 md:gap-3 md:p-4">
            <input
              type="text"
              value={inputMsg}
              onChange={event => setInputMsg(event.target.value)}
              placeholder="Nhập nhu cầu, ngân sách hoặc tên máy bạn muốn so sánh..."
              maxLength={500}
              className="customer-input"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !inputMsg.trim()}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e30613] text-white transition hover:bg-[#c4000b] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Send size={20} />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
