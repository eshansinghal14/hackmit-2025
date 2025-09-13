import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import VoiceAssistant from './VoiceAssistant'

export default function App() {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw>
        <VoiceAssistant />
      </Tldraw>
    </div>
  )
}
