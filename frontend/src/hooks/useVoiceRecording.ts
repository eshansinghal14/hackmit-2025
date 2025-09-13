import { useState, useRef, useCallback, useEffect } from 'react'
import { useAppStore, useVoiceActions } from '@/store/appStore'
import { useVoiceWebSocket } from '@/hooks/useWebSocket'

interface VoiceRecordingConfig {
  sampleRate?: number
  channels?: number
  bufferSize?: number
  vadThreshold?: number
  silenceDuration?: number
}

interface UseVoiceRecordingReturn {
  isRecording: boolean
  isPaused: boolean
  audioLevel: number
  isSupported: boolean
  error: string | null
  startRecording: () => Promise<void>
  stopRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  toggleRecording: () => Promise<void>
}

const DEFAULT_CONFIG: Required<VoiceRecordingConfig> = {
  sampleRate: 16000,
  channels: 1,
  bufferSize: 4096,
  vadThreshold: 0.01,
  silenceDuration: 1000 // ms
}

export const useVoiceRecording = (
  config: VoiceRecordingConfig = {}
): UseVoiceRecordingReturn => {
  // Merge config with defaults
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  
  // State
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isSupported] = useState(() => {
    return !!(navigator?.mediaDevices?.getUserMedia && 
             (window.AudioContext || (window as any).webkitAudioContext))
  })
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const vadTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const chunksRef = useRef<Blob[]>([])
  
  // Store actions
  const { voiceEnabled } = useAppStore()
  const { updateAudioLevel, addTranscript } = useVoiceActions()
  const { sendVoiceChunk, sendUserIntent } = useVoiceWebSocket()
  
  // Audio level monitoring
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return
    
    const analyser = analyserRef.current
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    
    analyser.getByteFrequencyData(dataArray)
    
    // Calculate RMS (Root Mean Square) for audio level
    let sum = 0
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i] * dataArray[i]
    }
    const rms = Math.sqrt(sum / bufferLength)
    const level = rms / 255 // Normalize to 0-1
    
    setAudioLevel(level)
    updateAudioLevel(level)
    
    // Voice Activity Detection (simple threshold-based)
    const isVoiceDetected = level > finalConfig.vadThreshold
    
    if (isVoiceDetected) {
      // Clear silence timeout if voice is detected
      if (vadTimeoutRef.current) {
        clearTimeout(vadTimeoutRef.current)
        vadTimeoutRef.current = null
      }
    } else {
      // Start silence timeout if not already started
      if (!vadTimeoutRef.current) {
        vadTimeoutRef.current = setTimeout(() => {
          // Handle silence (could trigger automatic pause or processing)
          console.log('🔇 Voice activity ended')
        }, finalConfig.silenceDuration)
      }
    }
    
    if (isRecording && !isPaused) {
      animationFrameRef.current = requestAnimationFrame(monitorAudioLevel)
    }
  }, [isRecording, isPaused, finalConfig.vadThreshold, finalConfig.silenceDuration, updateAudioLevel])
  
  // Initialize audio context and analyser
  const setupAudioContext = useCallback(async (stream: MediaStream) => {
    try {
      // Create audio context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      const audioContext = new AudioContextClass()
      audioContextRef.current = audioContext
      
      // Create analyser for audio level monitoring
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      analyser.minDecibels = -90
      analyser.maxDecibels = -10
      analyser.smoothingTimeConstant = 0.85
      analyserRef.current = analyser
      
      // Connect stream to analyser
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      
      console.log('🎤 Audio context initialized')
      
    } catch (error) {
      console.error('❌ Failed to setup audio context:', error)
      setError('Failed to setup audio processing')
    }
  }, [])
  
  // Start recording
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Voice recording is not supported in this browser')
      return
    }
    
    if (!voiceEnabled) {
      setError('Voice is disabled. Please enable voice in settings.')
      return
    }
    
    try {
      setError(null)
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: finalConfig.sampleRate,
          channelCount: finalConfig.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      })
      
      streamRef.current = stream
      
      // Setup audio context for level monitoring
      await setupAudioContext(stream)
      
      // Create MediaRecorder for audio data
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus' // Fallback to available format
      })
      mediaRecorderRef.current = mediaRecorder
      
      chunksRef.current = []
      
      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
          
          // Send audio chunk to WebSocket
          event.data.arrayBuffer().then(buffer => {
            sendVoiceChunk(buffer)
          })
        }
      }
      
      // Handle recording stop
      mediaRecorder.onstop = () => {
        if (chunksRef.current.length > 0) {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
          console.log('🎤 Recording completed:', audioBlob.size, 'bytes')
        }
      }
      
      // Start recording
      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      setIsPaused(false)
      
      // Start audio level monitoring
      monitorAudioLevel()
      
      console.log('🎤 Recording started')
      
    } catch (error) {
      console.error('❌ Failed to start recording:', error)
      setError(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [isSupported, voiceEnabled, finalConfig, setupAudioContext, monitorAudioLevel, sendVoiceChunk])
  
  // Stop recording
  const stopRecording = useCallback(() => {
    try {
      // Stop media recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      
      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      
      // Stop stream tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      
      // Clear timeouts and animation frames
      if (vadTimeoutRef.current) {
        clearTimeout(vadTimeoutRef.current)
        vadTimeoutRef.current = null
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      
      setIsRecording(false)
      setIsPaused(false)
      setAudioLevel(0)
      updateAudioLevel(0)
      
      console.log('🎤 Recording stopped')
      
    } catch (error) {
      console.error('❌ Failed to stop recording:', error)
      setError('Failed to stop recording')
    }
  }, [updateAudioLevel])
  
  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      
      console.log('⏸️ Recording paused')
    }
  }, [])
  
  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      
      // Restart audio level monitoring
      monitorAudioLevel()
      
      console.log('▶️ Recording resumed')
    }
  }, [monitorAudioLevel])
  
  // Toggle recording
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording()
    } else {
      await startRecording()
    }
  }, [isRecording, startRecording, stopRecording])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording()
    }
  }, [stopRecording])
  
  // Handle voice enabled/disabled
  useEffect(() => {
    if (!voiceEnabled && isRecording) {
      stopRecording()
    }
  }, [voiceEnabled, isRecording, stopRecording])
  
  return {
    isRecording,
    isPaused,
    audioLevel,
    isSupported,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    toggleRecording
  }
}

// Additional hook for push-to-talk functionality
export const usePushToTalk = (key: string = 'Space') => {
  const { toggleRecording } = useVoiceRecording()
  const isHeldRef = useRef(false)
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === key && !event.repeat && !isHeldRef.current) {
        event.preventDefault()
        isHeldRef.current = true
        toggleRecording()
      }
    }
    
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === key && isHeldRef.current) {
        event.preventDefault()
        isHeldRef.current = false
        toggleRecording()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [key, toggleRecording])
  
  return { isHeld: isHeldRef.current }
}
