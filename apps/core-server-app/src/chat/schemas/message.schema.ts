import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  senderId: number; // References PostgreSQL user.id

  @Prop({ required: true })
  receiverId: number; // References PostgreSQL user.id

  @Prop({ enum: ['text', 'image', 'file'], default: 'text' })
  messageType: string;

  @Prop()
  fileUrl?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Indexes
MessageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, receiverId: 1, isRead: 1 });
