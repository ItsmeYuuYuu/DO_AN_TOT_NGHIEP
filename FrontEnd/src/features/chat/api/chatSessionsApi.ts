import apiClient from '../../../api/apiClient';

export interface ChatSession {
  sessionid: number;
  customerid: number | null;
  guestsessiontoken: string | null;
  starttime: string;
  endtime: string | null;
  status: string | null;
  title: string;
  assigneduserid?: number | null;
  assignedname?: string | null;
  handoffstatus?: 'Waiting' | 'InProgress' | 'Closed' | null;
  handoffrequestedat?: string | null;
  customername?: string | null;
}

export interface ChatMessage {
  messageid: number;
  sessionid: number;
  sendertype: string;
  messagecontent: string;
  sentat: string;
}

const GUEST_TOKEN_KEY = 'guest_chat_token';

export const getGuestToken = () => localStorage.getItem(GUEST_TOKEN_KEY);
export const setGuestToken = (token: string) => localStorage.setItem(GUEST_TOKEN_KEY, token);

const getHeaders = () => {
  const token = getGuestToken();
  return token ? { 'x-guest-session-token': token } : {};
};

export const chatSessionsApi = {
  getMySessions: async (): Promise<ChatSession[]> => {
    const response = await apiClient.get('/chatsessions/my', { headers: getHeaders() });
    return response.data;
  },

  createSession: async (title?: string): Promise<ChatSession> => {
    const response = await apiClient.post('/chatsessions', { title }, { headers: getHeaders() });
    const session = response.data as ChatSession;
    if (session.guestsessiontoken && !getGuestToken()) {
      setGuestToken(session.guestsessiontoken);
    }
    return session;
  },

  getSession: async (id: number): Promise<ChatSession> => {
    const response = await apiClient.get(`/chatsessions/${id}`, { headers: getHeaders() });
    return response.data;
  },

  getMessages: async (id: number): Promise<ChatMessage[]> => {
    const response = await apiClient.get(`/chatsessions/${id}/messages`, { headers: getHeaders() });
    return response.data;
  },

  postMessage: async (id: number, content: string): Promise<ChatMessage> => {
    const response = await apiClient.post(
      `/chatsessions/${id}/messages`,
      { messagecontent: content },
      { headers: getHeaders(), timeout: 120_000 },
    );
    return response.data;
  },

  requestHandoff: async (id: number): Promise<ChatSession> => {
    const response = await apiClient.post(`/chatsessions/${id}/handoff`, {}, { headers: getHeaders() });
    return response.data;
  },

  getHandoffs: async (): Promise<ChatSession[]> => {
    const response = await apiClient.get('/chatsessions/handoffs');
    return response.data;
  },

  acceptHandoff: async (id: number): Promise<ChatSession> => {
    const response = await apiClient.post(`/chatsessions/${id}/accept`);
    return response.data;
  },

  postConsultantMessage: async (id: number, content: string): Promise<ChatMessage> => {
    const response = await apiClient.post(`/chatsessions/${id}/consultant-messages`, {
      messagecontent: content,
    });
    return response.data;
  },

  closeHandoff: async (id: number): Promise<ChatSession> => {
    const response = await apiClient.post(`/chatsessions/${id}/close-handoff`);
    return response.data;
  },

  deleteSession: async (id: number): Promise<void> => {
    await apiClient.delete(`/chatsessions/${id}`, { headers: getHeaders() });
  }
};
