// Core Application Types

export interface Point {
  x: number
  y: number
}

export interface Coordinate {
  x: number
  y: number
}

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

// WebSocket Message Types
export interface WebSocketMessage {
  type: string
  timestamp: number
  [key: string]: any
}

export interface CanvasUpdateMessage extends WebSocketMessage {
  type: 'canvas_update'
  pngBase64: string
  width: number
  height: number
}

export interface PenEventMessage extends WebSocketMessage {
  type: 'pen_event'
  eventType: 'down' | 'move' | 'up'
  points: Point[]
  color: string
  width: number
  pressure?: number
}

export interface UserIntentMessage extends WebSocketMessage {
  type: 'user_intent'
  text: string
}

export interface VoiceChunkMessage extends WebSocketMessage {
  type: 'voice_chunk'
  audioBytes: ArrayBuffer
}

export interface InterruptMessage extends WebSocketMessage {
  type: 'interrupt'
  who: 'user' | 'ai'
}

// AI Response Types
export interface SubtitleMessage extends WebSocketMessage {
  type: 'subtitle'
  text: string
  mode: 'speak' | 'hint' | 'affirm' | 'correction' | 'urgent'
  ttlMs: number
}

export interface AICursorMoveMessage extends WebSocketMessage {
  type: 'ai_cursor_move'
  x: number
  y: number
  speed: 'slow' | 'natural' | 'fast' | 'instant'
  style: 'glow' | 'normal' | 'emphasis'
  duration?: number
  easing?: string
}

export interface AnnotationMessage extends WebSocketMessage {
  type: 'annotation'
  id: string
  annotationType: 'highlight' | 'circle' | 'arrow' | 'underline' | 'bracket' | 'text' | 'math' | 'cross_out'
  color: string
  lifetimeMs: number
  position?: Point
  start?: Point
  end?: Point
  center?: Point
  radius?: number
  width?: number
  height?: number
  text?: string
  latex?: string
  animation?: {
    type: string
    duration: number
    easing?: string
  }
}

export interface ToastMessage extends WebSocketMessage {
  type: 'toast'
  text: string
  kind: 'success' | 'warn' | 'info' | 'error'
}

export interface KnowledgeGraphUpdateMessage extends WebSocketMessage {
  type: 'knowledge_graph_update'
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
}

// Knowledge Graph Types
export interface KnowledgeNode {
  id: string
  mastery: number // 0-1
  importance: number // 0-1
  lastUpdated?: number
  practiceCount?: number
  successRate?: number
  color?: string
  size?: number
}

export interface KnowledgeEdge {
  source: string
  target: string
  strength: number // 0-1
  type?: 'prerequisite' | 'related' | 'follows'
  width?: number
}

export interface KnowledgeGraphData {
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
  stats: {
    totalConcepts: number
    weakConcepts: number
    strongConcepts: number
    averageMastery: number
    masteryDistribution: {
      low: number
      medium: number
      high: number
    }
  }
}

// Drawing and Canvas Types
export interface DrawingTool {
  id: string
  name: string
  icon: string
  cursor: string
  color: string
  width: number
  opacity: number
}

export interface DrawingStroke {
  id: string
  tool: string
  points: number[] // Array of x,y coordinates: [x1,y1,x2,y2,...]
  color: string
  width: number
  opacity: number
  timestamp: number
  pressure?: number[]
}

export interface CanvasState {
  strokes: DrawingStroke[]
  background: string
  zoom: number
  pan: Point
  bounds: Bounds
  grid: boolean
  snapToGrid: boolean
}

// Voice and Audio Types
export interface VoiceSettings {
  enabled: boolean
  continuousMode: boolean
  pushToTalk: boolean
  threshold: number
  language: string
  sampleRate: number
}

export interface TranscriptSegment {
  text: string
  confidence: number
  startTime: number
  endTime: number
  isFinal: boolean
  speaker: 'user' | 'ai'
}

export interface AudioConfig {
  sampleRate: number
  channels: number
  chunkSize: number
  format: string
  vadThreshold: number
  silenceDuration: number
}

