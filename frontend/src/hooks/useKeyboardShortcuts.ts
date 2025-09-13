import { useEffect, useCallback } from 'react'

type KeyboardShortcutHandler = (event: KeyboardEvent) => void
type ShortcutMap = Record<string, KeyboardShortcutHandler>

interface UseKeyboardShortcutsOptions {
  preventDefault?: boolean
  stopPropagation?: boolean
  disabled?: boolean
  target?: EventTarget | null
}

/**
 * Custom hook for handling keyboard shortcuts
 * 
 * @param shortcuts - Object mapping keyboard shortcuts to handlers
 * @param options - Configuration options
 * 
 * @example
 * useKeyboardShortcuts({
 *   'ctrl+s': () => save(),
 *   'ctrl+z': () => undo(),
 *   'Space': () => togglePlay(),
 *   'Escape': () => close(),
 *   'F11': () => toggleFullscreen()
 * })
 */
export const useKeyboardShortcuts = (
  shortcuts: ShortcutMap,
  options: UseKeyboardShortcutsOptions = {}
) => {
  const {
    preventDefault = true,
    stopPropagation = true,
    disabled = false,
    target = typeof window !== 'undefined' ? window : null
  } = options

  const normalizeKey = useCallback((key: string): string => {
    // Handle special cases for cross-browser compatibility
    const keyMap: Record<string, string> = {
      ' ': 'Space',
      'Spacebar': 'Space',
      'Esc': 'Escape',
      'Del': 'Delete',
      'Left': 'ArrowLeft',
      'Right': 'ArrowRight',
      'Up': 'ArrowUp',
      'Down': 'ArrowDown'
    }
    
    return keyMap[key] || key
  }, [])

  const createShortcutKey = useCallback((event: KeyboardEvent): string => {
    const parts: string[] = []
    
    if (event.ctrlKey || event.metaKey) parts.push('ctrl')
    if (event.altKey) parts.push('alt')
    if (event.shiftKey) parts.push('shift')
    
    const normalizedKey = normalizeKey(event.key)
    parts.push(normalizedKey)
    
    return parts.join('+').toLowerCase()
  }, [normalizeKey])

  const handleKeyDown = useCallback((event: Event) => {
    const keyboardEvent = event as KeyboardEvent
    if (disabled) return
    
    // Don't trigger shortcuts when typing in input fields
    const target = keyboardEvent.target as HTMLElement
    const isInputField = (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true' ||
      target.isContentEditable
    )
    
    if (isInputField) {
      // Allow some shortcuts even in input fields
      const allowedInInputs = ['ctrl+z', 'ctrl+y', 'ctrl+a', 'ctrl+c', 'ctrl+v', 'ctrl+x', 'escape']
      const shortcutKey = createShortcutKey(keyboardEvent)
      
      if (!allowedInInputs.includes(shortcutKey)) {
        return
      }
    }
    
    const shortcutKey = createShortcutKey(keyboardEvent)
    const handler = shortcuts[shortcutKey]
    
    if (handler) {
      if (preventDefault) {
        keyboardEvent.preventDefault()
      }
      if (stopPropagation) {
        keyboardEvent.stopPropagation()
      }
      
      try {
        handler(keyboardEvent)
      } catch (error) {
        console.error('Error executing keyboard shortcut:', error)
      }
    }
  }, [shortcuts, disabled, preventDefault, stopPropagation, createShortcutKey])

  useEffect(() => {
    if (!target || disabled) return

    target.addEventListener('keydown', handleKeyDown)
    
    return () => {
      target.removeEventListener('keydown', handleKeyDown)
    }
  }, [target, disabled, handleKeyDown])

  // Return utility functions for programmatic shortcut management
  return {
    createShortcutKey,
    normalizeKey,
    isInputFieldFocused: () => {
      const activeElement = document.activeElement as HTMLElement
      return (
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.contentEditable === 'true' ||
        activeElement?.isContentEditable
      )
    }
  }
}

/**
 * Hook for global keyboard shortcuts that work anywhere in the app
 */
export const useGlobalKeyboardShortcuts = (shortcuts: ShortcutMap) => {
  return useKeyboardShortcuts(shortcuts, {
    target: typeof window !== 'undefined' ? document : null,
    preventDefault: true,
    stopPropagation: false
  })
}

/**
 * Hook for component-specific keyboard shortcuts
 */
export const useLocalKeyboardShortcuts = (
  shortcuts: ShortcutMap,
  elementRef?: React.RefObject<HTMLElement>
) => {
  return useKeyboardShortcuts(shortcuts, {
    target: elementRef?.current || null,
    preventDefault: true,
    stopPropagation: true
  })
}

/**
 * Utility function to format shortcuts for display
 */
export const formatShortcut = (shortcut: string): string => {
  return shortcut
    .split('+')
    .map(part => {
      const formatMap: Record<string, string> = {
        'ctrl': '⌘', // Or 'Ctrl' on Windows/Linux
        'alt': '⌥', // Or 'Alt' on Windows/Linux
        'shift': '⇧',
        'space': 'Space',
        'escape': 'Esc',
        'delete': 'Del',
        'backspace': '⌫',
        'enter': '↵',
        'tab': '⇥',
        'arrowleft': '←',
        'arrowright': '→',
        'arrowup': '↑',
        'arrowdown': '↓'
      }
      
      return formatMap[part.toLowerCase()] || part.toUpperCase()
    })
    .join(' + ')
}

/**
 * Hook that provides common shortcuts and their formatted display
 */
export const useCommonShortcuts = () => {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const cmdKey = isMac ? '⌘' : 'Ctrl'
  
  return {
    copy: { key: 'ctrl+c', display: `${cmdKey} + C` },
    paste: { key: 'ctrl+v', display: `${cmdKey} + V` },
    cut: { key: 'ctrl+x', display: `${cmdKey} + X` },
    undo: { key: 'ctrl+z', display: `${cmdKey} + Z` },
    redo: { key: 'ctrl+y', display: `${cmdKey} + Y` },
    save: { key: 'ctrl+s', display: `${cmdKey} + S` },
    selectAll: { key: 'ctrl+a', display: `${cmdKey} + A` },
    find: { key: 'ctrl+f', display: `${cmdKey} + F` },
    newTab: { key: 'ctrl+t', display: `${cmdKey} + T` },
    refresh: { key: 'ctrl+r', display: `${cmdKey} + R` },
    fullscreen: { key: 'F11', display: 'F11' },
    escape: { key: 'Escape', display: 'Esc' },
    space: { key: 'Space', display: 'Space' },
    enter: { key: 'Enter', display: 'Enter' },
    delete: { key: 'Delete', display: 'Del' },
    backspace: { key: 'Backspace', display: '⌫' }
  }
}
