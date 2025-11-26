// Socket.IO client hook + provider for real-time chat
import {
  useEffect,
  useState,
  useCallback,
  useRef,
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@repo/shared-types';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import type { Message } from '@repo/shared-types';
import { chatsAPI } from '../api/chats';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface UseSocketReturn {
  socket: ChatSocket | null;
  isConnected: boolean;
  error: string | null;
}

const SocketContext = createContext<UseSocketReturn | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const chats = useChatStore((state) => state.chats);
  const [socket, setSocket] = useState<ChatSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDisconnecting = useRef(false);

  const createSocket = useCallback(() => {
    const token = Cookies.get('accessToken');

    if (!token || !isAuthenticated) {
      return null;
    }

    const newSocket = io(`${SOCKET_URL}/chat`, {
      auth: {
        token: `Bearer ${token}`,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    }) as ChatSocket;

    // Connection event handlers
    newSocket.on('connect', () => {
      setIsConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', (reason: string) => {
      setIsConnected(false);

      // If disconnect was intentional, don't show error
      if (!isDisconnecting.current) {
        if (reason === 'io server disconnect') {
          setError('Server disconnected the connection');
        }
      }
    });

    newSocket.on('connect_error', (err: Error) => {
      console.error('[Socket] Connection error:', err.message);
      setError(err.message);
      setIsConnected(false);
    });

    newSocket.on('error', (data: { message: string; code?: string }) => {
      console.error('[Socket] Server error:', data.message);
      setError(data.message);
    });

    return newSocket;
  }, [isAuthenticated]);

  useEffect(() => {
    if (!user || !isAuthenticated) {
      if (socket) {
        isDisconnecting.current = true;
        socket.close();
        setSocket(null);
        setIsConnected(false);
        isDisconnecting.current = false;
      }
      return;
    }

    if (socket && socket.connected) {
      return;
    }

    const newSocket = createSocket();
    if (newSocket) {
      setSocket(newSocket);
    }

    return () => {
      if (newSocket) {
        isDisconnecting.current = true;
        newSocket.close();
        setSocket(null);
        setIsConnected(false);
        isDisconnecting.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAuthenticated]);

  useEffect(() => {
    const handleTokenRefresh = () => {
      if (socket && socket.connected) {
        isDisconnecting.current = true;
        socket.close();
        isDisconnecting.current = false;
      }

      const newSocket = createSocket();
      if (newSocket) {
        setSocket(newSocket);
      }
    };

    window.addEventListener('token-refreshed', handleTokenRefresh);

    return () => {
      window.removeEventListener('token-refreshed', handleTokenRefresh);
    };
  }, [socket, createSocket]);

  useEffect(() => {
    if (!socket || !isConnected || chats.length === 0) {
      return;
    }

    chats.forEach((chat) => {
      socket.emit('chat:join', { chatId: chat.id });
    });
  }, [socket, isConnected, chats]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let isActive = true;

    const ensureChatsLoaded = async () => {
      const chatState = useChatStore.getState();
      if (chatState.chats.length > 0) {
        return;
      }

      try {
        const userChats = await chatsAPI.getUserChats();
        if (isActive) {
          chatState.setChats(userChats);
        }
      } catch (error) {
        console.error('[Socket] Failed to preload chats:', error);
      }
    };

    ensureChatsLoaded();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const markChatReadOnServer = (chatId: string) => {
      void chatsAPI
        .markChatRead(chatId)
        .catch((error: unknown) =>
          console.error('[Socket] Failed to mark chat read:', error),
        );
    };

    const handleMessage = (message: Message) => {
      const chatState = useChatStore.getState();
      chatState.addMessage(message.chatId, message);
      chatState.applyIncomingMessage(message.chatId, message);

      const currentProfileId = useAuthStore.getState().user?.profile?.id;
      if (message.profileId === currentProfileId) {
        chatState.clearUnreadCount(message.chatId);
        markChatReadOnServer(message.chatId);
        return;
      }

      if (
        chatState.isMessagesViewActive &&
        chatState.selectedChatId === message.chatId
      ) {
        chatState.clearUnreadCount(message.chatId);
        markChatReadOnServer(message.chatId);
      } else {
        chatState.incrementUnreadCount(message.chatId);
      }
    };

    const handleUserPresence = (payload: { userId: string; isOnline: boolean }) => {
      const chatState = useChatStore.getState();
      chatState.setUserOnline(payload.userId, payload.isOnline);
    };

    socket.on('chat:message', handleMessage);
    socket.on('user:presence', handleUserPresence);

    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('user:presence', handleUserPresence);
    };
  }, [socket]);

  const value = useMemo(
    () => ({ socket, isConnected, error }),
    [socket, isConnected, error],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

/**
 * Hook to access the shared socket connection. Must be used inside SocketProvider.
 */
export function useSocket(): UseSocketReturn {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }

  return context;
}