// Session and State Types
export interface SessionState {
  id: string
  connected: boolean
  startTime: number
  lastActivity: number
  canvasUpdates: number
  voiceTranscripts: TranscriptSegment[]
  userIntents: string[]
  aiResponses: SubtitleMessage[]
  knowledgeGraph?: KnowledgeGraphData
}

export interface UserProfile {
  sessionDuration: number
  interactionFrequency: number
  helpSeekingBehavior: 'low' | 'medium' | 'high'
  engagementLevel: 'low' | 'medium' | 'high'
  preferredLearningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed'
  strongConcepts: string[]
  weakConcepts: string[]
  recentErrors: string[]
}

// UI and Interaction Types
export interface UITheme {
  mode: 'light' | 'dark'
  primaryColor: string
  accentColor: string
  backgroundColor: string
  textColor: string
  borderRadius: number
  spacing: number
}

export interface AppSettings {
  theme: UITheme
  voice: VoiceSettings
  canvas: {
    grid: boolean
    snapToGrid: boolean
    autoSave: boolean
    showRuler: boolean
  }
  ai: {
    interruptionMode: 'never' | 'gentle' | 'medium' | 'aggressive'
    hintFrequency: 'low' | 'medium' | 'high'
    showConfidence: boolean
    animateAnnotations: boolean
  }
  accessibility: {
    highContrast: boolean
    largeText: boolean
    reduceMotion: boolean
    screenReader: boolean
  }
}

// API and Service Types
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  timestamp: number
}

export interface SessionStatusResponse {
  sessionId: string
  active: boolean
  lastActivity: number
  canvasUpdates: number
  userIntents: number
  speaking: boolean
  knowledgeNodes: number
  weakConcepts: string[]
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: number
  environment: {
    anthropic: boolean
    cerebras: boolean
    wispr: boolean
    fetchai: boolean
  }
  activeSessions: number
}

// Error Types
export interface AppError {
  code: string
  message: string
  context?: Record<string, any>
  timestamp: number
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface ConnectionError extends AppError {
  code: 'CONNECTION_ERROR'
  retryable: boolean
  retryAfter?: number
}

export interface ValidationError extends AppError {
  code: 'VALIDATION_ERROR'
  field: string
  value: any
}

// Event Types
export interface AppEvent {
  type: string
  payload: any
  timestamp: number
  source: 'user' | 'ai' | 'system'
}

export interface UserInteractionEvent extends AppEvent {
  type: 'user_interaction'
  payload: {
    action: string
    target: string
    context: Record<string, any>
  }
}

export interface AIResponseEvent extends AppEvent {
  type: 'ai_response'
  payload: {
    responseType: string
    content: any
    confidence?: number
    model: 'claude' | 'cerebras'
  }
}

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

export type EventHandler<T = any> = (event: T) => void | Promise<void>
export type AsyncEventHandler<T = any> = (event: T) => Promise<void>

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type NonNullable<T> = T extends null | undefined ? never : T

// Constants
export const DRAWING_TOOLS = {
  PEN: 'pen',
  PENCIL: 'pencil',
  MARKER: 'marker',
  ERASER: 'eraser',
  HIGHLIGHTER: 'highlighter',
  TEXT: 'text',
  SHAPES: 'shapes'
} as const

export const AI_RESPONSE_MODES = {
  SPEAK: 'speak',
  HINT: 'hint', 
  AFFIRM: 'affirm',
  CORRECTION: 'correction',
  URGENT: 'urgent'
} as const

export const CONNECTION_STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error'
} as const

export const KEYBOARD_SHORTCUTS = {
  TOGGLE_VOICE: 'Space',
  SETTINGS: 'ctrl+s',
  KNOWLEDGE_GRAPH: 'ctrl+g',
  FULLSCREEN: 'F11',
  UNDO: 'ctrl+z',
  REDO: 'ctrl+y',
  CLEAR: 'ctrl+shift+c',
  SAVE: 'ctrl+s',
  HELP: 'F1'
} as const
