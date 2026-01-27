interface StepIndicatorProps {
  currentStep: number
  totalSteps?: number
}

/**
 * Step Indicator Component - Shows where you are in the create flow
 * Because we need to know where we are (unlike my GPS, this actually works)
 *
 * Renders numbered steps (1, 2, 3, 4) with connecting lines
 * Current step = accent; future steps = muted
 *
 * @author Juan - The developer who built this stepper
 * (Coded with care, humor, and probably too much coffee)
 */
export default function StepIndicator({ currentStep, totalSteps = 4 }: StepIndicatorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step <= currentStep
                  ? 'bg-dark-accent-primary text-white'
                  : 'bg-dark-bg-secondary border border-dark-border-primary text-dark-text-tertiary'
              }`}
            >
              {step}
            </div>
            {step < totalSteps && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  step < currentStep ? 'bg-dark-accent-primary' : 'bg-dark-bg-secondary'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Step 1 of 4. You've got this. 🎯
