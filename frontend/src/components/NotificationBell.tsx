'use client';

import { useState, useEffect } from 'react';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faCheckCircle, faExclamationTriangle, faCircleExclamation, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

export function NotificationBell() {
  const { notifications, lastNotification, isConnected, requestNotificationPermission, clearNotifications } = useRealtimeNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (lastNotification) {
      setUnreadCount(prev => prev + 1);
    }
  }, [lastNotification]);

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'INFO': return <FontAwesomeIcon icon={faInfoCircle} className="text-blue-500" />;
      case 'WARNING': return <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-500" />;
      case 'DANGER': return <FontAwesomeIcon icon={faCircleExclamation} className="text-orange-500" />;
      case 'CRITICAL': return <FontAwesomeIcon icon={faCircleExclamation} className="text-red-500" />;
      default: return <FontAwesomeIcon icon={faBell} className="text-gray-500" />;
    }
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return "À l'instant";
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)} h`;
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <FontAwesomeIcon icon={faBell} className="text-xl" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {isConnected && (
          <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-white" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[500px] overflow-y-auto">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <button
              onClick={clearNotifications}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Tout effacer
            </button>
          </div>

          <div className="divide-y">
            {notifications.length === 0 ? (
              <p className="p-8 text-center text-gray-500">Aucune notification</p>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start">
                    <div className="mr-3 mt-1">{getSeverityIcon(notification.severity)}</div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{notification.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-2">{formatTime(notification.createdAt)}</p>
                    </div>
                  </div>
                  {notification.link && (
                    <Link
                      href={notification.link}
                      className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 block"
                      onClick={() => setIsOpen(false)}
                    >
                      Voir les détails →
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}