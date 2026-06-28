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
  recommendations?: ChatRecommendation[];
  responsetype?: 'text' | 'clarification' | 'recommendation' | 'comparison' | null;
  quickreplies?: string[];
}

export interface ChatRecommendation {
  recommendationid: number;
  productid: number;
  productslug?: string | null;
  variantid: number;
  productname: string;
  variantname: string;
  sku: string;
  imageurl: string;
  price: number;
  baseprice: number;
  stock: number;
  condition: string;
  rank: number;
  addedtocartat?: string | null;
  orderedat?: string | null;
  orderid?: number | null;
  brand: string;
  specifications: string;
}

export interface ChatRecommendationMetrics {
  totalrecommendations: number;
  addedtocart: number;
  ordered: number;
  addtocartrate: number;
  orderrate: number;
  topproducts: Array<{
    productid: number;
    productname: string;
    recommended: number;
    addedtocart: number;
    ordered: number;
  }>;
}

export interface ChatTypingStatus {
  userTyping: boolean;
  consultantTyping: boolean;
}

const GUEST_TOKEN_KEY = 'ec_guest_checkout_token';
const LEGACY_GUEST_TOKEN_KEY = 'guest_chat_token';

export const getGuestToken = () =>
  localStorage.getItem(GUEST_TOKEN_KEY) ?? localStorage.getItem(LEGACY_GUEST_TOKEN_KEY);
export const setGuestToken = (token: string) => {
  localStorage.setItem(GUEST_TOKEN_KEY, token);
  localStorage.removeItem(LEGACY_GUEST_TOKEN_KEY);
};

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

  setTyping: async (id: number): Promise<void> => {
    await apiClient.post(`/chatsessions/${id}/typing`, {}, { headers: getHeaders() });
  },

  getTypingStatus: async (id: number): Promise<ChatTypingStatus> => {
    const response = await apiClient.get(`/chatsessions/${id}/typing-status`, { headers: getHeaders() });
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

  getRecommendationMetrics: async (days = 30): Promise<ChatRecommendationMetrics> => {
    const response = await apiClient.get('/chatsessions/recommendation-metrics', {
      params: { days },
    });
    return response.data;
  },

  markRecommendationAddedToCart: async (
    sessionId: number,
    recommendationId: number,
  ): Promise<ChatRecommendation> => {
    const response = await apiClient.post(
      `/chatsessions/${sessionId}/recommendations/${recommendationId}/added-to-cart`,
      {},
      { headers: getHeaders() },
    );
    return response.data;
  },

  deleteSession: async (id: number): Promise<void> => {
    await apiClient.delete(`/chatsessions/${id}`, { headers: getHeaders() });
  }
};
