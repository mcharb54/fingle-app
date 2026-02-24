import { useEffect, useRef, useState } from 'react'
import type { FingerName } from '../types'

interface HandDetectResult {
  count: number
  fingers: FingerName[]
}

interface UseHandDetectReturn {
  modelReady: boolean
  detecting: boolean
  detect: (canvas: HTMLCanvasElement) => Promise<HandDetectResult | null>
}

// Finger tip and pip (proximal interphalangeal) keypoint indices from MediaPipe Hands
const FINGER_TIP_IDS = [4, 8, 12, 16, 20] as const
const FINGER_PIP_IDS = [2, 6, 10, 14, 18] as const
const FINGER_NAMES: FingerName[] = ['thumb', 'index', 'middle', 'ring', 'pinky']

export function useHandDetect(): UseHandDetectReturn {
  const detectorRef = useRef<unknown>(null)
  const [modelReady, setModelReady] = useState(false)
  const [detecting, setDetecting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadModel() {
      try {
        const tfjs = await import('@tensorflow/tfjs-core')
        await import('@tensorflow/tfjs-backend-webgl')
        await tfjs.ready()

        const handPoseDetection = await import('@tensorflow-models/hand-pose-detection')
        const model = handPoseDetection.SupportedModels.MediaPipeHands
        const detector = await handPoseDetection.createDetector(model, {
          runtime: 'mediapipe',
          solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
          modelType: 'lite',
        })

        if (!cancelled) {
          detectorRef.current = detector
          setModelReady(true)
        }
      } catch (err) {
        console.warn('Hand detection model failed to load, manual input will be used.', err)
        if (!cancelled) setModelReady(false)
      }
    }

    loadModel()
    return () => {
      cancelled = true
    }
  }, [])

  async function detect(canvas: HTMLCanvasElement): Promise<HandDetectResult | null> {
    if (!detectorRef.current || !modelReady) return null
    setDetecting(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = detectorRef.current as any
      const hands = await detector.estimateHands(canvas)
      if (!hands || hands.length === 0) return null

      const keypoints = hands[0].keypoints3D ?? hands[0].keypoints
      if (!keypoints || keypoints.length < 21) return null

      const extendedFingers: FingerName[] = []

      for (let i = 0; i < 5; i++) {
        const tipId = FINGER_TIP_IDS[i]
        const pipId = FINGER_PIP_IDS[i]

        if (i === 0) {
          // Thumb: compare x position relative to MCP
          const mcpId = 1
          const isRight = keypoints[0].x < keypoints[mcpId].x
          const extended = isRight
            ? keypoints[tipId].x > keypoints[pipId].x
            : keypoints[tipId].x < keypoints[pipId].x
          if (extended) extendedFingers.push(FINGER_NAMES[i])
        } else {
          // Other fingers: tip y < pip y means finger is pointing up (extended)
          if (keypoints[tipId].y < keypoints[pipId].y) {
            extendedFingers.push(FINGER_NAMES[i])
          }
        }
      }

      return { count: extendedFingers.length, fingers: extendedFingers }
    } catch {
      return null
    } finally {
      setDetecting(false)
    }
  }

  return { modelReady, detecting, detect }
}
