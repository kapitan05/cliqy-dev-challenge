// Cliqy Studio Dev Challenge — shared types
// Nie zmieniaj tego pliku — typy są częścią specyfikacji zadania.

export type MessageCategory = 'zamówienie' | 'pytanie' | 'reklamacja' | 'spam'
export type MessagePriority = 'high' | 'medium' | 'low'
export type MessageStatus = 'pending' | 'approved' | 'rejected'

export interface ClassifyRequest {
  message: string
  company: string
}

export interface ClassifyResponse {
  category: MessageCategory
  priority: MessagePriority
  draft_reply: string
  confidence: number // 0–1
}

export interface QueueItem extends ClassifyResponse {
  id: string
  message: string
  company: string
  status: MessageStatus
  created_at: string
}
