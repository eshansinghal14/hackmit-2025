import { useEffect, useCallback, useRef } from 'react'
import { Editor } from 'tldraw'
import { useScreenshotCapture } from '@/hooks/useScreenshotCapture'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useAppStore } from '@/store/appStore'

interface VoiceScreenshotConfig {
  silenceThreshold?: number // ms of silence before triggering screenshot
  vadThreshold?: number // voice activity detection threshold
  enabled?: boolean
  throttleInterval?: number // minimum ms between screenshots to prevent rate limiting
}

interface UseVoiceScreenshotIntegrationReturn {
  isEnabled: boolean
  setEnabled: (enabled: boolean) => void
  captureOnSpeechEnd: () => Promise<void>
}

const DEFAULT_CONFIG: Required<VoiceScreenshotConfig> = {
  silenceThreshold: 1500, // 1.5 seconds of silence
  vadThreshold: 0.01,
  enabled: true,
  throttleInterval: 10000 // 10 seconds minimum between screenshots
}

export const useVoiceScreenshotIntegration = (
  editor: Editor | null,
  config: VoiceScreenshotConfig = {}
): UseVoiceScreenshotIntegrationReturn => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  
  // State and refs
  const isEnabledRef = useRef(finalConfig.enabled)
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSpeechTimeRef = useRef<number>(0)
  const isCapturingRef = useRef(false)
  const lastScreenshotTimeRef = useRef<number>(0)
  
  // Hooks
  const { captureWhiteboardArea } = useScreenshotCapture()
  const { sendMessage } = useWebSocket()
  const { voiceEnabled } = useAppStore()
  
  const setEnabled = useCallback((enabled: boolean) => {
    isEnabledRef.current = enabled
  }, [])
  
  // Function to capture and send screenshot as AI context
  const captureOnSpeechEnd = useCallback(async () => {
    if (!isEnabledRef.current || !editor || isCapturingRef.current || !voiceEnabled) {
      return
    }
    
    // Check throttle interval to prevent rate limiting
    const currentTime = Date.now()
    if (currentTime - lastScreenshotTimeRef.current < finalConfig.throttleInterval) {
      console.log(`🎤📸 Screenshot throttled - last capture was ${Math.round((currentTime - lastScreenshotTimeRef.current) / 1000)}s ago`)
      return
    }
    
    try {
      isCapturingRef.current = true
      console.log('🎤📸 Capturing screenshot after speech ended...')
      
      // Capture the whiteboard area
      const screenshotDataUrl = await captureWhiteboardArea(editor, {
        format: 'png',
        quality: 0.8,
        background: '#ffffff'
      })
      
      if (screenshotDataUrl) {
        // Update last screenshot time
        lastScreenshotTimeRef.current = currentTime
        
        // Send screenshot as AI context via WebSocket
        sendMessage({
          type: 'screenshot_context',
          image: screenshotDataUrl,
          trigger: 'speech_end',
          timestamp: currentTime,
          metadata: {
            captureTime: new Date().toISOString(),
            source: 'voice_activity_detection'
          }
        })
        
        console.log('🎤📸 Screenshot captured and sent as AI context')
      } else {
        console.warn('🎤📸 Failed to capture screenshot')
      }
      
    } catch (error) {
      console.error('🎤📸 Error capturing screenshot on speech end:', error)
    } finally {
      isCapturingRef.current = false
    }
  }, [editor, captureWhiteboardArea, sendMessage, voiceEnabled])
  
  // Monitor voice activity and detect speech end
  const handleVoiceActivity = useCallback((isVoiceDetected: boolean, audioLevel: number) => {
    if (!isEnabledRef.current || !voiceEnabled) {
      return
    }
    
    const currentTime = Date.now()
    
    if (isVoiceDetected && audioLevel > finalConfig.vadThreshold) {
      // Voice detected - update last speech time and clear silence timeout
      lastSpeechTimeRef.current = currentTime
      
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
        silenceTimeoutRef.current = null
      }
    } else {
      // No voice detected - start or continue silence timer
      if (!silenceTimeoutRef.current && lastSpeechTimeRef.current > 0) {
        silenceTimeoutRef.current = setTimeout(() => {
          console.log('🎤📸 Speech ended - triggering screenshot capture')
          captureOnSpeechEnd()
          silenceTimeoutRef.current = null
        }, finalConfig.silenceThreshold)
      }
    }
  }, [finalConfig.vadThreshold, finalConfig.silenceThreshold, captureOnSpeechEnd, voiceEnabled])
  
  // Cleanup on unmount or config change
  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
        silenceTimeoutRef.current = null
      }
    }
  }, [])
  
  // Reset when voice is disabled
  useEffect(() => {
    if (!voiceEnabled) {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
        silenceTimeoutRef.current = null
      }
      lastSpeechTimeRef.current = 0
    }
  }, [voiceEnabled])
  
  return {
    isEnabled: isEnabledRef.current,
    setEnabled,
    captureOnSpeechEnd,
    // Export the voice activity handler so it can be used by voice recording hook
    handleVoiceActivity
  } as UseVoiceScreenshotIntegrationReturn & { handleVoiceActivity: typeof handleVoiceActivity }
}

// Hook specifically for integrating with existing voice recording
export const useVoiceScreenshotMonitor = (editor: Editor | null) => {
  const integration = useVoiceScreenshotIntegration(editor)
  
  // This hook can be used to monitor existing voice recording systems
  // and trigger screenshots when appropriate
  
  return integration
}
