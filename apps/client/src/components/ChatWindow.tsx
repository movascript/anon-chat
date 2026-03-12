import { useState, useEffect } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { ConnectionStatus } from './ConnectionStatus';
import { WebSocketService } from '../services/websocket';
import { CryptoService } from '../services/crypto';
import type { Message } from '../types';

interface ChatWindowProps {
  chatId: string;
  initialUserId?: string;
  initialPublicKey?: string;
}

export function ChatWindow({ chatId, initialUserId, initialPublicKey }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [ws] = useState(() => new WebSocketService());
  const [crypto] = useState(() => new CryptoService());
  const [userId] = useState(() => initialUserId || window.crypto.randomUUID());

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // Initialize crypto
        await crypto.generateKeyPair();
        const publicKey = await crypto.exportPublicKey();

        // Connect WebSocket
        await ws.connect();
        setIsConnected(true);

        // Setup message handlers
        ws.on('user_joined', async (payload) => {
          if (!mounted) return;
          setPartnerOnline(true);
          await crypto.deriveSharedKey(payload.publicKey);
        });

        ws.on('chat_ready', async (payload) => {
          if (!mounted) return;
          setPartnerOnline(true);
          if (payload.partnerPublicKey) {
            await crypto.deriveSharedKey(payload.partnerPublicKey);
          }
        });

        ws.on('message', async (payload) => {
          if (!mounted) return;
          try {
            const decrypted = await crypto.decryptMessage(
              payload.ciphertext,
              payload.iv
            );
            
            const newMessage: Message = {
              id: window.crypto.randomUUID(),
              content: decrypted,
              isSent: false,
              timestamp: Date.now(),
            };
            
            setMessages((prev) => [...prev, newMessage]);
          } catch (error) {
            console.error('Decryption error:', error);
          }
        });

        ws.on('typing', (payload) => {
          if (!mounted) return;
          setIsPartnerTyping(payload.isTyping);
        });

        ws.on('user_left', () => {
          if (!mounted) return;
          setPartnerOnline(false);
        });

        ws.on('error', (payload) => {
          console.error('WebSocket error:', payload.error);
        });

        // Exchange keys if partner is already there
        if (initialPublicKey) {
          await crypto.deriveSharedKey(initialPublicKey);
          setPartnerOnline(true);
        }

      } catch (error) {
        console.error('Initialization error:', error);
        setIsConnected(false);
      }
    };

    init();

    return () => {
      mounted = false;
      ws.disconnect();
    };
  }, [chatId, crypto, ws, initialPublicKey]);

  const handleSendMessage = async (content: string) => {
    try {
      const { ciphertext, iv } = await crypto.encryptMessage(content);

      // Add to local messages
      const newMessage: Message = {
        id: window.crypto.randomUUID(),
        content,
        isSent: true,
        timestamp: Date.now(),
      };
      
      setMessages((prev) => [...prev, newMessage]);

      // Send encrypted message
      ws.send({
        type: 'message',
        payload: {
          chatId,
          ciphertext,
          iv,
        },
        timestamp: Date.now(),
        nonce: window.crypto.randomUUID(),
      });
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    ws.send({
      type: 'typing',
      payload: {
        chatId,
        isTyping,
      },
      timestamp: Date.now(),
    });
  };

  return (
    <div className="h-screen flex flex-col">
      <ConnectionStatus 
        isConnected={isConnected} 
        partnerOnline={partnerOnline} 
      />
      
      <MessageList messages={messages} />
      
      <TypingIndicator isTyping={isPartnerTyping} />
      
      <MessageInput
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        disabled={!isConnected || !partnerOnline}
      />
    </div>
  );
}
