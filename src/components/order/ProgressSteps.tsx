import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrder } from '@/context/OrderContext';

interface ProgressStepsProps {
  currentStep: number;
  steps: string[];
}

export function ProgressSteps({ currentStep, steps }: ProgressStepsProps) {
  const { setStep, canNavigateToStep } = useOrder();

  const handleStepClick = (stepNumber: number) => {
    // Can always go back to previous steps
    if (stepNumber < currentStep) {
      setStep(stepNumber);
      return;
    }
    // Can only go forward if all previous steps are complete
    if (canNavigateToStep(stepNumber)) {
      setStep(stepNumber);
    }
  };

  return (
    <div className="w-full py-6">
      {/* gleiche Breite wie der Hero-Block (AddressCheck: max-w-3xl mx-auto) */}
      <div className="flex items-center justify-center max-w-3xl mx-auto">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isClickable = stepNumber < currentStep || canNavigateToStep(stepNumber);
          
          return (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center">
                <button
                  onClick={() => handleStepClick(stepNumber)}
                  disabled={!isClickable}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
                    isCompleted && "bg-success text-success-foreground cursor-pointer hover:scale-110",
                    isCurrent && "bg-accent text-accent-foreground shadow-glow animate-pulse-glow",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground border-2 border-border",
                    isClickable && !isCurrent && "cursor-pointer hover:scale-105",
                    !isClickable && "cursor-not-allowed opacity-60"
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : stepNumber}
                </button>
                <span
                  className={cn(
                    "mt-2 text-xs font-medium text-center w-[70px] hidden sm:block",
                    isCurrent && "text-accent font-semibold",
                    isCompleted && "text-success",
                    !isCompleted && !isCurrent && "text-muted-foreground",
                    isClickable && "cursor-pointer"
                  )}
                  onClick={() => isClickable && handleStepClick(stepNumber)}
                >
                  {step}
                </span>
              </div>
              
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-8 sm:w-16 md:w-32 h-0.5 mx-1 sm:mx-2 rounded-full transition-all duration-300 flex-shrink-0",
                    stepNumber < currentStep ? "bg-success" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
