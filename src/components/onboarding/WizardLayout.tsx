import React from 'react'
import StepProgress from './StepProgress'

interface WizardLayoutProps {
  currentStep: number
  totalSteps: number
  stepTitle: string
  stepDescription: string
  onBack: () => void
  onNext: () => void
  onSkip: () => void
  onComplete: () => void
  isLoading: boolean
  error: string
  showBackButton: boolean
  showCompleteButton: boolean
  children: React.ReactNode
}

export default function WizardLayout({
  currentStep,
  totalSteps,
  stepTitle,
  stepDescription,
  onBack,
  onNext,
  onSkip,
  onComplete,
  isLoading,
  error,
  showBackButton,
  showCompleteButton,
  children,
}: WizardLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-400 mb-2">FinArt Setup</h1>
          <p className="text-slate-400 text-sm">Get your finances organized in 5 easy steps</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <StepProgress currentStep={currentStep} totalSteps={totalSteps} />
        </div>

        {/* Card */}
        <div className="card space-y-6">
          {/* Step Title */}
          <div className="text-center border-b border-slate-600 pb-4">
            <h2 className="text-2xl font-bold text-slate-200 mb-1">
              {stepTitle}
            </h2>
            <p className="text-sm text-slate-400">{stepDescription}</p>
          </div>

          {/* Step Content */}
          <div className="space-y-4">
            {children}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center gap-2 pt-4 border-t border-slate-600">
            {/* Left Side: Skip and Back buttons */}
            <div className="flex gap-2">
              <button
                onClick={onSkip}
                disabled={isLoading}
                className="text-slate-400 hover:text-slate-200 text-sm transition-colors disabled:opacity-50"
              >
                Skip
              </button>
              {showBackButton && (
                <button
                  onClick={onBack}
                  disabled={isLoading}
                  className="px-4 py-2 text-slate-300 hover:text-slate-200 transition-colors disabled:opacity-50"
                >
                  ← Back
                </button>
              )}
            </div>

            {/* Right Side: Next or Complete button */}
            <div className="ml-auto">
              <button
                onClick={showCompleteButton ? onComplete : onNext}
                disabled={isLoading}
                className="btn-primary"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </span>
                ) : showCompleteButton ? (
                  'Complete Setup'
                ) : (
                  'Next →'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
