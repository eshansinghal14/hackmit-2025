import { create } from 'zustand'
import { devtools, persist, createJSONStorage } from 'zustand/middleware'
import { generateSessionId } from '@/utils/uuid'
import type { 
  SessionState, 
  SubtitleMessage, 
  KnowledgeGraphData,
  AppSettings,
  UserProfile,
  TranscriptSegment,
  CanvasState,
  AppError,
  CONNECTION_STATES
} from '@/types'

interface AppStore {
  // Session Management
  sessionId: string
  connectionState: keyof typeof CONNECTION_STATES
  isConnected: boolean
  lastActivity: number
  
  // Canvas State
  canvasState: CanvasState
  
  // AI Interactions
  currentSubtitle: SubtitleMessage | null
  transcripts: TranscriptSegment[]
  aiCursorPosition: { x: number; y: number } | null
  
  // Knowledge Graph
  knowledgeGraph: KnowledgeGraphData | null
  
  // Voice and Audio
  voiceEnabled: boolean
  isRecording: boolean
  audioLevel: number
  
  // User Profile and Settings
  userProfile: UserProfile | null
  settings: AppSettings
  
  // Errors and Status
  errors: AppError[]
  isLoading: boolean
  
  // Actions
  initialize: () => void
  setConnectionState: (state: keyof typeof CONNECTION_STATES) => void
  setCurrentSubtitle: (subtitle: SubtitleMessage | null) => void
  addTranscript: (transcript: TranscriptSegment) => void
  updateKnowledgeGraph: (data: KnowledgeGraphData) => void
  clearKnowledgeGraph: () => void
  setVoiceEnabled: (enabled: boolean) => void
  setIsRecording: (recording: boolean) => void
  setAudioLevel: (level: number) => void
  updateCanvasState: (state: Partial<CanvasState>) => void
  updateSettings: (settings: Partial<AppSettings>) => void
  updateUserProfile: (profile: Partial<UserProfile>) => void
  setAICursorPosition: (position: { x: number; y: number } | null) => void
  addError: (error: AppError) => void
  clearErrors: () => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

const defaultCanvasState: CanvasState = {
  strokes: [],
  background: '#ffffff',
  zoom: 1,
  pan: { x: 0, y: 0 },
  bounds: { x: 0, y: 0, width: 1920, height: 1080 },
  grid: false,
  snapToGrid: false
}

const defaultSettings: AppSettings = {
  theme: {
    mode: 'light',
    primaryColor: '#1976d2',
    accentColor: '#9c27b0',
    backgroundColor: '#fafafa',
    textColor: '#212121',
    borderRadius: 12,
    spacing: 8
  },
  voice: {
    enabled: true,
    continuousMode: true,
    pushToTalk: false,
    threshold: 0.01,
    language: 'en-US',
    sampleRate: 16000
  },
  canvas: {
    grid: false,
    snapToGrid: false,
    autoSave: true,
    showRuler: false
  },
  ai: {
    interruptionMode: 'medium',
    hintFrequency: 'medium',
    showConfidence: true,
    animateAnnotations: true
  },
  accessibility: {
    highContrast: false,
    largeText: false,
    reduceMotion: false,
    screenReader: false
  }
}

const defaultUserProfile: UserProfile = {
  sessionDuration: 0,
  interactionFrequency: 0,
  helpSeekingBehavior: 'medium',
  engagementLevel: 'medium',
  preferredLearningStyle: 'mixed',
  strongConcepts: [],
  weakConcepts: [],
  recentErrors: []
}

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set) => ({
        // Initial State
        sessionId: '',
        connectionState: 'DISCONNECTED',
        isConnected: false,
        lastActivity: Date.now(),
        
        canvasState: defaultCanvasState,
        
        currentSubtitle: null,
        transcripts: [],
        aiCursorPosition: null,
        
        knowledgeGraph: null,
        
        voiceEnabled: false,
        isRecording: false,
        audioLevel: 0,
        
        userProfile: defaultUserProfile,
        settings: defaultSettings,
        
        errors: [],
        isLoading: false,
        
        // Actions
        initialize: () => {
          const sessionId = generateSessionId()
          set({ 
            sessionId,
            lastActivity: Date.now(),
            connectionState: 'DISCONNECTED',
            isConnected: false,
            knowledgeGraph: null // Clear knowledge graph on new session
          })
          console.log(`🎯 Session initialized: ${sessionId}`)
        },
        
        setConnectionState: (state) => {
          set({ 
            connectionState: state,
            isConnected: state === 'CONNECTED'
          })
          
          if (state === 'CONNECTED') {
            console.log('🔗 WebSocket connected')
          } else if (state === 'DISCONNECTED') {
            console.log('🔌 WebSocket disconnected')
          }
        },
        
        setCurrentSubtitle: (subtitle) => {
          set({ currentSubtitle: subtitle })
          
          if (subtitle) {
            console.log(`💬 AI: ${subtitle.text}`)
          }
        },
        
        addTranscript: (transcript) => {
          set(state => ({
            transcripts: [...state.transcripts.slice(-49), transcript], // Keep last 50
            lastActivity: Date.now()
          }))
          
          if (transcript.isFinal) {
            console.log(`🎤 User: ${transcript.text}`)
          }
        },
        
        updateKnowledgeGraph: (data) => {
          set({ knowledgeGraph: data })
          console.log(`🧠 Knowledge graph updated: ${data.nodes.length} concepts`)
        },
        
        clearKnowledgeGraph: () => {
          set({ knowledgeGraph: null })
          console.log('🧠 Knowledge graph cleared')
        },
        
        setVoiceEnabled: (enabled) => {
          set({ voiceEnabled: enabled })
          console.log(`🎤 Voice ${enabled ? 'enabled' : 'disabled'}`)
        },
        
        setIsRecording: (recording) => {
          set({ isRecording: recording })
        },
        
        setAudioLevel: (level) => {
          set({ audioLevel: level })
        },
        
        updateCanvasState: (newState) => {
          set(state => ({
            canvasState: { ...state.canvasState, ...newState },
            lastActivity: Date.now()
          }))
        },
        
        updateSettings: (newSettings) => {
          set(state => ({
            settings: {
              ...state.settings,
              ...newSettings,
              theme: { ...state.settings.theme, ...newSettings.theme },
              voice: { ...state.settings.voice, ...newSettings.voice },
              canvas: { ...state.settings.canvas, ...newSettings.canvas },
              ai: { ...state.settings.ai, ...newSettings.ai },
              accessibility: { ...state.settings.accessibility, ...newSettings.accessibility }
            }
          }))
          console.log('⚙️ Settings updated')
        },
        
        updateUserProfile: (newProfile) => {
          set(state => ({
            userProfile: state.userProfile ? 
              { ...state.userProfile, ...newProfile } : 
              { ...defaultUserProfile, ...newProfile }
          }))
        },
        
        setAICursorPosition: (position) => {
          set({ aiCursorPosition: position })
        },
        
        addError: (error) => {
          set(state => ({
            errors: [...state.errors.slice(-9), error] // Keep last 10 errors
          }))
          
          console.error(`❌ ${error.code}: ${error.message}`, error.context)
          
          // Auto-clear low severity errors after 30 seconds
          if (error.severity === 'low') {
            setTimeout(() => {
              set(state => ({
                errors: state.errors.filter(e => e !== error)
              }))
            }, 30000)
          }
        },
        
        clearErrors: () => {
          set({ errors: [] })
        },
        
        setLoading: (loading) => {
          set({ isLoading: loading })
        },
        
        reset: () => {
          const sessionId = generateSessionId()
          set({
            sessionId,
            connectionState: 'DISCONNECTED',
            isConnected: false,
            lastActivity: Date.now(),
            canvasState: defaultCanvasState,
            currentSubtitle: null,
            transcripts: [],
            aiCursorPosition: null,
            knowledgeGraph: null,
            voiceEnabled: false,
            isRecording: false,
            audioLevel: 0,
            userProfile: defaultUserProfile,
            errors: [],
            isLoading: false
          })
          console.log(`🔄 App reset with new session: ${sessionId}`)
        }
      }),
      {
        name: 'ai-whiteboard-tutor-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          // Only persist settings and user profile
          settings: state.settings,
          userProfile: state.userProfile
        })
      }
    ),
    { name: 'AI Whiteboard Tutor Store' }
  )
)

