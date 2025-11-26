// Messages view component with real-time Socket.IO integration
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/ui/Avatar';
import {
  PhoneIcon,
  VideoCallIcon,
  InfoIcon,
} from '@/components/ui/icons';
import { useAuthStore } from '@/lib/store/authStore';
import { useChatStore } from '@/lib/store/chatStore';
import { useSocket } from '@/lib/hooks/useSocket';
import { chatsAPI } from '@/lib/api/chats';
import type { Chat, Message, MessageEditPayload, MessageDeletePayload, TypingPayload } from '@repo/shared-types';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import ChatInfoPanel from './ChatInfoPanel';
import SystemMessage from './SystemMessage';
import styles from './MessagesView.module.scss';

interface MessagesViewProps {
  chat: Chat;
}

export default function MessagesView({ chat }: MessagesViewProps) {
  const { user } = useAuthStore();
  const { socket, isConnected } = useSocket();
  const router = useRouter();
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const {
    messagesByChatId,
    addSystemMessage,
    updateMessage: updateMessageInStore,
    deleteMessage,
    setMessages,
    setLoadingMessages,
    setHasMoreMessages,
    setNextCursor,
    hasMoreMessages,
    nextCursor,
    isLoadingMessages,
    updateChat,
    typingUsers,
    setTyping,
    clearUnreadCount,
    setUserOnline,
    isUserOnline,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const profile = user?.profile;
  const GROUP_WINDOW_MS = 5 * 60 * 1000;
  // Get messages and sort by createdAt to ensure proper order without mutating store state
  const messages = [...(messagesByChatId[chat.id] || [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const hasMore = hasMoreMessages[chat.id] || false;
  const cursor = nextCursor[chat.id];
  const isLoading = isLoadingMessages[chat.id] || false;

  const isActiveParticipant = useCallback(
    (userId: string) => {
      const { chats } = useChatStore.getState();
      const currentChat = chats.find((c) => c.id === chat.id);

      if (!currentChat) {
        return false;
      }

      return currentChat.participants?.some(
        (participant) =>
          participant.profile.userId === userId && participant.leftAt === null,
      );
    },
    [chat.id],
  );

  // Get other participant for display (PRIVATE chats only)
  const getOtherParticipant = () => {
    if (chat.type === 'GROUP') return null;
    return chat.participants.find((p) => p.profileId !== profile?.id);
  };

  const otherParticipant = getOtherParticipant();
  const otherUser = otherParticipant?.profile;
  const displayName = chat.type === 'GROUP' ? chat.name : otherUser?.displayName || otherUser?.username || 'Unknown';
  const avatarUrl = chat.type === 'GROUP' ? null : otherUser?.avatarUrl;

  // Scroll to bottom on new messages
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      setLoadingMessages(chat.id, true);
      try {
        const response = await chatsAPI.getChatMessages(chat.id, { limit: 50 });
        setMessages(chat.id, response.messages);
        setHasMoreMessages(chat.id, response.hasMore);
        setNextCursor(chat.id, response.nextCursor);

        // Scroll to bottom after loading
        setTimeout(() => scrollToBottom('auto'), 100);
      } catch (error) {
        console.error('Failed to load messages:', error);
      } finally {
        setLoadingMessages(chat.id, false);
      }
    };

    loadMessages();
    clearUnreadCount(chat.id);
    void chatsAPI
      .markChatRead(chat.id)
      .catch((error: unknown) =>
        console.error('[MessagesView] Failed to mark chat read:', error),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id]); // Only run when chat changes

  // Join/leave Socket.IO room
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('chat:join', { chatId: chat.id });

    return () => {
      socket.emit('chat:leave', { chatId: chat.id });
    };
  }, [socket, isConnected, chat.id]);

  // Listen for Socket.IO events
  useEffect(() => {
    if (!socket) {
      return;
    }

    // New message received
    const handleMessage = (payload: Message) => {
      if (payload.chatId === chat.id) {
        // Scroll to bottom if user is near bottom
        if (messagesContainerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
          const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
          if (isNearBottom) {
            setTimeout(() => scrollToBottom(), 50);
          }
        }
      }
    };

    // Typing indicator
    const handleTyping = (payload: TypingPayload) => {
      if (payload.chatId === chat.id && payload.userId !== user?.id) {
        setTyping(chat.id, payload.userId, payload.username, payload.isTyping);
      }
    };

    // Message edited
    const handleMessageEdited = (payload: MessageEditPayload) => {
      if (payload.chatId === chat.id) {
        updateMessageInStore(chat.id, payload.messageId, {
          content: payload.content,
          isEdited: true,
        });
      }
    };

    // Message deleted
    const handleMessageDeleted = (payload: MessageDeletePayload) => {
      if (payload.chatId === chat.id) {
        deleteMessage(chat.id, payload.messageId);
      }
    };

    // User presence
    const handleUserPresence = (payload: { userId: string; isOnline: boolean }) => {
      setUserOnline(payload.userId, payload.isOnline);
    };

    // User joined chat
    const handleUserJoined = async (payload: { chatId: string; userId: string; username: string }) => {
      if (payload.chatId !== chat.id) {
        return;
      }

      const alreadyParticipant = isActiveParticipant(payload.userId);

      if (alreadyParticipant) {
        return;
      }

      // Add system message for actual membership changes
      addSystemMessage(chat.id, `${payload.username} joined the conversation`);

      try {
        const updatedChat = await chatsAPI.getChat(chat.id);
        updateChat(chat.id, updatedChat);
      } catch (error) {
        console.error('Failed to reload chat after user joined:', error);
      }

      setTimeout(() => scrollToBottom(), 100);
    };

    // User left chat
    const handleUserLeft = async (payload: { chatId: string; userId: string; username: string }) => {
      if (payload.chatId !== chat.id) {
        return;
      }

      const wasParticipant = isActiveParticipant(payload.userId);

      if (!wasParticipant) {
        return;
      }

      try {
        const updatedChat = await chatsAPI.getChat(chat.id);
        updateChat(chat.id, updatedChat);

        const stillParticipant = updatedChat.participants?.some(
          (participant) =>
            participant.profile.userId === payload.userId && participant.leftAt === null,
        );

        if (!stillParticipant) {
          addSystemMessage(chat.id, `${payload.username} left the conversation`);
          setTimeout(() => scrollToBottom(), 100);
        }
      } catch (error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError?.response?.status !== 404) {
          console.error('Failed to reload chat after user left:', error);
        }
      }
    };

    socket.on('chat:message', handleMessage);
    socket.on('chat:typing', handleTyping);
    socket.on('chat:message:edited', handleMessageEdited);
    socket.on('chat:message:deleted', handleMessageDeleted);
    socket.on('user:presence', handleUserPresence);
    socket.on('chat:user:joined', handleUserJoined);
    socket.on('chat:user:left', handleUserLeft);

    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('chat:typing', handleTyping);
      socket.off('chat:message:edited', handleMessageEdited);
      socket.off('chat:message:deleted', handleMessageDeleted);
      socket.off('user:presence', handleUserPresence);
      socket.off('chat:user:joined', handleUserJoined);
      socket.off('chat:user:left', handleUserLeft);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, chat.id, user?.id, isActiveParticipant, scrollToBottom]);

  // Load more messages (pagination)
  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMore || !cursor) return;

    setIsLoadingMore(true);
    try {
      const response = await chatsAPI.getChatMessages(chat.id, {
        cursor,
        limit: 50,
      });

      // Prepend older messages
      const currentMessages = messagesByChatId[chat.id] || [];
      setMessages(chat.id, [...response.messages, ...currentMessages]);
      setHasMoreMessages(chat.id, response.hasMore);
      setNextCursor(chat.id, response.nextCursor);
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Handle scroll for infinite scroll
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;

    const { scrollTop } = messagesContainerRef.current;

    // Load more when scrolled near top
    if (scrollTop < 100 && hasMore && !isLoadingMore) {
      loadMoreMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, isLoadingMore]);

  const currentTypingUsers = typingUsers[chat.id] || [];

  return (
    <>
      <div className={styles.messagesHeader}>
        <div className={styles.recipientInfo}>
          <Avatar
            avatarUrl={avatarUrl}
            username={displayName}
            size="sm"
            unoptimized
          />
          <div className={styles.recipientDetails}>
            {chat.type === 'PRIVATE' && otherUser ? (
              <button
                className={styles.recipientUsername}
                onClick={() => router.push(`/app/profile/${otherUser.username}`)}
              >
                {displayName}
              </button>
            ) : (
              <span className={styles.recipientUsername}>{displayName}</span>
            )}
            {otherParticipant?.profile && isUserOnline(otherParticipant.profile.userId) && (
              <span className={styles.onlineStatus}>Online</span>
            )}
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.headerButton} disabled>
            <div className={styles.svgWrapper}>
              <div className={styles.svgWrapperInner}>
                <PhoneIcon />
              </div>
            </div>
          </button>
          <button className={styles.headerButton} disabled>
            <div className={styles.svgWrapper}>
              <div className={styles.svgWrapperInner}>
                <VideoCallIcon />
              </div>
            </div>
          </button>
          <button
            className={styles.headerButton}
            onClick={() => setIsInfoPanelOpen(true)}
          >
            <div className={styles.svgWrapper}>
              <div className={styles.svgWrapperInner}>
                <InfoIcon />
              </div>
            </div>
          </button>
        </div>
      </div>

      <div
        className={styles.messagesContent}
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {isLoading && (
          <div className={styles.loadingMessages}>Loading messages...</div>
        )}

        {isLoadingMore && (
          <div className={styles.loadingMore}>Loading older messages...</div>
        )}

        {messages.map((message, index) => {
          if ('type' in message && message.type === 'system') {
            return (
              <SystemMessage
                key={message.id}
                message={message.content}
                timestamp={message.createdAt}
              />
            );
          }

          const currentMessage = message as Message;
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
          const isOwn = currentMessage.profileId === profile?.id;

          const currentTime = new Date(currentMessage.createdAt).getTime();
          const prevChatMessage = prevMessage && 'profileId' in prevMessage ? (prevMessage as Message) : null;
          const nextChatMessage = nextMessage && 'profileId' in nextMessage ? (nextMessage as Message) : null;

          const canGroupWithPrev =
            !!prevChatMessage &&
            prevChatMessage.profileId === currentMessage.profileId &&
            currentTime - new Date(prevChatMessage.createdAt).getTime() <= GROUP_WINDOW_MS;

          const canGroupWithNext =
            !!nextChatMessage &&
            nextChatMessage.profileId === currentMessage.profileId &&
            new Date(nextChatMessage.createdAt).getTime() - currentTime <= GROUP_WINDOW_MS;

          const isFirstInGroup = !canGroupWithPrev;
          const isLastInGroup = !canGroupWithNext;

          let groupPosition: 'single' | 'top' | 'middle' | 'bottom' = 'single';
          if (isFirstInGroup && !isLastInGroup) {
            groupPosition = 'top';
          } else if (!isFirstInGroup && !isLastInGroup) {
            groupPosition = 'middle';
          } else if (!isFirstInGroup && isLastInGroup) {
            groupPosition = 'bottom';
          }

          const showSenderInfo = !isOwn && isFirstInGroup;
          const showSenderLabel = showSenderInfo && chat.type === 'GROUP';
          const showTimestamp = groupPosition === 'single' || groupPosition === 'bottom';

          return (
            <MessageBubble
              key={message.id}
              message={currentMessage}
              isOwn={isOwn}
              showSenderInfo={showSenderInfo}
              showSenderLabel={showSenderLabel}
              groupPosition={groupPosition}
              showTimestamp={showTimestamp}
              isGroupedWithNext={canGroupWithNext}
              currentUserId={profile?.id}
              onEdit={async (messageId: string, content: string) => {
                try {
                  await chatsAPI.editMessage(chat.id, messageId, { content });
                } catch (error) {
                  console.error('Failed to edit message:', error);
                }
              }}
              onDelete={async (messageId: string) => {
                try {
                  // Optimistically remove from UI
                  deleteMessage(chat.id, messageId);
                  // Call API to delete on server
                  await chatsAPI.deleteMessage(chat.id, messageId);
                } catch (error) {
                  console.error('Failed to delete message:', error);
                  // Reload messages on error
                  const response = await chatsAPI.getChatMessages(chat.id, { limit: 50 });
                  setMessages(chat.id, response.messages);
                }
              }}
            />
          );
        })}

        {currentTypingUsers.length > 0 && (
          <TypingIndicator users={currentTypingUsers} />
        )}

        <div ref={messagesEndRef} />
      </div>

      <MessageInput chatId={chat.id} socket={socket} />

      {/* Info Panel */}
      <ChatInfoPanel
        chat={chat}
        isOpen={isInfoPanelOpen}
        onClose={() => setIsInfoPanelOpen(false)}
        onChatUpdated={async () => {
          // Reload chat data to get updated participants
          try {
            const updatedChat = await chatsAPI.getChat(chat.id);
            // Update chat in store
            updateChat(chat.id, updatedChat);
          } catch (error) {
            console.error('Failed to reload chat:', error);
          }
        }}
      />
    </>
  );
}
