import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressStepsProps {
  currentStep: number;
  steps: string[];
}

export function ProgressSteps({ currentStep, steps }: ProgressStepsProps) {
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          
          return (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
                    isCompleted && "bg-success text-success-foreground",
                    isCurrent && "bg-accent text-accent-foreground shadow-glow animate-pulse-glow",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground border-2 border-border"
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : stepNumber}
                </div>
                <span
                  className={cn(
                    "mt-2 text-xs font-medium text-center max-w-[70px] hidden sm:block",
                    isCurrent && "text-accent font-semibold",
                    isCompleted && "text-success",
                    !isCompleted && !isCurrent && "text-muted-foreground"
                  )}
                >
                  {step}
                </span>
              </div>
              
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 rounded-full transition-all duration-300",
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
