'use client';

import { useState, useEffect, useCallback } from 'react';
import { chatService, ChatConversation, ChatMessage } from '../services/api/chat';

export function useChat() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  // Charger les conversations
  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await chatService.getConversations();
      setConversations(data);
      const unread = data.reduce((sum, c) => sum + c.unreadCount, 0);
      setTotalUnread(unread);
    } catch (error) {
      console.error('Erreur chargement conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Charger les messages d'une conversation
  const loadMessages = useCallback(async (conversationId: number) => {
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

  // Envoyer un message
  const sendMessage = useCallback(async (conversationId: number, content: string) => {
    try {
      const message = await chatService.sendMessage(conversationId, content);
      setMessages(prev => [...prev, message]);
      
      // Mettre à jour la conversation dans la liste
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

  // Créer une conversation
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

  // Obtenir ou créer la conversation d'une ronde
  const getRoundConversation = useCallback(async (roundId: number) => {
    try {
      const conversation = await chatService.getRoundConversation(roundId);
      
      // Vérifier si elle existe déjà dans la liste
      const exists = conversations.find(c => c.id === conversation.id);
      if (!exists) {
        setConversations(prev => [conversation, ...prev]);
      }
      
      return conversation;
    } catch (error) {
      console.error('Erreur récupération conversation ronde:', error);
      throw error;
    }
  }, [conversations]);

  // Connexion Mercure pour les messages en temps réel
  useEffect(() => {
    const hubUrl = process.env.NEXT_PUBLIC_MERCURE_HUB_URL || 'http://localhost:3001/.well-known/mercure';
    const es = new EventSource(`${hubUrl}?topic=/chat/conversations/{id}`);
    
    es.onopen = () => setIsConnected(true);
    es.onerror = () => setIsConnected(false);
    
    es.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'chat_message') {
          const message = data.message as ChatMessage;
          
          // Mettre à jour les messages si c'est la conversation courante
          if (currentConversation?.id === message.conversationId) {
            setMessages(prev => [...prev, message]);
          }
          
          // Mettre à jour la liste des conversations
          setConversations(prev => prev.map(c => 
            c.id === message.conversationId 
              ? { 
                  ...c, 
                  lastMessage: message, 
                  updatedAt: message.createdAt,
                  unreadCount: currentConversation?.id === message.conversationId 
                    ? c.unreadCount 
                    : c.unreadCount + 1 
                }
              : c
          ));
          
          // Mettre à jour le compteur non lu
          if (currentConversation?.id !== message.conversationId) {
            setTotalUnread(prev => prev + 1);
          }
        }
      } catch (error) {
        console.error('Erreur parsing message Mercure:', error);
      }
    });
    
    setEventSource(es);
    
    return () => {
      es.close();
    };
  }, [currentConversation]);

  // Charger les conversations au démarrage
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