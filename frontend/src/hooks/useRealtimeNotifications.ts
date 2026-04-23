'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { getPusher } from '../lib/pusher';

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

    const pusher       = getPusher();
    const channelName  = `private-user-${user.id}`;
    const channel      = pusher.subscribe(channelName);

    channel.bind('pusher:subscription_succeeded', () => {
      console.log('🔔 Pusher connecté — canal', channelName);
      setIsConnected(true);
    });

    channel.bind('pusher:subscription_error', (err: any) => {
      console.error('Erreur abonnement Pusher:', err);
      setIsConnected(false);
    });

    channel.bind('new-notification', (data: RealtimeNotification) => {
      setNotifications(prev => [data, ...prev].slice(0, 50));
      setLastNotification(data);

      if (Notification.permission === 'granted') {
        new Notification(data.title, {
          body: data.message,
          icon: '/icons/icon-192.png',
        });
      }
    });

    return () => {
      pusher.unsubscribe(channelName);
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
