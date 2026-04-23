import { apiClient } from './client';

export interface ChatParticipant {
  id: number;
  fullName: string;
  role: string;
}

export interface ChatConversation {
  id: number;
  title: string | null;
  displayName: string;
  type: 'GLOBAL' | 'ROUND' | 'DIRECT';
  round: { id: number; name: string } | null;
  participants: ChatParticipant[];
  createdBy: { id: number; fullName: string };
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  lastMessage?: ChatMessage;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  sender: { id: number; fullName: string; role: string };
  content: string;
  isRead: boolean;
  createdAt: string;
}

export const chatService = {
  async getConversations(): Promise<ChatConversation[]> {
    const response = await apiClient.get<ChatConversation[]>('/chat/conversations');
    return response.data || [];
  },

  async getConversation(id: number, options?: { limit?: number; before?: string }): Promise<{ conversation: ChatConversation; messages: ChatMessage[] }> {
    const query = new URLSearchParams(options as Record<string, string>).toString();
    const response = await apiClient.get<{ conversation: ChatConversation; messages: ChatMessage[] }>(`/chat/conversations/${id}${query ? `?${query}` : ''}`);
    return response.data || { conversation: null as any, messages: [] };
  },

  async createConversation(data: { type?: string; participantIds: number[]; roundId?: number; title?: string }): Promise<ChatConversation> {
    const response = await apiClient.post<ChatConversation>('/chat/conversations', data);
    return response.data!;
  },

  async sendMessage(conversationId: number, content: string): Promise<ChatMessage> {
    const response = await apiClient.post<ChatMessage>(`/chat/conversations/${conversationId}/messages`, { content });
    return response.data!;
  },

  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<{ unread: number }>('/chat/unread-count');
    return response.data?.unread || 0;
  },

  async getRoundConversation(roundId: number): Promise<ChatConversation> {
    const response = await apiClient.get<ChatConversation>(`/chat/round/${roundId}/conversation`);
    return response.data!;
  },
};