import { useEffect, useRef, useState } from 'react'

interface Props {
  onCapture: (blob: Blob, dataUrl: string) => void
}

export default function CameraCapture({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const trackRef = useRef<MediaStreamTrack | null>(null)
  const lastPinchDistRef = useRef<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [zoom, setZoom] = useState(1)
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number } | null>(null)

  useEffect(() => {
    startCamera()
    return () => stopCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode])

  async function startCamera() {
    stopCamera()
    setZoom(1)
    setZoomRange(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      const track = stream.getVideoTracks()[0]
      trackRef.current = track
      // Check if zoom is supported
      const capabilities = track.getCapabilities() as MediaTrackCapabilities & { zoom?: { min: number; max: number; step: number } }
      if (capabilities.zoom && capabilities.zoom.max > capabilities.zoom.min) {
        setZoomRange({ min: capabilities.zoom.min, max: capabilities.zoom.max })
        setZoom(capabilities.zoom.min)
      }
    } catch {
      setError('Camera access denied. Please allow camera access and reload.')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    trackRef.current = null
  }

  async function applyZoom(value: number) {
    if (!trackRef.current || !zoomRange) return
    const clamped = Math.min(zoomRange.max, Math.max(zoomRange.min, value))
    try {
      await trackRef.current.applyConstraints({ advanced: [{ zoom: clamped } as MediaTrackConstraintSet] })
      setZoom(clamped)
    } catch {
      // Zoom not supported on this device — silently ignore
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastPinchDistRef.current = Math.hypot(dx, dy)
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && lastPinchDistRef.current !== null && zoomRange) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      const scale = dist / lastPinchDistRef.current
      applyZoom(zoom * scale)
      lastPinchDistRef.current = dist
    }
  }

  function handleTouchEnd() {
    lastPinchDistRef.current = null
  }

  function capture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
        onCapture(blob, dataUrl)
      },
      'image/jpeg',
      0.9,
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-zinc-900 text-center p-6">
        <div className="text-4xl mb-3">📷</div>
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div
      className="relative w-full h-full bg-black"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Flip camera button */}
      <button
        onClick={() => setFacingMode((f) => (f === 'user' ? 'environment' : 'user'))}
        className="absolute top-4 right-4 bg-black/50 rounded-full p-2 text-white text-xl"
      >
        🔄
      </button>

      {/* Zoom slider — only shown for back camera when zoom is supported */}
      {facingMode === 'environment' && zoomRange && (
        <div className="absolute top-4 left-4 right-16 flex items-center gap-2">
          <span className="text-white text-xs bg-black/50 rounded px-1.5 py-0.5 tabular-nums w-10 text-center">
            {zoom.toFixed(1)}×
          </span>
          <input
            type="range"
            min={zoomRange.min}
            max={zoomRange.max}
            step={(zoomRange.max - zoomRange.min) / 100}
            value={zoom}
            onChange={(e) => applyZoom(parseFloat(e.target.value))}
            className="flex-1 accent-white h-1"
          />
        </div>
      )}

      {/* Capture button */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center">
        <button
          onClick={capture}
          className="w-20 h-20 rounded-full border-4 border-white bg-white/20 active:bg-white/40 transition-colors"
        />
      </div>
    </div>
  )
}
