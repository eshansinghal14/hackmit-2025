import { useState, useEffect, useRef, useCallback } from 'react'

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: (event: SpeechRecognitionEvent) => void
  onerror: (event: SpeechRecognitionErrorEvent) => void
  onstart: () => void
  onend: () => void
}

interface SpeechRecognitionStatic {
  new(): SpeechRecognition
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic
    webkitSpeechRecognition: SpeechRecognitionStatic
  }
}

export interface UseWebSpeechAPIReturn {
  isListening: boolean
  transcript: string
  interimTranscript: string
  finalTranscript: string
  isSupported: boolean
  startListening: () => void
  stopListening: () => void
  toggleListening: () => void
  clearTranscript: () => void
  error: string | null
}

export const useWebSpeechAPI = (
  options: {
    continuous?: boolean
    interimResults?: boolean
    lang?: string
    onFinalTranscript?: (transcript: string) => void
    onInterimTranscript?: (transcript: string) => void
    onError?: (error: string) => void
  } = {}
): UseWebSpeechAPIReturn => {
  const {
    continuous = true,
    interimResults = true,
    lang = 'en-US',
    onFinalTranscript,
    onInterimTranscript,
    onError
  } = options

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  const recognition = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      console.error('🎤 Speech recognition not supported in this browser')
      setError('Speech recognition not supported in this browser')
      setIsSupported(false)
      return
    }

    setIsSupported(true)

    // Initialize speech recognition
    recognition.current = new SpeechRecognition()
    recognition.current.continuous = continuous
    recognition.current.interimResults = interimResults
    recognition.current.lang = lang

    recognition.current.onstart = () => {
      console.log('🎤 Speech recognition started')
      setIsListening(true)
      setError(null)
    }

    recognition.current.onresult = (event: SpeechRecognitionEvent) => {
      let currentInterimTranscript = ''
      let currentFinalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i][0].transcript
        
        if (event.results[i].isFinal) {
          currentFinalTranscript += result + ' '
        } else {
          currentInterimTranscript += result
        }
      }

      // Update state
      if (currentInterimTranscript) {
        setInterimTranscript(currentInterimTranscript)
        setTranscript(currentInterimTranscript)
        onInterimTranscript?.(currentInterimTranscript)
      }

      if (currentFinalTranscript.trim()) {
        const cleanFinalTranscript = currentFinalTranscript.trim()
        setFinalTranscript(prev => prev + cleanFinalTranscript + ' ')
        setTranscript(cleanFinalTranscript)
        setInterimTranscript('')
        
        console.log('🎤 Final transcript:', cleanFinalTranscript)
        onFinalTranscript?.(cleanFinalTranscript)
      }
    }

    recognition.current.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('🎤 Speech recognition error:', event.error)
      setError(`Speech recognition error: ${event.error}`)
      setIsListening(false)
      onError?.(event.error)
    }

    recognition.current.onend = () => {
      console.log('🎤 Speech recognition ended')
      setIsListening(false)
    }

    return () => {
      if (recognition.current) {
        recognition.current.stop()
      }
    }
  }, [continuous, interimResults, lang, onFinalTranscript, onInterimTranscript, onError])

  const startListening = useCallback(() => {
    if (!recognition.current || !isSupported) {
      setError('Speech recognition not available')
      return
    }

    if (isListening) return

    try {
      recognition.current.start()
    } catch (error) {
      console.error('Error starting speech recognition:', error)
      setError('Failed to start speech recognition')
    }
  }, [isSupported, isListening])

  const stopListening = useCallback(() => {
    if (!recognition.current || !isListening) return

    recognition.current.stop()
  }, [isListening])

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  const clearTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setFinalTranscript('')
  }, [])

  return {
    isListening,
    transcript,
    interimTranscript,
    finalTranscript,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    error
  }
}
