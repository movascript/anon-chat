import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { WebSocketService } from '../services/websocket';
import { CryptoService } from '../services/crypto';
import { v4 as uuidv4 } from 'uuid';

export const Route = createFileRoute('/create')({
  component: CreateChatPage,
});

function CreateChatPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'connecting' | 'creating' | 'ready' | 'error'>('connecting');
  const [inviteUrl, setInviteUrl] = useState<string>('');
  const [chatId, setChatId] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let ws: WebSocketService;
    let crypto: CryptoService;

    const init = async () => {
      try {
        // Initialize crypto
        crypto = new CryptoService();
        await crypto.generateKeyPair();
        const publicKey = await crypto.exportPublicKey();

        // Connect to WebSocket
        ws = new WebSocketService();
        await ws.connect();

        setStatus('creating');

        // Request chat creation
        const userId = uuidv4();
        ws.send({
          type: 'create_chat',
          payload: {
            userId,
            publicKey,
          },
          timestamp: Date.now(),
          nonce: uuidv4(),
        });

        // Handle response
        ws.on('create_chat', (payload) => {
          setChatId(payload.chatId);
          setInviteUrl(payload.inviteUrl);
          setStatus('ready');
        });

        ws.on('error', (payload) => {
          setError(payload.error);
          setStatus('error');
        });

        ws.on('user_joined', () => {
          navigate({ to: '/chat/$id', params: { id: chatId } });
        });

      } catch (err) {
        console.error('Initialization error:', err);
        setError('خطا در اتصال به سرور');
        setStatus('error');
      }
    };

    init();

    return () => {
      if (ws) ws.disconnect();
    };
  }, [navigate, chatId]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteUrl);
    alert('لینک کپی شد!');
  };

  if (status === 'connecting') {
    return (
      <div className="max-w-md mx-auto text-center">
        <div className="animate-spin text-6xl mb-4">⚙️</div>
        <p className="text-xl">در حال اتصال...</p>
      </div>
    );
  }

  if (status === 'creating') {
    return (
      <div className="max-w-md mx-auto text-center">
        <div className="animate-pulse text-6xl mb-4">🔨</div>
        <p className="text-xl">در حال ساخت چت...</p>
      </div>
    );
  }

  if (status === 'error') {
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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl p-8 shadow-lg">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold mb-2">چت آماده است!</h1>
          <p className="text-gray-600">
            لینک زیر را با کسی که می‌خواهی به اشتراک بگذار
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={inviteUrl}
              readOnly
              className="input-field font-mono text-sm"
            />
            <button onClick={copyToClipboard} className="btn-primary whitespace-nowrap">
              📋 کپی
            </button>
          </div>
        </div>

        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <span>⏱️</span>
            <p>لینک به مدت 24 ساعت معتبر است</p>
          </div>
          <div className="flex items-start gap-2">
            <span>🔒</span>
            <p>فقط اولین نفری که لینک را باز کند می‌تواند وارد شود</p>
          </div>
          <div className="flex items-start gap-2">
            <span>⏳</span>
            <p>منتظر بمان تا طرف مقابل وارد شود...</p>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <div className="animate-bounce text-4xl">⏬</div>
        </div>
      </div>
    </div>
  );
}
