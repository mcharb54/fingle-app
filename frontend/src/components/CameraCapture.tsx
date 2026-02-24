import { useEffect, useRef, useState } from 'react'

interface Props {
  onCapture: (blob: Blob, dataUrl: string) => void
}

export default function CameraCapture({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')

  useEffect(() => {
    startCamera()
    return () => stopCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode])

  async function startCamera() {
    stopCamera()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch {
      setError('Camera access denied. Please allow camera access and reload.')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
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
    <div className="relative w-full h-full bg-black">
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
