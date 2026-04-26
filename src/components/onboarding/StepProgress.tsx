interface StepProgressProps {
  currentStep: number
  totalSteps: number
}

export default function StepProgress({ currentStep, totalSteps }: StepProgressProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNum = index + 1
        const isActive = stepNum === currentStep
        const isCompleted = stepNum < currentStep

        return (
          <div key={stepNum} className="flex-1 flex items-center">
            {/* Circle */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-500 text-white'
                  : isCompleted
                    ? 'bg-indigo-500/50 text-indigo-200'
                    : 'bg-slate-700 text-slate-400'
              }`}
            >
              {isCompleted ? '✓' : stepNum}
            </div>

            {/* Line to next step */}
            {index < totalSteps - 1 && (
              <div
                className={`flex-1 h-1 mx-2 transition-colors ${
                  isCompleted ? 'bg-indigo-500/50' : 'bg-slate-700'
                }`}
              />
            )}
          </div>
        )
      })}

      {/* Step counter text */}
      <div className="text-xs text-slate-400 ml-2">
        {currentStep}/{totalSteps}
      </div>
    </div>
  )
}
