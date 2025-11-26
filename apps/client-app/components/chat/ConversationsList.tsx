// Conversations list component
'use client';

import { FiImage } from 'react-icons/fi';
import Avatar from '@/components/ui/Avatar';
import { ChevronDownIcon, NewMessageIcon } from '@/components/ui/icons';
import { useAuthStore } from '@/lib/store/authStore';
import { useChatStore } from '@/lib/store/chatStore';
import { chatsAPI } from '@/lib/api/chats';
import { getTimeAgo } from '@/lib/utils/date';
import type { Chat } from '@repo/shared-types';
import styles from './ConversationsList.module.scss';

interface ConversationsListProps {
  onNewMessage?: () => void;
}

export default function ConversationsList({ onNewMessage }: ConversationsListProps) {
  const { user } = useAuthStore();
  const { chats, selectedChatId, selectChat, unreadCounts, clearUnreadCount } = useChatStore();
  const profile = user?.profile;

  const getOtherParticipant = (chat: Chat) => {
    if (chat.type === 'GROUP') {
      return null; // Group chats use chat.name
    }

    // For private chats, find the other participant
    const otherParticipant = chat.participants.find(
      (p) => p.profileId !== profile?.id
    );
    return otherParticipant?.profile;
  };

  const getChatDisplayName = (chat: Chat) => {
    if (chat.type === 'GROUP') {
      return chat.name;
    }

    const otherUser = getOtherParticipant(chat);
    return otherUser?.displayName || otherUser?.username || 'Unknown';
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.type === 'GROUP') {
      return null; // TODO: Group chat avatar
    }

    const otherUser = getOtherParticipant(chat);
    return otherUser?.avatarUrl || null;
  };

  const getLastMessage = (chat: Chat): { text: string; hasImage: boolean } => {
    if (!chat.messages || chat.messages.length === 0) {
      return { text: 'No messages yet', hasImage: false };
    }

    const lastMsg = chat.messages[0];

    // Check if message has image attachments
    if (lastMsg?.assets && lastMsg.assets.length > 0) {
      const imageCount = lastMsg.assets.length;
      const prefix = lastMsg.content ? `${lastMsg.content} ` : '';
      const imageText = imageCount > 1 ? `${imageCount} images` : 'Image';
      return { text: `${prefix}${imageText}`, hasImage: true };
    }

    if (!lastMsg?.content) return { text: 'No messages yet', hasImage: false };

    const text = lastMsg.content.length > 40
      ? `${lastMsg.content.substring(0, 40)}...`
      : lastMsg.content;
    return { text, hasImage: false };
  };

  return (
    <div className={styles.conversationsList}>
      <div className={styles.conversationsHeader}>
        <div className={styles.userHeader}>
          <span className={styles.username}>{profile?.username || 'User'}</span>
          <ChevronDownIcon width={20} height={20} />
        </div>
        <button
          className={styles.newMessageButton}
          onClick={onNewMessage}
          aria-label="New message"
        >
          <div className={styles.svgWrapper}>
            <div className={styles.svgWrapperInner}>
              <NewMessageIcon />
            </div>
          </div>
        </button>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${styles.tabActive}`}>PRIMARY</button>
        <button className={`${styles.tab} ${styles.tabInactive}`}>GENERAL</button>
      </div>

      <div className={styles.conversationsListItems}>
        {chats.length === 0 ? (
          <div className={styles.emptyConversations}>
            <p>No conversations yet</p>
            <p>Start a new chat!</p>
          </div>
        ) : (
          chats.map((chat) => {
            const displayName = getChatDisplayName(chat);
            const avatarUrl = getChatAvatar(chat);
            const lastMessage = getLastMessage(chat);
            const timestamp = chat.messages?.[0]
              ? getTimeAgo(chat.messages[0].createdAt)
              : '';

            const unreadCount = unreadCounts[chat.id] || 0;
            const hasUnread = unreadCount > 0;

            return (
              <button
                key={chat.id}
                className={`${styles.conversationItem} ${
                  selectedChatId === chat.id ? styles.conversationItemActive : ''
                } ${
                  hasUnread ? styles.conversationItemUnread : ''
                }`}
                onClick={() => {
                  clearUnreadCount(chat.id);
                  selectChat(chat.id);
                  void chatsAPI
                    .markChatRead(chat.id)
                    .catch((error: unknown) =>
                      console.error('[ConversationsList] Failed to mark chat read:', error),
                    );
                }}
              >
                <div className={styles.conversationAvatar}>
                  <Avatar
                    avatarUrl={avatarUrl}
                    username={displayName}
                    size="lg"
                    unoptimized
                  />
                </div>
                <div className={styles.conversationInfo}>
                  <span className={`${styles.conversationUsername} ${
                    hasUnread ? styles.conversationUsernameUnread : ''
                  }`}>{displayName}</span>
                  <span className={`${styles.conversationLastMessage} ${
                    hasUnread ? styles.conversationMessageUnread : ''
                  }`}>
                    {lastMessage.hasImage && (
                      <span className={styles.imageIcon} aria-hidden>
                        <FiImage size={14} />
                      </span>
                    )}
                    {lastMessage.text}
                  </span>
                </div>
                <div className={styles.conversationMeta}>
                  {timestamp && (
                    <span className={styles.conversationTimestamp}>{timestamp}</span>
                  )}
                  {hasUnread && (
                    <span className={styles.unreadBadge}>{unreadCount}</span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
