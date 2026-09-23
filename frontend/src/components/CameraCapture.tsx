import { useEffect, useRef, useState } from 'react'
import Icon from './ui/Icon'
import HandGlyph from './ui/HandGlyph'

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
      <div className="flex flex-col items-center justify-center h-full graph text-center p-6">
        <HandGlyph raised={['index']} className="w-16 text-pen mb-4" />
        <p className="note-error">{error}</p>
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
        className="absolute top-3 right-3 w-11 h-11 rounded-full bg-white border-2 border-pen text-pen flex items-center justify-center"
        aria-label="Flip camera"
      >
        <Icon name="flip" className="w-6 h-6" />
      </button>

      {/* Zoom slider — only shown for back camera when zoom is supported */}
      {facingMode === 'environment' && zoomRange && (
        <div className="absolute top-4 left-4 right-16 flex items-center gap-2">
          <span className="text-pen text-sm bg-white border-2 border-pen rounded-md px-1.5 tabular-nums w-12 text-center">
            {zoom.toFixed(1)}×
          </span>
          <input
            type="range"
            min={zoomRange.min}
            max={zoomRange.max}
            step={(zoomRange.max - zoomRange.min) / 100}
            value={zoom}
            onChange={(e) => applyZoom(parseFloat(e.target.value))}
            className="flex-1 accent-[#F3FF4F] h-1"
          />
        </div>
      )}

      {/* Capture button */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center">
        <button
          onClick={capture}
          className="w-20 h-20 rounded-full border-[5px] border-white bg-hi active:scale-90 transition-transform shadow-[0_0_0_2px_#1F3BA6]"
          aria-label="Take photo"
        />
      </div>
    </div>
  )
}
