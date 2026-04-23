<?php

namespace App\Service;

use Pusher\Pusher;

class PusherService
{
    private ?Pusher $pusher = null;

    public function __construct(
        private string $appId,
        private string $appKey,
        private string $appSecret,
        private string $cluster
    ) {
        if ($appId && $appKey && $appSecret) {
            $this->pusher = new Pusher($appKey, $appSecret, $appId, [
                'cluster' => $cluster,
                'useTLS' => true,
            ]);
        }
    }

    public function trigger(string $channel, string $event, array $data): void
    {
        if (!$this->pusher) return;

        try {
            $this->pusher->trigger($channel, $event, $data);
        } catch (\Exception $e) {
            error_log('Erreur Pusher trigger: ' . $e->getMessage());
        }
    }

    public function triggerBatch(array $batch): void
    {
        if (!$this->pusher) return;

        try {
            $this->pusher->triggerBatch($batch);
        } catch (\Exception $e) {
            error_log('Erreur Pusher triggerBatch: ' . $e->getMessage());
        }
    }

    public function authenticateChannel(string $socketId, string $channelName): string
    {
        if (!$this->pusher) {
            throw new \RuntimeException('Pusher non configuré');
        }
        return $this->pusher->authorizeChannel($channelName, $socketId);
    }

    public function isConfigured(): bool
    {
        return $this->pusher !== null;
    }
}