// Computed values and derived state
export const useComputedValues = () => {
  const store = useAppStore()
  
  return {
    // Session stats
    sessionDuration: Date.now() - (store.lastActivity || Date.now()),
    totalTranscripts: store.transcripts.length,
    finalTranscripts: store.transcripts.filter(t => t.isFinal),
    
    // Knowledge graph stats
    totalConcepts: store.knowledgeGraph?.nodes.length || 0,
    weakConcepts: store.knowledgeGraph?.stats.weakConcepts || 0,
    strongConcepts: store.knowledgeGraph?.stats.strongConcepts || 0,
    averageMastery: store.knowledgeGraph?.stats.averageMastery || 0,
    
    // Canvas stats
    totalStrokes: store.canvasState.strokes.length,
    
    // Error stats
    criticalErrors: store.errors.filter(e => e.severity === 'critical').length,
    recentErrors: store.errors.filter(e => Date.now() - e.timestamp < 300000), // Last 5 minutes
    
    // Connection health
    isHealthy: store.isConnected && store.errors.filter(e => e.severity === 'critical').length === 0
  }
}

// Action hooks for specific functionality
export const useSessionActions = () => {
  const { initialize, setConnectionState, reset } = useAppStore()
  
  return {
    startNewSession: () => {
      reset()
      initialize()
    },
    connect: () => setConnectionState('CONNECTING'),
    disconnect: () => setConnectionState('DISCONNECTED'),
    reconnect: () => setConnectionState('RECONNECTING')
  }
}

export const useVoiceActions = () => {
  const { setVoiceEnabled, setIsRecording, setAudioLevel, addTranscript } = useAppStore()
  
  return {
    enableVoice: () => setVoiceEnabled(true),
    disableVoice: () => setVoiceEnabled(false),
    startRecording: () => setIsRecording(true),
    stopRecording: () => setIsRecording(false),
    updateAudioLevel: setAudioLevel,
    addTranscript
  }
}

export const useAIActions = () => {
  const { setCurrentSubtitle, setAICursorPosition, updateKnowledgeGraph, clearKnowledgeGraph } = useAppStore()
  
  return {
    showSubtitle: setCurrentSubtitle,
    hideSubtitle: () => setCurrentSubtitle(null),
    moveAICursor: setAICursorPosition,
    hideAICursor: () => setAICursorPosition(null),
    updateKnowledge: updateKnowledgeGraph,
    clearKnowledge: clearKnowledgeGraph
  }
}

export const useErrorActions = () => {
  const { addError, clearErrors } = useAppStore()
  
  return {
    reportError: (code: string, message: string, context?: Record<string, any>, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') => {
      addError({
        code,
        message,
        context,
        severity,
        timestamp: Date.now()
      })
    },
    clearAllErrors: clearErrors
  }
}
