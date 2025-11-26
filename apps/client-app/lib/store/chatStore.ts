// Chat store for managing chat state
import { create } from 'zustand';
import type { Chat, Message } from '../api/chats';

const deriveUnreadCounts = (chats: Chat[]): Record<string, number> =>
  chats.reduce<Record<string, number>>((acc, chat) => {
    acc[chat.id] = chat.unreadCount ?? 0;
    return acc;
  }, {});

interface TypingUser {
  userId: string;
  username: string;
}

export interface SystemMessage {
  id: string;
  type: 'system';
  content: string;
  createdAt: string;
}

export type ChatMessage = Message | SystemMessage;

interface ChatState {
  // Chat list
  chats: Chat[];
  isLoadingChats: boolean;

  // Selected chat
  selectedChatId: string | null;

  // Messages by chat ID (includes both regular and system messages)
  messagesByChatId: Record<string, ChatMessage[]>;
  isLoadingMessages: Record<string, boolean>;
  hasMoreMessages: Record<string, boolean>;
  nextCursor: Record<string, string | null>;

  // Typing indicators by chat ID
  typingUsers: Record<string, TypingUser[]>;

  // Unread counts by chat ID
  unreadCounts: Record<string, number>;

  // Online status by user ID
  onlineUsers: Set<string>;

  // Connection status
  isConnected: boolean;
  isMessagesViewActive: boolean;

  // Actions
  setChats: (chats: Chat[]) => void;
  addChat: (chat: Chat) => void;
  updateChat: (chatId: string, updates: Partial<Chat>) => void;
  applyIncomingMessage: (chatId: string, message: Message) => void;
  removeChat: (chatId: string) => void;

  selectChat: (chatId: string | null) => void;

  setMessages: (chatId: string, messages: ChatMessage[]) => void;
  addMessage: (chatId: string, message: ChatMessage) => void;
  addSystemMessage: (chatId: string, content: string) => void;
  prependMessages: (chatId: string, messages: Message[]) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (chatId: string, messageId: string) => void;

  setLoadingMessages: (chatId: string, loading: boolean) => void;
  setHasMoreMessages: (chatId: string, hasMore: boolean) => void;
  setNextCursor: (chatId: string, cursor: string | null) => void;

  setTyping: (chatId: string, userId: string, username: string, isTyping: boolean) => void;
  clearTypingIndicators: (chatId: string) => void;

  incrementUnreadCount: (chatId: string) => void;
  clearUnreadCount: (chatId: string) => void;

  setConnected: (connected: boolean) => void;
  setMessagesViewActive: (active: boolean) => void;

  setUserOnline: (userId: string, isOnline: boolean) => void;
  isUserOnline: (userId: string) => boolean;

  // Clear all state (on logout)
  reset: () => void;
}

const initialState = {
  chats: [],
  isLoadingChats: false,
  selectedChatId: null,
  messagesByChatId: {},
  isLoadingMessages: {},
  hasMoreMessages: {},
  nextCursor: {},
  typingUsers: {},
  unreadCounts: {},
  onlineUsers: new Set<string>(),
  isConnected: false,
  isMessagesViewActive: false,
};

