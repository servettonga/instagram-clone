// /messages

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAuthStore } from '@/lib/store/authStore';
import {
  ChevronDownIcon,
  NewMessageIcon,
  MessagePlaneIcon,
  PhoneIcon,
  VideoCallIcon,
  InfoIcon,
  EmojiIcon,
  GalleryIcon,
  HeartIcon,
} from '@/components/ui/icons';
import styles from './messages.module.scss';

const MOCK_CONVERSATIONS = [
  {
    id: '1',
    username: 'Chirag Singla',
    avatarUrl: 'https://i.pravatar.cc/150?img=25',
    lastMessage: '',
    timestamp: '',
    unread: false,
    active: '2h ago',
  },
];

export default function MessagesPage() {
  const { user } = useAuthStore();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');

  const profile = user?.profile;
  const activeConversation = MOCK_CONVERSATIONS.find(c => c.id === selectedConversation);

  return (
    <div className={styles.messagesContainer}>
      <div className={styles.messagesLayout}>
        {/* Conversations List */}
        <div className={styles.conversationsList}>
          <div className={styles.conversationsHeader}>
            <div className={styles.userHeader}>
              <span className={styles.username}>{profile?.username || 'upvox_'}</span>
              <ChevronDownIcon width={20} height={20} />
            </div>
            <button className={styles.newMessageButton} aria-label="New message">
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
            {MOCK_CONVERSATIONS.map((conversation) => (
              <button
                key={conversation.id}
                className={`${styles.conversationItem} ${selectedConversation === conversation.id ? styles.conversationItemActive : ''}`}
                onClick={() => setSelectedConversation(conversation.id)}
              >
                <div className={styles.conversationAvatar}>
                  <Image
                    src={conversation.avatarUrl}
                    alt={conversation.username}
                    width={56}
                    height={56}
                    className={styles.avatar}
                    unoptimized
                  />
                </div>
                <div className={styles.conversationInfo}>
                  <span className={styles.conversationUsername}>{conversation.username}</span>
                  <span className={styles.conversationActive}>Active {conversation.active}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Messages View */}
        <div className={styles.messagesView}>
          {!selectedConversation ? (
            /* Empty State - Greeting */
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>
                <MessagePlaneIcon width={96} height={97} />
              </div>
              <h2 className={styles.emptyStateTitle}>Your Messages</h2>
              <p className={styles.emptyStateText}>Send private photos and messages to a friend or group.</p>
              <button className={styles.sendMessageButton}>Send Message</button>
            </div>
          ) : (
            <>
              <div className={styles.messagesHeader}>
                <div className={styles.recipientInfo}>
                  <Image
                    src={activeConversation!.avatarUrl}
                    alt={activeConversation!.username}
                    width={24}
                    height={24}
                    className={styles.recipientAvatar}
                    unoptimized
                  />
                  <div className={styles.recipientDetails}>
                    <span className={styles.recipientUsername}>{activeConversation!.username}</span>
                    <span className={styles.activeStatus}>Active {activeConversation!.active}</span>
                  </div>
                </div>
                <div className={styles.headerActions}>
                  <button className={styles.headerButton}>
                    <div className={styles.svgWrapper}>
                      <div className={styles.svgWrapperInner}>
                        <PhoneIcon />
                      </div>
                    </div>
                  </button>
                  <button className={styles.headerButton}>
                    <div className={styles.svgWrapper}>
                      <div className={styles.svgWrapperInner}>
                        <VideoCallIcon />
                      </div>
                    </div>
                  </button>
                  <button className={styles.headerButton}>
                    <div className={styles.svgWrapper}>
                      <div className={styles.svgWrapperInner}>
                        <InfoIcon />
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div className={styles.messagesContent}>
                {/* Messages would go here */}
              </div>

              <div className={styles.messageInput}>
                <button className={styles.emojiButton}>
                  <div className={styles.svgWrapper}>
                    <div className={styles.svgWrapperInner}>
                      <EmojiIcon />
                    </div>
                  </div>
                </button>
                <input
                  type="text"
                  placeholder="Message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className={styles.messageInputField}
                />
                <button className={styles.iconButton}>
                  <div className={styles.svgWrapper}>
                    <div className={styles.svgWrapperInner}>
                      <GalleryIcon />
                    </div>
                  </div>
                </button>
                <button className={styles.iconButton}>
                  <div className={styles.svgWrapper}>
                    <div className={styles.svgWrapperInner}>
                      <HeartIcon />
                    </div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
