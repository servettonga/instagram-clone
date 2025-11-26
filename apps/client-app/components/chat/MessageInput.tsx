// Message input component with typing indicator
'use client';

import { useState, useRef, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@repo/shared-types';
import { FiSmile, FiImage } from 'react-icons/fi';
import { chatsAPI } from '@/lib/api/chats';
import styles from './MessageInput.module.scss';

type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface MessageInputProps {
  chatId: string;
  socket: ChatSocket | null;
  disabled?: boolean;
}

export default function MessageInput({ chatId, socket, disabled = false }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const emojis = ['😀', '😃', '😄', '😁', '😊', '😍', '🥰', '😘', '😂', '🤣', '😅', '😇', '🙂', '🙃', '😉', '😌', '😎', '🤩', '🥳', '😏', '😔', '😢', '😭', '😤', '😠', '😡', '🤔', '🤗', '🤭', '🤫', '🤐', '😴', '😪', '🤤', '😋', '😛', '😝', '😜', '🤪', '👍', '👎', '👏', '🙌', '🤝', '🙏', '💪', '❤️', '💕', '💖', '💗', '💙', '💚', '💛', '🧡', '💜', '🖤', '🤍', '🤎', '💯', '🔥', '✨', '🎉', '🎊', '🎈'];

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  // Emit typing indicator with debounce
  const handleTyping = () => {
    if (!socket || !chatId) return;

    // Start typing if not already
    if (!isTypingRef.current) {
      socket.emit('chat:typing', { chatId, isTyping: true });
      isTypingRef.current = true;
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 1000ms
    typingTimeoutRef.current = setTimeout(() => {
      if (socket && isTypingRef.current) {
        socket.emit('chat:typing', { chatId, isTyping: false });
        isTypingRef.current = false;
      }
    }, 1000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    handleTyping();
  };

  const handleSend = () => {
    if (!message.trim() || !socket || disabled) {
      return;
    }

    // Check if socket is actually connected
    if (!socket.connected) {
      return;
    }

    // Stop typing indicator
    if (isTypingRef.current) {
      socket.emit('chat:typing', { chatId, isTyping: false });
      isTypingRef.current = false;
    }

    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send message
    socket.emit('chat:message', {
      chatId,
      content: message.trim()
    });

    // Clear input
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (socket && isTypingRef.current) {
        socket.emit('chat:typing', { chatId, isTyping: false });
      }
    };
  }, [socket, chatId]);

  const handleEmojiClick = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socket || disabled) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    setIsUploading(true);
    try {
      // Upload the image
      const uploadedAsset = await chatsAPI.uploadMessageImage(chatId, file);

      // Send message with asset
      socket.emit('chat:message', {
        chatId,
        content: message.trim() || '',
        assetIds: [uploadedAsset.id],
      });

      // Clear input
      setMessage('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={styles.inputContainer}>
      <div className={styles.inputWrapper}>
        <div className={styles.emojiPickerWrapper} ref={emojiPickerRef}>
          <button
            className={styles.iconButton}
            type="button"
            disabled={disabled}
            aria-label="Add emoji"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <FiSmile size={24} />
          </button>
          {showEmojiPicker && (
            <div className={styles.emojiPicker}>
              {emojis.map((emoji, index) => (
                <button
                  key={index}
                  className={styles.emojiButton}
                  onClick={() => handleEmojiClick(emoji)}
                  type="button"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          className={styles.textarea}
          disabled={disabled}
          rows={1}
        />

        {message.trim() ? (
          <button
            onClick={handleSend}
            disabled={disabled || isUploading}
            className={styles.sendButton}
            type="button"
          >
            Send
          </button>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button
              className={styles.iconButton}
              type="button"
              disabled={disabled || isUploading}
              aria-label="Add photo"
              onClick={handleImageClick}
            >
              {isUploading ? '...' : <FiImage size={24} />}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
