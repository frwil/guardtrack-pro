'use client';

import { useState, useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from '../contexts/I18nContext';
import { usersService } from '../services/api/users';
import {
  translateText, encodeTranslatedMessage, decodeTranslatedMessage,
  LANGUAGE_NAMES, SupportedLanguage,
} from '../services/ai/translate';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faComment, faTimes, faPaperPlane, faSpinner, faCircle,
  faUsers, faUser, faChevronLeft, faPlus, faSearch, faLanguage, faGripVertical,
} from '@fortawesome/free-solid-svg-icons';
import type { User } from '../types/index';
import type { ChatMessage } from '../services/api/chat';

const TRANSLATE_LANGS: Array<{ code: SupportedLanguage; flag: string }> = [
  { code: 'fr', flag: '🇫🇷' },
  { code: 'en', flag: '🇬🇧' },
  { code: 'es', flag: '🇪🇸' },
  { code: 'de', flag: '🇩🇪' },
  { code: 'it', flag: '🇮🇹' },
  { code: 'pt', flag: '🇵🇹' },
  { code: 'ar', flag: '🇸🇦' },
];

export function ChatWidget() {
  const { user } = useAuthStore();
  const { t, locale } = useTranslation();
  const {
    conversations, currentConversation, messages, isLoading,
    totalUnread, isConnected,
    loadMessages, sendMessage, createConversation, setCurrentConversation,
  } = useChat();

  // UI
  const [isOpen, setIsOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showNewConv, setShowNewConv] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Position déplaçable
  const [pos, setPos] = useState({ bottom: 16, right: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; b: number; r: number } | null>(null);

  const onDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStart.current = { x: cx, y: cy, b: pos.bottom, r: pos.right };
    setIsDragging(true);

    const move = (ev: MouseEvent | TouchEvent) => {
      if (!dragStart.current) return;
      const mx = 'touches' in ev ? (ev as TouchEvent).touches[0].clientX : (ev as MouseEvent).clientX;
      const my = 'touches' in ev ? (ev as TouchEvent).touches[0].clientY : (ev as MouseEvent).clientY;
      setPos({
        bottom: Math.max(8, Math.min(window.innerHeight - 72, dragStart.current.b - (my - dragStart.current.y))),
        right:  Math.max(8, Math.min(window.innerWidth  - 64, dragStart.current.r - (mx - dragStart.current.x))),
      });
    };
    const up = () => {
      dragStart.current = null;
      setIsDragging(false);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
  };

  // Traduction sortante
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [pendingTr, setPendingTr] = useState<{
    targetLang: SupportedLanguage;
    translated: string;
    isTranslating: boolean;
  } | null>(null);

  // Traduction à la demande (messages reçus)
  const [localTr, setLocalTr] = useState<Map<number, string>>(new Map());
  const [showOrigFor, setShowOrigFor] = useState<Set<number>>(new Set());
  const [trLoadingId, setTrLoadingId] = useState<number | null>(null);

  useEffect(() => {
    if (currentConversation && inputRef.current) inputRef.current.focus();
  }, [currentConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (pendingTr) setPendingTr(null);
  };

  // Traduction sortante : sélection de la langue cible
  const handlePickLang = async (lang: SupportedLanguage) => {
    const text = newMessage.trim();
    if (!text) return;
    setShowLangPicker(false);
    setPendingTr({ targetLang: lang, translated: '', isTranslating: true });
    try {
      const translated = await translateText(text, locale as SupportedLanguage, lang);
      setPendingTr(prev => prev ? { ...prev, translated, isTranslating: false } : null);
    } catch {
      setPendingTr(null);
    }
  };

  // Traduction à la demande d'un message reçu
  const handleTranslateReceived = async (message: ChatMessage) => {
    setTrLoadingId(message.id);
    try {
      const translated = await translateText(message.content, 'auto', locale as SupportedLanguage);
      setLocalTr(prev => new Map(prev).set(message.id, translated));
    } catch {
      // silencieux
    } finally {
      setTrLoadingId(null);
    }
  };

  const toggleOriginal = (id: number) => {
    setShowOrigFor(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectConversation = (id: number) => loadMessages(id);

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
    const existing = conversations.find(
      c => c.type === 'DIRECT' && c.participants?.some(p => p.id === targetUser.id)
    );
    if (existing) { setShowNewConv(false); loadMessages(existing.id); return; }
    try {
      const conv = await createConversation([targetUser.id]);
      setShowNewConv(false);
      loadMessages(conv.id);
    } catch {}
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentConversation || isSending) return;

    let content = newMessage.trim();
    if (pendingTr?.translated && !pendingTr.isTranslating) {
      content = encodeTranslatedMessage({
        original: newMessage.trim(),
        translated: pendingTr.translated,
        fromLang: locale as SupportedLanguage,
        toLang: pendingTr.targetLang,
      });
    }

    setIsSending(true);
    try {
      await sendMessage(currentConversation.id, content);
      setNewMessage('');
      setPendingTr(null);
      setShowLangPicker(false);
    } catch (error) {
      console.error('Erreur envoi message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return t('chat.today');
    if (date.toDateString() === yesterday.toDateString()) return t('chat.yesterday');
    return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' });
  };

  // Grouper les messages par date
  const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
  let currentDate = '';
  messages.forEach(message => {
    const messageDate = new Date(message.createdAt).toDateString();
    if (messageDate !== currentDate) {
      currentDate = messageDate;
      groupedMessages.push({ date: message.createdAt, messages: [] });
    }
    groupedMessages[groupedMessages.length - 1].messages.push(message);
  });

  // Rendu du contenu d'un message selon son type
  const renderContent = (message: ChatMessage, isOwn: boolean) => {
    const encoded = decodeTranslatedMessage(message.content);
    const localTranslated = localTr.get(message.id);
    const showOrig = showOrigFor.has(message.id);
    const isTranslatingThis = trLoadingId === message.id;

    const toggleBtn = (label: string) => (
      <button
        onClick={() => toggleOriginal(message.id)}
        className={`flex items-center gap-1 text-[10px] font-medium mt-1 transition-colors ${
          isOwn ? 'text-indigo-200 hover:text-white' : 'text-gray-400 hover:text-indigo-600'
        }`}
      >
        <FontAwesomeIcon icon={faLanguage} />
        {label}
      </button>
    );

    // Message avec traduction intégrée (__TR__ encodé)
    if (encoded) {
      return (
        <div>
          <p className="text-sm whitespace-pre-wrap break-words">
            {showOrig ? encoded.original : encoded.translated}
          </p>
          {toggleBtn(showOrig
            ? t('chat.hideOriginal')
            : t('chat.translatedLabel', { lang: LANGUAGE_NAMES[encoded.toLang] })
          )}
        </div>
      );
    }

    // Message reçu traduit à la demande
    if (localTranslated) {
      return (
        <div>
          <p className="text-sm whitespace-pre-wrap break-words">
            {showOrig ? message.content : localTranslated}
          </p>
          {toggleBtn(showOrig ? t('chat.hideOriginal') : t('chat.showOriginal'))}
        </div>
      );
    }

    // Message plain — bouton de traduction sur les messages reçus
    return (
      <div>
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        {!isOwn && (
          <button
            onClick={() => handleTranslateReceived(message)}
            disabled={isTranslatingThis}
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-indigo-600 font-medium mt-1 disabled:opacity-50 transition-colors"
          >
            {isTranslatingThis
              ? <FontAwesomeIcon icon={faSpinner} spin />
              : <FontAwesomeIcon icon={faLanguage} />
            }
            {isTranslatingThis ? t('chat.translating') : t('chat.translate')}
          </button>
        )}
      </div>
    );
  };

  return (
    <div
      style={{ position: 'fixed', bottom: pos.bottom, right: pos.right, zIndex: 40 }}
      className="flex flex-col-reverse items-end gap-3"
    >
      {/* Bouton d'ouverture */}
      <button
        onClick={() => !isDragging && setIsOpen(!isOpen)}
        className="relative bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
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
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col
          w-[calc(100vw-1rem)] max-h-[calc(100vh-6rem)]
          sm:w-96 sm:h-[600px] sm:max-h-[calc(100vh-6rem)]">

          {/* En-tête — poignée de déplacement */}
          <div
            className={`p-4 border-b flex items-center justify-between bg-indigo-600 text-white rounded-t-lg select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={onDragStart}
            onTouchStart={onDragStart}
          >
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faGripVertical} className="opacity-60 text-sm" />
              {(currentConversation || showNewConv) && (
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => { setCurrentConversation(null); setShowNewConv(false); }}
                  className="hover:text-gray-200"
                >
                  <FontAwesomeIcon icon={faChevronLeft} />
                </button>
              )}
              <h3 className="font-semibold">
                {showNewConv
                  ? t('chat.newConversation')
                  : currentConversation
                    ? currentConversation.displayName
                    : t('chat.title')}
              </h3>
            </div>
            <div className="flex items-center space-x-3" onMouseDown={(e) => e.stopPropagation()}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              {!currentConversation && !showNewConv && (
                <button onClick={handleOpenNewConv} className="hover:text-gray-200" title={t('chat.newConversation')}>
                  <FontAwesomeIcon icon={faPlus} />
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="hover:text-gray-200">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          </div>

          {/* Vue : nouvelle conversation */}
          {showNewConv ? (
            <div className="flex-1 overflow-y-auto flex flex-col">
              <div className="p-3 border-b">
                <div className="relative">
                  <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    autoFocus
                    type="text"
                    placeholder={t('chat.searchUser')}
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
                            <span className="text-indigo-600 font-medium text-sm">{u.firstName?.[0]}{u.lastName?.[0]}</span>
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
                    <p className="text-center text-gray-500 text-sm p-8">{t('chat.noUsersFound')}</p>
                  )}
                </div>
              )}
            </div>

          /* Vue : liste des conversations */
          ) : !currentConversation ? (
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-gray-400" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                  <FontAwesomeIcon icon={faComment} className="text-4xl text-gray-300 mb-3" />
                  <p className="text-center text-sm">{t('chat.noConversations')}</p>
                  <button
                    onClick={handleOpenNewConv}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                  >
                    {t('chat.startConversation')}
                  </button>
                </div>
              ) : (
                <div className="divide-y">
                  {conversations.map((conv) => {
                    const lastMsgContent = conv.lastMessage
                      ? (() => {
                          const decoded = decodeTranslatedMessage(conv.lastMessage.content);
                          return decoded ? decoded.translated : conv.lastMessage.content;
                        })()
                      : null;
                    return (
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
                              {lastMsgContent && (
                                <p className="text-sm text-gray-500 truncate max-w-[200px]">
                                  {conv.lastMessage!.sender.id === user?.id ? `${t('chat.you')} : ` : ''}
                                  {lastMsgContent}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {conv.lastMessage && (
                              <p className="text-xs text-gray-400">{formatTime(conv.lastMessage.createdAt)}</p>
                            )}
                            {conv.unreadCount > 0 && (
                              <span className="inline-block mt-1 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          /* Vue : conversation active */
          ) : (
            <>
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
                          <div key={message.id} className={`flex mb-3 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] ${isOwn ? 'order-2' : 'order-1'}`}>
                              {!isOwn && (
                                <p className="text-xs text-gray-500 mb-1 ml-1">{message.sender.fullName}</p>
                              )}
                              <div className={`rounded-lg px-4 py-2 ${
                                isOwn
                                  ? 'bg-indigo-600 text-white rounded-br-none'
                                  : 'bg-gray-100 text-gray-900 rounded-bl-none'
                              }`}>
                                {renderContent(message, isOwn)}
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

              {/* Zone de saisie avec traduction */}
              <div className="border-t">
                {/* Aperçu de la traduction sortante */}
                {pendingTr && (
                  <div className="px-4 pt-3 pb-1">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 flex items-start gap-2">
                      <FontAwesomeIcon icon={faLanguage} className="text-blue-400 mt-0.5 flex-shrink-0 text-sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-blue-400 font-medium mb-0.5">
                          → {LANGUAGE_NAMES[pendingTr.targetLang]}
                        </p>
                        {pendingTr.isTranslating ? (
                          <div className="flex items-center gap-1 text-xs text-blue-500">
                            <FontAwesomeIcon icon={faSpinner} spin />
                            <span>{t('chat.translating')}</span>
                          </div>
                        ) : (
                          <p className="text-sm text-blue-800 break-words">{pendingTr.translated}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setPendingTr(null)}
                        className="text-blue-300 hover:text-blue-500 flex-shrink-0 text-xs"
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Sélecteur de langue cible */}
                {showLangPicker && (
                  <div className="px-4 pt-2 pb-1 flex flex-wrap gap-1">
                    {TRANSLATE_LANGS.map(({ code, flag }) => (
                      <button
                        key={code}
                        onClick={() => handlePickLang(code)}
                        className="flex items-center gap-1 px-2 py-1 text-xs rounded-full border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                      >
                        <span>{flag}</span>
                        <span className="text-gray-700">{LANGUAGE_NAMES[code]}</span>
                      </button>
                    ))}
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="p-4 flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={handleMessageChange}
                    placeholder={t('chat.typeMessage')}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    disabled={isSending}
                  />
                  {/* Bouton traduction sortante */}
                  <button
                    type="button"
                    onClick={() => { if (newMessage.trim()) setShowLangPicker(p => !p); }}
                    disabled={!newMessage.trim()}
                    title={t('chat.translate')}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors border flex-shrink-0 ${
                      showLangPicker
                        ? 'bg-indigo-100 border-indigo-400 text-indigo-600'
                        : 'border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed'
                    }`}
                  >
                    <FontAwesomeIcon icon={faLanguage} />
                  </button>
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || isSending || pendingTr?.isTranslating}
                    className="w-9 h-9 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {isSending
                      ? <FontAwesomeIcon icon={faSpinner} spin />
                      : <FontAwesomeIcon icon={faPaperPlane} />
                    }
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
