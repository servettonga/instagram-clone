// Chat API client
import apiClient from './client';
import { API_ENDPOINTS } from './constants';
import type {
  CreatePrivateChatDto,
  CreateGroupChatDto,
  AddParticipantDto,
  GetMessagesQueryDto,
  Chat,
  ChatParticipant,
  Message,
  MessageAsset,
  MessagesResponse,
} from '@repo/shared-types';

class ChatsAPI {
  /**
   * Get all chats for the current user
   */
  async getUserChats(): Promise<Chat[]> {
    const { data } = await apiClient.get<Chat[]>(API_ENDPOINTS.CHATS.BASE);
    return data;
  }

  /**
   * Get a specific chat by ID
   */
  async getChat(chatId: string): Promise<Chat> {
    const { data } = await apiClient.get<Chat>(API_ENDPOINTS.CHATS.BY_ID(chatId));
    return data;
  }

  /**
   * Get messages from a chat with pagination
   */
  async getChatMessages(
    chatId: string,
    params?: GetMessagesQueryDto,
  ): Promise<MessagesResponse> {
    const { data } = await apiClient.get<MessagesResponse>(
      API_ENDPOINTS.CHATS.MESSAGES(chatId),
      { params },
    );
    return data;
  }

  /**
   * Create a private (direct message) chat
   */
  async createPrivateChat(otherUserId: string): Promise<Chat> {
    const { data } = await apiClient.post<Chat>(
      API_ENDPOINTS.CHATS.PRIVATE,
      { otherUserId } as CreatePrivateChatDto,
    );
    return data;
  }

  /**
   * Create a group chat
   */
  async createGroupChat(
    name: string,
    participantUserIds: string[],
  ): Promise<Chat> {
    const { data } = await apiClient.post<Chat>(
      API_ENDPOINTS.CHATS.GROUP,
      { name, participantUserIds } as CreateGroupChatDto,
    );
    return data;
  }

  /**
   * Add a participant to a group chat
   */
  async addParticipant(
    chatId: string,
    userId: string,
  ): Promise<ChatParticipant> {
    const { data } = await apiClient.post<ChatParticipant>(
      API_ENDPOINTS.CHATS.PARTICIPANTS(chatId),
      { userId } as AddParticipantDto,
    );
    return data;
  }

  /**
   * Leave a group chat
   */
  async leaveChat(chatId: string): Promise<{ success: boolean }> {
    const { data } = await apiClient.post<{ success: boolean }>(
      `${API_ENDPOINTS.CHATS.BY_ID(chatId)}/leave`,
    );
    return data;
  }

  /**
   * Delete a chat
   */
  async deleteChat(chatId: string): Promise<{ success: boolean }> {
    const { data } = await apiClient.post<{ success: boolean }>(
      `${API_ENDPOINTS.CHATS.BY_ID(chatId)}/delete`,
    );
    return data;
  }

  /**
   * Mark a chat as read for the current user
   */
  async markChatRead(chatId: string): Promise<{ success: boolean }> {
    const { data } = await apiClient.post<{ success: boolean }>(
      API_ENDPOINTS.CHATS.READ(chatId),
    );
    return data;
  }

  /**
   * Edit a message in a chat
   */
  async editMessage(
    chatId: string,
    messageId: string,
    payload: { content: string },
  ): Promise<Message> {
    const { data } = await apiClient.put<Message>(
      `${API_ENDPOINTS.CHATS.BY_ID(chatId)}/messages/${messageId}`,
      payload,
    );
    return data;
  }

  /**
   * Delete a message in a chat
   */
  async deleteMessage(
    chatId: string,
    messageId: string,
  ): Promise<{ id: string; chatId: string }> {
    const { data } = await apiClient.delete<{ id: string; chatId: string }>(
      `${API_ENDPOINTS.CHATS.BY_ID(chatId)}/messages/${messageId}`,
    );
    return data;
  }

  /**
   * Upload an image for a chat message
   */
  async uploadMessageImage(
    chatId: string,
    file: File,
  ): Promise<{ id: string; fileName: string; url: string; thumbnailUrl: string | null }> {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await apiClient.post(
      `${API_ENDPOINTS.CHATS.BY_ID(chatId)}/messages/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    return data;
  }

  /**
   * Update chat details (e.g., group name)
   */
  async updateChat(
    chatId: string,
    updateData: { name?: string },
  ): Promise<Chat> {
    const { data } = await apiClient.patch<Chat>(
      API_ENDPOINTS.CHATS.BY_ID(chatId),
      updateData,
    );
    return data;
  }
}

export const chatsAPI = new ChatsAPI();

// Export types
export type { Chat, ChatParticipant, Message, MessageAsset, MessagesResponse };
