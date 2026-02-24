interface Props {
  points: number
  isCountCorrect: boolean
  isFingersCorrect: boolean
  correctCount: number
  correctFingers: string[]
}

export default function PointsAnimation({ points, isCountCorrect, isFingersCorrect, correctCount, correctFingers }: Props) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/60 animate-pop-in">
      <div className="text-center">
        {points > 0 ? (
          <>
            <div className="text-7xl font-black text-brand-400 animate-float-up">
              +{points}
            </div>
            <p className="text-white font-bold text-2xl mt-2">
              {isFingersCorrect ? '🎯 Perfect!' : '✅ Correct count!'}
            </p>
            {isFingersCorrect && (
              <p className="text-brand-300 text-sm mt-1">Count + fingers = 30 pts</p>
            )}
          </>
        ) : (
          <>
            <div className="text-7xl mb-2">😬</div>
            <p className="text-white font-bold text-2xl">Wrong guess</p>
            <p className="text-gray-400 text-sm mt-1">
              It was {correctCount} — {correctFingers.join(', ')}
            </p>
          </>
        )}
        {isCountCorrect && !isFingersCorrect && (
          <p className="text-gray-300 text-sm mt-2">
            Fingers were: {correctFingers.join(', ')}
          </p>
        )}
      </div>
    </div>
  )
}
