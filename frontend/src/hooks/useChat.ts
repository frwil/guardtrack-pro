'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { chatService, ChatConversation, ChatMessage } from '../services/api/chat';
import { useAuthStore } from '../stores/authStore';
import { getPusher } from '../lib/pusher';

export function useChat() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Ref pour accéder aux conversations sans stale closure dans les callbacks
  const conversationsRef = useRef<ChatConversation[]>([]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await chatService.getConversations();
      setConversations(data);
      setTotalUnread(data.reduce((sum, c) => sum + c.unreadCount, 0));
    } catch (error) {
      console.error('Erreur chargement conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: number) => {
    // Décrémenter le compteur global dès la sélection (le backend marque comme lu)
    const conv = conversationsRef.current.find(c => c.id === conversationId);
    const unreadToRemove = conv?.unreadCount ?? 0;
    if (unreadToRemove > 0) {
      setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c));
      setTotalUnread(prev => Math.max(0, prev - unreadToRemove));
    }

    setIsLoading(true);
    try {
      const data = await chatService.getConversation(conversationId);
      setCurrentConversation(data.conversation);
      setMessages(data.messages);
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (conversationId: number, content: string) => {
    try {
      const message = await chatService.sendMessage(conversationId, content);
      // Ajout local immédiat — Pusher ignorera ce message côté expéditeur (voir handler)
      setMessages(prev => [...prev, message]);
      setConversations(prev => prev.map(c =>
        c.id === conversationId
          ? { ...c, lastMessage: message, updatedAt: message.createdAt }
          : c
      ));
      return message;
    } catch (error) {
      console.error('Erreur envoi message:', error);
      throw error;
    }
  }, []);

  const createConversation = useCallback(async (participantIds: number[], roundId?: number) => {
    try {
      const conversation = await chatService.createConversation({
        participantIds,
        roundId,
        type: roundId ? 'ROUND' : 'DIRECT',
      });
      setConversations(prev => [conversation, ...prev]);
      return conversation;
    } catch (error) {
      console.error('Erreur création conversation:', error);
      throw error;
    }
  }, []);

  const getRoundConversation = useCallback(async (roundId: number) => {
    try {
      const conversation = await chatService.getRoundConversation(roundId);
      const exists = conversationsRef.current.find(c => c.id === conversation.id);
      if (!exists) setConversations(prev => [conversation, ...prev]);
      return conversation;
    } catch (error) {
      console.error('Erreur récupération conversation ronde:', error);
      throw error;
    }
  }, []);

  // Abonnement Pusher au canal de la conversation courante
  useEffect(() => {
    if (!currentConversation?.id) return;

    const pusher  = getPusher();
    const channel = pusher.subscribe(`chat-conversation-${currentConversation.id}`);

    // S'assurer qu'il n'y a qu'un seul handler (protection contre les double-mount StrictMode)
    channel.unbind('new-message');
    channel.unbind('pusher:subscription_succeeded');
    channel.unbind('pusher:subscription_error');

    channel.bind('pusher:subscription_succeeded', () => setIsConnected(true));
    channel.bind('pusher:subscription_error',     () => setIsConnected(false));

    channel.bind('new-message', (data: { conversationId: number; message: ChatMessage }) => {
      const { conversationId, message } = data;

      // Ignorer les messages envoyés par l'utilisateur courant :
      // ils sont déjà ajoutés localement dans sendMessage()
      if (message.sender?.id === user?.id) return;

      if (currentConversation?.id === conversationId) {
        setMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }

      setConversations(prev => prev.map(c =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: message,
              updatedAt: message.createdAt,
              // Pas de +1 si la conversation est ouverte (messages déjà lus)
              unreadCount: currentConversation?.id === conversationId ? 0 : c.unreadCount + 1,
            }
          : c
      ));

      if (currentConversation?.id !== conversationId) {
        setTotalUnread(prev => prev + 1);
      }
    });

    return () => {
      channel.unbind('new-message');
      pusher.unsubscribe(`chat-conversation-${currentConversation.id}`);
      setIsConnected(false);
    };
  }, [currentConversation?.id, user?.id]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    currentConversation,
    messages,
    isLoading,
    totalUnread,
    isConnected,
    loadConversations,
    loadMessages,
    sendMessage,
    createConversation,
    getRoundConversation,
    setCurrentConversation,
  };
}
