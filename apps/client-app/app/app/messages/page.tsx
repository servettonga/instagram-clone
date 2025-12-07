// /messages - Real-time chat with Socket.IO

'use client';

import { useEffect, useState } from 'react';
import { useChatStore } from '@/lib/store/chatStore';
import { chatsAPI } from '@/lib/api/chats';
import ConversationsList from '@/components/chat/ConversationsList';
import MessagesView from '@/components/chat/MessagesView';
import NewChatModal from '@/components/chat/NewChatModal';
import { MessagePlaneIcon } from '@/components/ui/icons';
import styles from './messages.module.scss';

export default function MessagesPage() {
  const { chats, selectedChatId, setChats, setMessagesViewActive, selectChat } = useChatStore();
  const [isLoading, setIsLoading] = useState(true);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Load user's chats on mount
  useEffect(() => {
    const loadChats = async () => {
      try {
        setIsLoading(true);
        const userChats = await chatsAPI.getUserChats();
        setChats(userChats);
      } catch (error) {
        console.error('Failed to load chats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadChats();
  }, [setChats]);

  useEffect(() => {
    setMessagesViewActive(true);
    return () => {
      setMessagesViewActive(false);
    };
  }, [setMessagesViewActive]);

  // When a chat is selected, show the chat view on mobile
  useEffect(() => {
    if (selectedChatId) {
      setShowMobileChat(true);
    }
  }, [selectedChatId]);

  const selectedChat = chats.find((c) => c.id === selectedChatId);

  const handleNewMessage = () => {
    setShowNewChatModal(true);
  };

  const handleBackToList = () => {
    setShowMobileChat(false);
    selectChat(null);
  };

  const handleSelectChat = (chatId: string) => {
    selectChat(chatId);
    setShowMobileChat(true);
  };

  return (
    <div className={styles.messagesContainer}>
      <div className={`${styles.messagesLayout} ${showMobileChat ? styles.showChat : ''}`}>
        {/* Conversations List */}
        <div className={styles.conversationsWrapper}>
          <ConversationsList onNewMessage={handleNewMessage} onSelectChat={handleSelectChat} />
        </div>

        {/* Messages View */}
        <div className={styles.messagesView}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <p>Loading chats...</p>
            </div>
          ) : !selectedChat ? (
            /* Empty State - No chat selected */
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>
                <MessagePlaneIcon width={96} height={97} />
              </div>
              <h2 className={styles.emptyStateTitle}>Your Messages</h2>
              <p className={styles.emptyStateText}>
                Send private photos and messages to a friend or group.
              </p>
              <button
                className={styles.sendMessageButton}
                onClick={handleNewMessage}
              >
                Send Message
              </button>
            </div>
          ) : (
            /* Selected Chat Messages View */
            <MessagesView chat={selectedChat} onBack={handleBackToList} />
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
      />
    </div>
  );
}
