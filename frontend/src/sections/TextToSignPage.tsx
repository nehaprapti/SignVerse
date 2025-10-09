import React, { useState } from 'react';
import { FaPlay, FaPause, FaRedo } from 'react-icons/fa';
import PoseAvatarViewer from "../components/PoseAvatarViewer";
import femaleGLB from '../assets/female.glb'
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'

function CanvasWrapper({ children }: { children: any }) {
  const [reloadKey, setReloadKey] = React.useState(0)

  const handleContextLost = React.useCallback((e: Event) => {
    // Prevent default to allow restoration and remount the canvas
    e.preventDefault()
    console.warn('WebGL context lost, remounting canvas...')
    setReloadKey((k) => k + 1)
  }, [])

  const onCreated = React.useCallback((state: any) => {
    const el = state.gl?.domElement
    if (!el) return

    // Throttle device pixel ratio to reduce GPU load and avoid context loss on weaker devices
    try {
      const deviceDPR = window.devicePixelRatio || 1
      // cap DPR to a reasonable value (1.5) and reduce a bit for safety
      const capped = Math.min(deviceDPR, 1.5) * 0.9
      state.gl.setPixelRatio(capped)
      // optionally disable antialias for lower cost
      if (state.gl.getContext) {
        try { state.gl.getContext() } catch {}
      }
      console.log(`[Canvas] set pixel ratio to ${capped.toFixed(2)}`)
    } catch (e) {
      console.warn('Could not set pixel ratio on GL context', e)
    }

    // Throttle device pixel ratio to reduce GPU load and avoid context loss on weaker devices
    try {
      const deviceDPR = window.devicePixelRatio || 1
      // cap DPR to a reasonable value (1.5) and reduce a bit for safety
      const capped = Math.min(deviceDPR, 1.5) * 0.9
      state.gl.setPixelRatio(capped)
      // optionally disable antialias for lower cost - no-op placeholder removed to satisfy lint
      console.log(`[Canvas] set pixel ratio to ${capped.toFixed(2)}`)
    } catch (e) {
      console.warn('Could not set pixel ratio on GL context', e)
    }

    el.addEventListener('webglcontextlost', handleContextLost, false)
    // cleanup when canvas is disposed
    const cleanup = () => el.removeEventListener('webglcontextlost', handleContextLost)
    // attach cleanup to state for r3f dispose cycle
    return cleanup
  }, [handleContextLost])

  return (
    <Canvas key={reloadKey} camera={{ position: [0, 1.6, 3] }} onCreated={onCreated}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[0, 10, 5]} intensity={1} />
      <Suspense fallback={null}>{children}</Suspense>
    </Canvas>
  )
}

const TextToSignPage = () => {
  const [inputText, setInputText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [animationFrames, setAnimationFrames] = useState([]);

  const handleTranslate = async () => {
    if (!inputText.trim()) return
    try {
      // Call backend API
      const requested = inputText.trim().toLowerCase()
      console.log('[TextToSign] requesting animation for:', requested)
      const res = await fetch('http://localhost:5000/text-to-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: requested })
      })
      // Safely parse JSON - some error responses may be empty
      let data = null
      try {
        data = await res.json()
      } catch (e) {
        data = { error: 'Invalid response from server' }
      }
      if (res.ok && data.animation) {
        console.log('[TextToSign] animation frames received:', (data.animation || []).length)
        setAnimationFrames(data.animation)
        setIsPlaying(true)
        setCurrentWord(requested)
      } else {
        console.warn('[TextToSign] backend error or no animation:', data)
        // Clear any previous animation so the avatar doesn't keep playing the old sign
        setAnimationFrames([])
        setIsPlaying(false)
        setCurrentWord(null)
        alert(data.error || 'Animation not found')
      }
    } catch (err) {
      console.error(err)
      alert('Failed to fetch animation')
    }
  }

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setAnimationFrames([])
    setCurrentWord(null)
  };

  const [currentWord, setCurrentWord] = useState<string | null>(null)

  return (
    <section className="bg-gray-900 text-white min-h-screen flex items-center justify-center px-6 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl w-full">
        
        {/* Left Side - Text Input */}
        <div className="bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col items-center justify-start text-center">
          <h2 className="text-2xl font-bold mb-4 text-yellow-400">Text Input</h2>
          
          {/* Language Selection */}
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="w-full mb-4 p-2 rounded-lg bg-gray-700 text-white border-2 border-yellow-400 focus:outline-none"
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>

          {/* Text Input Area */}
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter your text here..."
            className="w-full h-40 p-4 mb-4 rounded-lg bg-gray-700 text-white border-2 border-yellow-400 focus:outline-none resize-none"
          />

          {/* Control Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleTranslate}
              disabled={!inputText.trim() || isPlaying}
              className="bg-yellow-400 text-gray-900 font-semibold px-6 py-3 rounded-lg hover:bg-yellow-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Translate
            </button>
            <button
              onClick={handleReset}
              disabled={!inputText.trim()}
              className="bg-gray-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-gray-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Right Side - Avatar Animation */}
        <div className="bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center text-center">
          <h2 className="text-2xl font-bold mb-4 text-yellow-400">Sign Language Avatar</h2>
          
          {/* Avatar Container */}
          <div className="w-full h-[400px] rounded-lg border-2 border-yellow-400 bg-gray-700 mb-6 flex items-center justify-center">
            {animationFrames && animationFrames.length > 0 ? (
              <div className="w-full h-full">
                <CanvasWrapper>
                  <PoseAvatarViewer glbPath={femaleGLB} animationFrames={animationFrames} play={isPlaying} />
                </CanvasWrapper>
              </div>
            ) : (
              <div className="text-gray-400">Enter text and click translate to begin</div>
            )}
          </div>

          <div className="text-sm text-gray-300">
            {currentWord ? (
              <>
                Loaded: <span className="font-semibold text-yellow-300">{currentWord}</span> — Frames: <span className="font-mono">{animationFrames?.length ?? 0}</span>
              </>
            ) : (
              <span>No animation loaded</span>
            )}
          </div>

          {/* Playback Controls */}
          <div className="flex gap-4">
            {isPlaying ? (
              <button
                onClick={handlePause}
                className="bg-yellow-400 text-gray-900 font-semibold px-6 py-3 rounded-lg hover:bg-yellow-300 transition flex items-center gap-2"
              >
                <FaPause /> Pause
              </button>
            ) : (
              <button
                onClick={handleTranslate}
                disabled={!inputText.trim()}
                className="bg-yellow-400 text-gray-900 font-semibold px-6 py-3 rounded-lg hover:bg-yellow-300 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaPlay /> Play
              </button>
            )}
            <button
              onClick={handleReset}
              className="bg-gray-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-gray-500 transition flex items-center gap-2"
            >
              <FaRedo /> Reset
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TextToSignPage;
