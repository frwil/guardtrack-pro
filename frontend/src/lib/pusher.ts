import Pusher from 'pusher-js';
import { getToken } from '../services/storage/token';

const PUSHER_KEY     = process.env.NEXT_PUBLIC_PUSHER_KEY     || '';
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu';
const API_URL        = process.env.NEXT_PUBLIC_API_URL        || 'http://localhost:8000';

let instance: Pusher | null = null;

export function getPusher(): Pusher {
  if (instance) return instance;

  instance = new Pusher(PUSHER_KEY, {
    cluster: PUSHER_CLUSTER,
    channelAuthorization: {
      endpoint: `${API_URL}/api/pusher/auth`,
      transport: 'ajax',
      headersProvider: () => {
        const token = getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    },
  });

  instance.connection.bind('error', (err: any) => {
    console.error('Pusher connection error:', err);
  });

  return instance;
}

export function disconnectPusher(): void {
  if (instance) {
    instance.disconnect();
    instance = null;
  }
}