export const useChatStore = create<ChatState>((set) => ({
  ...initialState,

  // Chat list actions
  setChats: (chats) =>
    set(() => ({
      chats,
      unreadCounts: deriveUnreadCounts(chats),
    })),

  addChat: (chat) =>
    set((state) => ({
      chats: [chat, ...state.chats],
      unreadCounts: {
        ...state.unreadCounts,
        [chat.id]: chat.unreadCount ?? 0,
      },
    })),

  updateChat: (chatId, updates) =>
    set((state) => {
      const nextChats = state.chats.map((chat) =>
        chat.id === chatId ? { ...chat, ...updates } : chat,
      );

      const nextUnreadCounts =
        typeof updates.unreadCount === 'number'
          ? {
              ...state.unreadCounts,
              [chatId]: updates.unreadCount,
            }
          : state.unreadCounts;

      return {
        chats: nextChats,
        unreadCounts: nextUnreadCounts,
      };
    }),

  applyIncomingMessage: (chatId, message) => set((state) => {
    const existingChat = state.chats.find((chat) => chat.id === chatId);
    if (!existingChat) {
      return state;
    }

    const updatedChat: Chat = {
      ...existingChat,
      updatedAt: message.createdAt,
      messages: [message],
      // Preserve unreadCount - it will be updated separately by incrementUnreadCount
      unreadCount: existingChat.unreadCount,
    };

    return {
      chats: [updatedChat, ...state.chats.filter((chat) => chat.id !== chatId)],
    };
  }),

  removeChat: (chatId) => set((state) => ({
    chats: state.chats.filter((chat) => chat.id !== chatId),
    // Clear selected chat if it's the one being removed
    selectedChatId: state.selectedChatId === chatId ? null : state.selectedChatId,
    // Clean up related state
    messagesByChatId: Object.fromEntries(
      Object.entries(state.messagesByChatId).filter(([id]) => id !== chatId)
    ),
    isLoadingMessages: Object.fromEntries(
      Object.entries(state.isLoadingMessages).filter(([id]) => id !== chatId)
    ),
    hasMoreMessages: Object.fromEntries(
      Object.entries(state.hasMoreMessages).filter(([id]) => id !== chatId)
    ),
    nextCursor: Object.fromEntries(
      Object.entries(state.nextCursor).filter(([id]) => id !== chatId)
    ),
    typingUsers: Object.fromEntries(
      Object.entries(state.typingUsers).filter(([id]) => id !== chatId)
    ),
    unreadCounts: Object.fromEntries(
      Object.entries(state.unreadCounts).filter(([id]) => id !== chatId)
    ),
  })),

  // Chat selection
  selectChat: (chatId) => set({ selectedChatId: chatId }),

  // Message actions
  setMessages: (chatId, messages) => set((state) => ({
    messagesByChatId: {
      ...state.messagesByChatId,
      [chatId]: messages,
    },
  })),

  addMessage: (chatId, message) => set((state) => {
    const existingMessages = state.messagesByChatId[chatId] || [];

    // Prevent duplicates
    if (existingMessages.some((m) => m.id === message.id)) {
      return state;
    }

    return {
      messagesByChatId: {
        ...state.messagesByChatId,
        [chatId]: [...existingMessages, message],
      },
    };
  }),

  addSystemMessage: (chatId, content) => set((state) => {
    const systemMessage: SystemMessage = {
      id: `system-${Date.now()}-${Math.random()}`,
      type: 'system',
      content,
      createdAt: new Date().toISOString(),
    };

    const existingMessages = state.messagesByChatId[chatId] || [];
    return {
      messagesByChatId: {
        ...state.messagesByChatId,
        [chatId]: [...existingMessages, systemMessage],
      },
    };
  }),

  prependMessages: (chatId, messages) => set((state) => {
    const existingMessages = state.messagesByChatId[chatId] || [];
    const existingIds = new Set(existingMessages.map((m) => m.id));

    // Filter out duplicates
    const newMessages = messages.filter((m) => !existingIds.has(m.id));

    return {
      messagesByChatId: {
        ...state.messagesByChatId,
        [chatId]: [...newMessages, ...existingMessages],
      },
    };
  }),

  updateMessage: (chatId, messageId, updates) => set((state) => ({
    messagesByChatId: {
      ...state.messagesByChatId,
      [chatId]: (state.messagesByChatId[chatId] || []).map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      ),
    },
  })),

  deleteMessage: (chatId, messageId) => set((state) => ({
    messagesByChatId: {
      ...state.messagesByChatId,
      [chatId]: (state.messagesByChatId[chatId] || []).filter(
        (msg) => msg.id !== messageId
      ),
    },
  })),

  // Loading and pagination
  setLoadingMessages: (chatId, loading) => set((state) => ({
    isLoadingMessages: {
      ...state.isLoadingMessages,
      [chatId]: loading,
    },
  })),

  setHasMoreMessages: (chatId, hasMore) => set((state) => ({
    hasMoreMessages: {
      ...state.hasMoreMessages,
      [chatId]: hasMore,
    },
  })),

  setNextCursor: (chatId, cursor) => set((state) => ({
    nextCursor: {
      ...state.nextCursor,
      [chatId]: cursor,
    },
  })),

  // Typing indicators
  setTyping: (chatId, userId, username, isTyping) => set((state) => {
    const currentTyping = state.typingUsers[chatId] || [];

    if (isTyping) {
      // Add user if not already in list
      if (currentTyping.some((u) => u.userId === userId)) {
        return state;
      }

      return {
        typingUsers: {
          ...state.typingUsers,
          [chatId]: [...currentTyping, { userId, username }],
        },
      };
    } else {
      // Remove user from typing list
      return {
        typingUsers: {
          ...state.typingUsers,
          [chatId]: currentTyping.filter((u) => u.userId !== userId),
        },
      };
    }
  }),

  clearTypingIndicators: (chatId) => set((state) => ({
    typingUsers: {
      ...state.typingUsers,
      [chatId]: [],
    },
  })),

  // Unread counts
  incrementUnreadCount: (chatId) => set((state) => {
    const newCount = (state.unreadCounts[chatId] || 0) + 1;
    const nextCounts = {
      ...state.unreadCounts,
      [chatId]: newCount,
    };
    
    // Also update the chat object itself to keep them in sync
    const nextChats = state.chats.map((chat) =>
      chat.id === chatId ? { ...chat, unreadCount: newCount } : chat,
    );

    return { 
      unreadCounts: nextCounts,
      chats: nextChats,
    };
  }),

  clearUnreadCount: (chatId) => set((state) => {
    const nextCounts = {
      ...state.unreadCounts,
      [chatId]: 0,
    };

    // Also update the chat object itself to keep them in sync
    const nextChats = state.chats.map((chat) =>
      chat.id === chatId ? { ...chat, unreadCount: 0 } : chat,
    );

    return { 
      unreadCounts: nextCounts,
      chats: nextChats,
    };
  }),

  // Connection status
  setConnected: (connected) => set({ isConnected: connected }),

  setMessagesViewActive: (active) => set({ isMessagesViewActive: active }),

  // User online status
  setUserOnline: (userId, isOnline) => set((state) => {
    const newOnlineUsers = new Set(state.onlineUsers);
    if (isOnline) {
      newOnlineUsers.add(userId);
    } else {
      newOnlineUsers.delete(userId);
    }
    return { onlineUsers: newOnlineUsers };
  }),

  isUserOnline: (userId: string): boolean => {
    return useChatStore.getState().onlineUsers.has(userId);
  },

  // Reset state
  reset: () => {
    set(initialState);
  },
}));
