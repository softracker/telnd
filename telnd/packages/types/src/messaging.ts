export interface Conversation {
  id: string;
  createdAt: string;
  updatedAt: string;
  participants: ConversationParticipant[];
  lastMessage?: Message;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  joinedAt: string;
  lastReadAt: string | null;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  replyToId: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  reactions?: MessageReaction[];
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
}

export type MessageType = 'text' | 'image' | 'file' | 'voice' | 'system';

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface CallLog {
  id: string;
  callerId: string;
  receiverId: string;
  type: CallType;
  status: CallStatus;
  startedAt: string | null;
  endedAt: string | null;
  duration: number | null;
  recordingUrl: string | null;
  createdAt: string;
  caller?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
  receiver?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
}

export type CallType = 'audio' | 'video';
export type CallStatus = 'missed' | 'answered' | 'rejected' | 'cancelled' | 'failed';
