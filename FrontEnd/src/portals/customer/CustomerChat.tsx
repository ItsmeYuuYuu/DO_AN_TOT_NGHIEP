import { useState, useEffect, useRef } from 'react';
import { chatSessionsApi } from '../../features/chat/api/chatSessionsApi';
import type { ChatSession, ChatMessage } from '../../features/chat/api/chatSessionsApi';
import { Link, useSearchParams } from 'react-router-dom';
import { MessageSquare, Plus, Send, Trash2, Bot, User, Headphones } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';
import { ChatRecommendationCards } from '@/features/chat/components/ChatRecommendationCards';

export default function CustomerChat() {
  const [searchParams] = useSearchParams();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState(() => (searchParams.get('q') ?? '').slice(0, 500));
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchSessions = async () => {
    try {
      const data = await chatSessionsApi.getMySessions();
      setSessions(data);
      if (data.length > 0 && !activeSession) {
        selectSession(data[0]);
      }
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 404) {
        // Maybe no sessions yet for this token
      }
    }
  };

  useEffect(() => {
    fetchSessions();
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

  const createSession = async () => {
    try {
      const newSession = await chatSessionsApi.createSession('Cuộc hội thoại mới');
      setSessions([newSession, ...sessions]);
      selectSession(newSession);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteSession = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc muốn xóa cuộc hội thoại này?')) return;
    try {
      await chatSessionsApi.deleteSession(id);
      setSessions(sessions.filter(s => s.sessionid !== id));
      if (activeSession?.sessionid === id) {
        setActiveSession(null);
        setMessages([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

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
      messagecontent: inputMsg,
      sentat: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempMsg]);
    const sentContent = inputMsg;
    setInputMsg('');
    setLoading(true);
    scrollToBottom();

    try {
      const responseMessage = await chatSessionsApi.postMessage(currentSession.sessionid, sentContent);
      if (responseMessage.sendertype === 'user') {
        setMessages(await chatSessionsApi.getMessages(currentSession.sessionid));
      } else {
        setMessages(prev => [...prev, responseMessage]);
      }
      scrollToBottom();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.Message || 'Lỗi khi gửi tin nhắn');
      // Remove temp message
      setMessages(prev => prev.filter(m => m.messageid !== tempMsg.messageid));
    } finally {
      setLoading(false);
    }
  };

  const requestConsultant = async () => {
    if (!activeSession) return;
    try {
      const updated = await chatSessionsApi.requestHandoff(activeSession.sessionid);
      setActiveSession(updated);
      setSessions(prev => prev.map(item => item.sessionid === updated.sessionid ? updated : item));
      setMessages(await chatSessionsApi.getMessages(activeSession.sessionid));
      scrollToBottom();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Không thể chuyển cuộc trò chuyện cho nhân viên.');
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const renderMessageContent = (content: string) =>
    content.split(/(\/products\/\d+)/g).map((part, index) =>
      /^\/products\/\d+$/.test(part) ? (
        <Link
          key={`${part}-${index}`}
          to={part}
          className="font-semibold text-blue-600 underline underline-offset-2"
        >
          {part}
        </Link>
      ) : (
        part
      )
    );

  return (
    <div className="max-w-6xl mx-auto h-[80vh] flex bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
      {/* Sidebar */}
      <div className="w-1/3 bg-slate-50 border-r border-slate-200 flex flex-col">
        <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare size={20} className="text-blue-600" /> Lịch sử Chat
          </h2>
          <button 
            onClick={createSession}
            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
            title="Tạo hội thoại mới"
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 ? (
            <p className="text-center text-sm text-slate-400 mt-10">Chưa có cuộc hội thoại nào.</p>
          ) : (
            sessions.map(s => (
              <div 
                key={s.sessionid}
                onClick={() => selectSession(s)}
                className={`p-3 rounded-xl cursor-pointer transition flex items-start justify-between group
                  ${activeSession?.sessionid === s.sessionid ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-200 text-slate-700'}`}
              >
                <div>
                  <p className="font-semibold text-sm truncate w-48">{s.title}</p>
                  <p className={`text-xs mt-1 ${activeSession?.sessionid === s.sessionid ? 'text-blue-100' : 'text-slate-400'}`}>
                    {formatDateTime(s.starttime)}
                  </p>
                </div>
                <button 
                  onClick={(e) => deleteSession(s.sessionid, e)}
                  className={`opacity-0 group-hover:opacity-100 p-1.5 rounded transition
                    ${activeSession?.sessionid === s.sessionid ? 'hover:bg-blue-700 text-blue-200 hover:text-white' : 'hover:bg-red-100 text-slate-400 hover:text-red-600'}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="w-2/3 flex flex-col bg-slate-50/50">
        <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800">{activeSession ? activeSession.title : 'Chọn hoặc tạo hội thoại'}</h3>
            {activeSession && (
              <span className="text-xs text-slate-500">
                ID: {activeSession.sessionid}
                {activeSession.handoffstatus === 'Waiting' && ' · Đang chờ nhân viên tư vấn'}
                {activeSession.handoffstatus === 'InProgress' && ` · Đang tư vấn${activeSession.assignedname ? ` bởi ${activeSession.assignedname}` : ''}`}
                {activeSession.handoffstatus === 'Closed' && ' · Phiên tư vấn đã kết thúc'}
              </span>
            )}
          </div>
          {activeSession && !activeSession.handoffstatus && (
            <button
              type="button"
              onClick={requestConsultant}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-sm font-bold text-teal-700 hover:bg-teal-100"
            >
              <Headphones size={17} />
              Gặp nhân viên tư vấn
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!activeSession && sessions.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <Bot size={64} className="text-slate-200" />
              <p>Trợ lý ảo đang sẵn sàng hỗ trợ bạn.</p>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isUser = msg.sendertype === 'user';
            if (msg.sendertype === 'system') {
              return (
                <div key={msg.messageid || idx} className="text-center text-xs font-medium text-slate-400">
                  {msg.messagecontent}
                </div>
              );
            }
            return (
              <div key={msg.messageid || idx} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm
                  ${isUser ? 'bg-blue-600 text-white' : 'bg-emerald-500 text-white'}`}>
                  {isUser ? <User size={16} /> : msg.sendertype === 'consultant' ? <Headphones size={16} /> : <Bot size={16} />}
                </div>
                <div className={`${msg.recommendations?.length ? 'max-w-[85%]' : 'max-w-[70%]'} p-4 rounded-2xl shadow-sm
                  ${isUser ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'}`}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {renderMessageContent(msg.messagecontent)}
                  </p>
                  {msg.recommendations && msg.recommendations.length > 0 && activeSession && (
                    <ChatRecommendationCards
                      sessionId={activeSession.sessionid}
                      recommendations={msg.recommendations}
                      allowAddToCart
                    />
                  )}
                  <span className={`text-[10px] mt-2 block ${isUser ? 'text-blue-200' : 'text-slate-400'}`}>
                    {msg.sentat ? new Date(msg.sentat).toLocaleTimeString() : 'Đang gửi...'}
                  </span>
                </div>
              </div>
            );
          })}
          
          {loading && activeSession && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Bot size={16} />
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="p-4 bg-white border-t border-slate-200 flex gap-3 items-center">
          <input
            type="text"
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            placeholder="Nhập câu hỏi của bạn..."
            maxLength={500}
            className="flex-1 bg-slate-100 border-transparent rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-sm"
            disabled={loading}
          />
          <button 
            type="submit" 
            disabled={loading || !inputMsg.trim()}
            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md shadow-blue-600/20"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
