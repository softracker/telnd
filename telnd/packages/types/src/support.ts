export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: string;
  metadata?: Record<string, unknown>;
  messages?: SupportMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED';

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  content: string;
  isInternal: boolean;
  attachments?: SupportAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SupportAttachment {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface TicketCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  isActive: boolean;
}

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  averageResponseTime: number;
  satisfactionRate: number;
}
