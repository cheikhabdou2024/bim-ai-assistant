export type MessageRole = 'USER' | 'ASSISTANT'

export interface BIMData {
  type: 'building'
  name: string
  floors: number
  width: number
  length: number
  height: number
  rooms?: BIMRoom[]
}

export interface BIMRoom {
  name: string
  area: number
}

export interface Message {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  bimData?: BIMData | null
  createdAt: string
}

export interface Conversation {
  id: string
  title: string
  userId: string
  createdAt: string
  updatedAt: string
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[]
}

export interface StreamChunk {
  chunk: string
}

export interface SendMessageDto {
  conversationId?: string
  message: string
}

export interface BIMGenerateResponse {
  s3Key: string
  downloadUrl: string
}

export interface BIMValidateResponse {
  valid: boolean
  errors: string[]
}
