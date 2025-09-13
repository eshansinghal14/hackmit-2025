import { useCallback, useRef } from 'react'
import { Editor } from 'tldraw'

export interface ScreenshotOptions {
  format?: 'png' | 'jpeg' | 'webp'
  quality?: number
  padding?: number
  background?: string
  darkMode?: boolean
}

export interface UseScreenshotCaptureReturn {
  captureScreenshot: (options?: ScreenshotOptions) => Promise<string | null>
  captureWhiteboardArea: (editor: Editor | null, options?: ScreenshotOptions) => Promise<string | null>
  isCapturing: boolean
}

export const useScreenshotCapture = (): UseScreenshotCaptureReturn => {
  const isCapturingRef = useRef(false)

  const captureScreenshot = useCallback(async (options: ScreenshotOptions = {}): Promise<string | null> => {
    if (isCapturingRef.current) {
      console.warn('🖼️ Screenshot capture already in progress')
      return null
    }

    try {
      isCapturingRef.current = true
      console.log('🖼️ Capturing screenshot...')

      const {
        format = 'png',
        quality = 0.9,
        padding = 20,
        background = '#ffffff',
      } = options

      // Find the TLdraw canvas element
      const tldrawContainer = document.querySelector('.tl-container') as HTMLElement
      if (!tldrawContainer) {
        throw new Error('TLdraw container not found')
      }

      // Use html2canvas for screenshot capture
      const html2canvas = (await import('html2canvas')).default
      
      const canvas = await html2canvas(tldrawContainer, {
        backgroundColor: background,
        scale: 2, // High DPI
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: tldrawContainer.offsetWidth,
        height: tldrawContainer.offsetHeight,
      })

      // Convert to base64
      const dataUrl = canvas.toDataURL(`image/${format}`, quality)
      
      console.log('🖼️ Screenshot captured successfully')
      return dataUrl

    } catch (error) {
      console.error('❌ Error capturing screenshot:', error)
      return null
    } finally {
      isCapturingRef.current = false
    }
  }, [])

  const captureWhiteboardArea = useCallback(async (
    editor: Editor | null, 
    options: ScreenshotOptions = {}
  ): Promise<string | null> => {
    if (!editor || isCapturingRef.current) {
      console.warn('🖼️ Editor not available or capture in progress')
      return null
    }

    try {
      isCapturingRef.current = true
      console.log('🖼️ Capturing whiteboard area...')

      const {
        format = 'png',
        quality = 0.9,
        padding = 20,
        background = '#ffffff',
        darkMode = false
      } = options

      // Use TLdraw's built-in export functionality
      const shapeIds = editor.getCurrentPageShapeIds()
      const shapeIdsArray = Array.from(shapeIds) // Convert Set to Array
      
      const svg = await editor.getSvgString(shapeIdsArray, {
        background: true,
        bounds: editor.getCurrentPageBounds(),
        darkMode,
        padding
      })

      if (!svg) {
        throw new Error('Failed to generate SVG from TLdraw')
      }

      // Convert SVG to canvas and then to base64
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }

      // Create image from SVG
      const img = new Image()
      const svgBlob = new Blob([svg.svg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(svgBlob)

      return new Promise((resolve) => {
        img.onload = () => {
          canvas.width = svg.width
          canvas.height = svg.height
          
          // Fill background
          ctx.fillStyle = background
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          
          // Draw the SVG
          ctx.drawImage(img, 0, 0)
          
          // Convert to base64
          const dataUrl = canvas.toDataURL(`image/${format}`, quality)
          
          URL.revokeObjectURL(url)
          console.log('🖼️ Whiteboard screenshot captured successfully')
          resolve(dataUrl)
        }
        
        img.onerror = () => {
          URL.revokeObjectURL(url)
          console.error('❌ Failed to load SVG image')
          resolve(null)
        }
        
        img.src = url
      })

    } catch (error) {
      console.error('❌ Error capturing whiteboard area:', error)
      return null
    } finally {
      isCapturingRef.current = false
    }
  }, [])

  return {
    captureScreenshot,
    captureWhiteboardArea,
    isCapturing: isCapturingRef.current
  }
}
