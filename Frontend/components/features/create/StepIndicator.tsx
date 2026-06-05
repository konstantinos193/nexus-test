/**
 * StepIndicator - Horizontal progress stepper for the Create flow.
 * Numbered circles connected by horizontal lines. Current and past steps fill with accent.
 * Future steps are muted grey because they haven't been earned yet.
 *
 * This is the simple version. CreatePageContent uses the fancier VerticalSteps sidebar.
 * This one renders wherever you drop it — flat, horizontal, compact.
 * No labels, no hints, no tooltips. Just circles and lines.
 * (Sometimes all you need is a number. This component respects that.)
 *
 * @author Juan - The developer who built this stepper and counted to four.
 * (Coded with care, humor, and the quiet satisfaction of knowing exactly where you are.)
 */

// Props — currentStep and totalSteps.
// totalSteps defaults to 4 because this is a 4-step wizard and we're realistic.
// Pass a different value if you're feeling adventurous or have more steps than expected.
interface StepIndicatorProps {
  currentStep: number
  totalSteps?: number
}

/**
 * StepIndicator — renders `totalSteps` numbered circles with connecting lines.
 * Steps at or before currentStep get accent styling (filled, colored).
 * Steps after currentStep get muted styling (hollow, grey).
 * Connecting lines fill when the preceding step is complete.
 * That's the whole thing. That's the component. It does one thing and it does it.
 */
export default function StepIndicator({ currentStep, totalSteps = 4 }: StepIndicatorProps) {
  return (
    // mb-8 — space below the stepper before the form content.
    // Because cramming a progress indicator directly onto a form is uncivilized.
    <div className="mb-8">
      {/* Steps row — horizontal flex, items stretch to fill the container width.
          flex-1 on each item so they divide space evenly. Satisfying math. */}
      <div className="flex items-center justify-between">
        {/* Generate steps 1 through totalSteps. Array.from is clean and readable.
            No off-by-one errors. We checked twice. We checked a third time. */}
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex items-center flex-1">
            {/* Step circle — filled with accent when active or past, hollow when future.
                10×10 rounded-full. Font semibold. Transitions smoothly on class change. */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                // step <= currentStep = already here or past. Accent color. You earned it.
                // step > currentStep = not yet. Grey background, grey text, grey border.
                step <= currentStep
                  ? 'bg-dark-accent-primary text-white'
                  : 'bg-dark-bg-secondary border border-dark-border-primary text-dark-text-tertiary'
              }`}
            >
              {step}
            </div>
            {/* Connecting line — only renders between steps, not after the last one.
                Filled when the step before the gap is complete (step < currentStep).
                Unfilled when the step after the gap hasn't been reached.
                It's a line. An h-1. It communicates a lot for an h-1. */}
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

// Coded by Juan — four circles, three lines, one principle: you are here.
// Step 1 of 4. The stepper says so. The stepper is never wrong.
// Complete Step 4 and it fills in all the way. That's the dream. Chase it.
