'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';

interface RealtimeNotification {
  id: number;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'DANGER' | 'CRITICAL';
  link?: string;
  createdAt: string;
}

export function useRealtimeNotifications() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<RealtimeNotification | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const mercureUrl = process.env.NEXT_PUBLIC_MERCURE_URL || 'http://localhost:3001/.well-known/mercure';
    const topic = `/users/${user.id}/notifications`;
    
    const url = new URL(mercureUrl);
    url.searchParams.append('topic', topic);
    
    const eventSource = new EventSource(url.toString());
    
    eventSource.onopen = () => {
      console.log('🔔 Connexion Mercure établie');
      setIsConnected(true);
    };
    
    eventSource.onerror = (error) => {
      console.error('Erreur Mercure:', error);
      setIsConnected(false);
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const notification: RealtimeNotification = {
          id: data.id,
          title: data.title,
          message: data.message,
          severity: data.severity,
          link: data.link,
          createdAt: data.createdAt,
        };
        
        setNotifications(prev => [notification, ...prev].slice(0, 50));
        setLastNotification(notification);
        
        // Afficher une notification navigateur si supporté
        if (Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/icons/icon-192.png',
          });
        }
      } catch (error) {
        console.error('Erreur parsing notification:', error);
      }
    };
    
    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [user?.id]);

  const requestNotificationPermission = async () => {
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    setLastNotification(null);
  };

  return {
    notifications,
    lastNotification,
    isConnected,
    requestNotificationPermission,
    clearNotifications,
  };
}