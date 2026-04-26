'use client';

import { useState, useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat';
import { useAuthStore } from '../stores/authStore';
import { usersService } from '../services/api/users';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faComment,
  faTimes,
  faPaperPlane,
  faSpinner,
  faCircle,
  faUsers,
  faUser,
  faChevronLeft,
  faPlus,
  faSearch,
} from '@fortawesome/free-solid-svg-icons';
import type { User } from '../types/index';

export function ChatWidget() {
  const { user } = useAuthStore();
  const {
    conversations,
    currentConversation,
    messages,
    isLoading,
    totalUnread,
    isConnected,
    loadMessages,
    sendMessage,
    createConversation,
    setCurrentConversation,
  } = useChat();

  const [isOpen, setIsOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showNewConv, setShowNewConv] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSelectConversation = (conversationId: number) => {
    loadMessages(conversationId);
  };

  const handleOpenNewConv = async () => {
    setShowNewConv(true);
    setUserSearch('');
    setIsLoadingUsers(true);
    try {
      const users = await usersService.list({ isActive: true });
      setAvailableUsers(users.filter(u => u.id !== user?.id));
    } catch {
      setAvailableUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleStartConversation = async (targetUser: User) => {
    // Chercher une conversation DIRECT existante avec cet utilisateur
    const existing = conversations.find(
      c => c.type === 'DIRECT' && c.participants?.some(p => p.id === targetUser.id)
    );
    if (existing) {
      setShowNewConv(false);
      loadMessages(existing.id);
      return;
    }
    try {
      const conv = await createConversation([targetUser.id]);
      setShowNewConv(false);
      loadMessages(conv.id);
    } catch {
      // silencieux
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentConversation || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(currentConversation.id, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Erreur envoi message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Aujourd\'hui';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Grouper les messages par date
  const groupedMessages: { date: string; messages: typeof messages }[] = [];
  let currentDate = '';
  
  messages.forEach(message => {
    const messageDate = new Date(message.createdAt).toDateString();
    if (messageDate !== currentDate) {
      currentDate = messageDate;
      groupedMessages.push({ date: message.createdAt, messages: [] });
    }
    groupedMessages[groupedMessages.length - 1].messages.push(message);
  });

  return (
    <>
      {/* Bouton d'ouverture */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-40 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
      >
        <FontAwesomeIcon icon={faComment} className="text-xl" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
        {isConnected && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
        )}
      </button>

      {/* Fenêtre de chat */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-96 h-[600px] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col">
          {/* En-tête */}
          <div className="p-4 border-b flex items-center justify-between bg-indigo-600 text-white rounded-t-lg">
            <div className="flex items-center">
              {(currentConversation || showNewConv) && (
                <button
                  onClick={() => { setCurrentConversation(null); setShowNewConv(false); }}
                  className="mr-2 hover:text-gray-200"
                >
                  <FontAwesomeIcon icon={faChevronLeft} />
                </button>
              )}
              <h3 className="font-semibold">
                {showNewConv ? 'Nouvelle conversation' : currentConversation ? currentConversation.displayName : 'Messages'}
              </h3>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              {!currentConversation && !showNewConv && (
                <button onClick={handleOpenNewConv} className="hover:text-gray-200" title="Nouvelle conversation">
                  <FontAwesomeIcon icon={faPlus} />
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="hover:text-gray-200">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          </div>

          {showNewConv ? (
            // Sélection d'un utilisateur pour démarrer une conversation
            <div className="flex-1 overflow-y-auto flex flex-col">
              <div className="p-3 border-b">
                <div className="relative">
                  <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Rechercher un utilisateur..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              {isLoadingUsers ? (
                <div className="flex items-center justify-center flex-1">
                  <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-gray-400" />
                </div>
              ) : (
                <div className="divide-y overflow-y-auto">
                  {availableUsers
                    .filter(u =>
                      userSearch === '' ||
                      `${u.firstName} ${u.lastName}`.toLowerCase().includes(userSearch.toLowerCase()) ||
                      u.email?.toLowerCase().includes(userSearch.toLowerCase())
                    )
                    .map(u => (
                      <button
                        key={u.id}
                        onClick={() => handleStartConversation(u)}
                        className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                            <span className="text-indigo-600 font-medium text-sm">
                              {u.firstName?.[0]}{u.lastName?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-gray-500">{u.role}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  {availableUsers.filter(u =>
                    userSearch === '' ||
                    `${u.firstName} ${u.lastName}`.toLowerCase().includes(userSearch.toLowerCase())
                  ).length === 0 && (
                    <p className="text-center text-gray-500 text-sm p-8">Aucun utilisateur trouvé</p>
                  )}
                </div>
              )}
            </div>
          ) : !currentConversation ? (
            // Liste des conversations
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-gray-400" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                  <FontAwesomeIcon icon={faComment} className="text-4xl text-gray-300 mb-3" />
                  <p className="text-center text-sm">Aucune conversation</p>
                  <button
                    onClick={handleOpenNewConv}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                  >
                    Démarrer une conversation
                  </button>
                </div>
              ) : (
                <div className="divide-y">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                            <FontAwesomeIcon
                              icon={conv.type === 'ROUND' ? faUsers : faUser}
                              className="text-indigo-600"
                            />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{conv.displayName}</p>
                            {conv.lastMessage && (
                              <p className="text-sm text-gray-500 truncate max-w-[200px]">
                                {conv.lastMessage.sender.id === user?.id ? 'Vous : ' : ''}
                                {conv.lastMessage.content}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {conv.lastMessage && (
                            <p className="text-xs text-gray-400">
                              {formatTime(conv.lastMessage.createdAt)}
                            </p>
                          )}
                          {conv.unreadCount > 0 && (
                            <span className="inline-block mt-1 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Conversation active
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-gray-400" />
                  </div>
                ) : (
                  groupedMessages.map((group, groupIdx) => (
                    <div key={groupIdx}>
                      <div className="text-center mb-3">
                        <span className="text-xs bg-gray-200 text-gray-600 px-3 py-1 rounded-full">
                          {formatDate(group.date)}
                        </span>
                      </div>
                      {group.messages.map((message) => {
                        const isOwn = message.sender.id === user?.id;
                        return (
                          <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] ${isOwn ? 'order-2' : 'order-1'}`}>
                              {!isOwn && (
                                <p className="text-xs text-gray-500 mb-1 ml-1">{message.sender.fullName}</p>
                              )}
                              <div className={`rounded-lg px-4 py-2 ${
                                isOwn 
                                  ? 'bg-indigo-600 text-white rounded-br-none' 
                                  : 'bg-gray-100 text-gray-900 rounded-bl-none'
                              }`}>
                                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                              </div>
                              <p className="text-xs text-gray-400 mt-1 text-right">
                                {formatTime(message.createdAt)}
                                {isOwn && (
                                  <FontAwesomeIcon 
                                    icon={faCircle} 
                                    className={`ml-1 text-[6px] ${message.isRead ? 'text-blue-500' : 'text-gray-300'}`}
                                    title={message.isRead ? 'Lu' : 'Non lu'}
                                  />
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t flex items-center space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Écrivez votre message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isSending}
                  className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <FontAwesomeIcon icon={faSpinner} spin />
                  ) : (
                    <FontAwesomeIcon icon={faPaperPlane} />
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}