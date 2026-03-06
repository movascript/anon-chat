import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { WebSocketService } from '../services/websocket';
import { CryptoService } from '../services/crypto';
import { v4 as uuidv4 } from 'uuid';

export const Route = createFileRoute('/join/$token')({
  component: JoinChatPage,
});

function JoinChatPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'connecting' | 'joining' | 'error'>('connecting');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let ws: WebSocketService;
    let crypto: CryptoService;

    const init = async () => {
      try {
        crypto = new CryptoService();
        await crypto.generateKeyPair();
        const publicKey = await crypto.exportPublicKey();

        ws = new WebSocketService();
        await ws.connect();

        setStatus('joining');

        const userId = uuidv4();
        ws.send({
          type: 'join_chat',
          payload: {
            token,
            userId,
            publicKey,
          },
          timestamp: Date.now(),
          nonce: uuidv4(),
        });

        ws.on('chat_ready', (payload) => {
          navigate({ to: '/chat/$id', params: { id: payload.chatId } });
        });

        ws.on('error', (payload) => {
          setError(payload.error);
          setStatus('error');
        });

      } catch (err) {
        console.error('Join error:', err);
        setError('خطا در پیوستن به چت');
        setStatus('error');
      }
    };

    init();

    return () => {
      if (ws) ws.disconnect();
    };
  }, [token, navigate]);

  if (status === 'connecting' || status === 'joining') {
    return (
      <div className="max-w-md mx-auto text-center">
        <div className="animate-spin text-6xl mb-4">🔄</div>
        <p className="text-xl">
          {status === 'connecting' ? 'در حال اتصال...' : 'در حال پیوستن به چت...'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto text-center">
      <div className="text-6xl mb-4">❌</div>
      <p className="text-xl text-red-600 mb-4">{error}</p>
      <button onClick={() => navigate({ to: '/' })} className="btn-primary">
        بازگشت به خانه
      </button>
    </div>
  );
}
