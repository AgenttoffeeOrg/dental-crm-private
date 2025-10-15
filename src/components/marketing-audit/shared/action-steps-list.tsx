/**
 * Action Steps List Component
 * 
 * Displays step-by-step action plan for recommendations.
 * User Experience: Clear, numbered steps - easy to follow and execute.
 */

'use client';

import { CheckCircle2, Circle } from 'lucide-react';

interface ActionStepsListProps {
  steps: string[];
  completedSteps?: number[];
  onStepComplete?: (stepIndex: number) => void;
  interactive?: boolean;
}

export function ActionStepsList({
  steps,
  completedSteps = [],
  onStepComplete,
  interactive = false,
}: ActionStepsListProps) {
  const isCompleted = (index: number) => completedSteps.includes(index);
  
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => {
        const completed = isCompleted(index);
        
        return (
          <li key={index} className="flex items-start gap-3 group">
            {/* Step Number/Checkbox */}
            <div className="flex-shrink-0 mt-0.5">
              {interactive ? (
                <button
                  onClick={() => onStepComplete?.(index)}
                  className="transition-colors"
                >
                  {completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400 group-hover:text-purple-600" />
                  )}
                </button>
              ) : (
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold
                  ${completed 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-purple-100 text-purple-700'
                  }
                `}>
                  {index + 1}
                </div>
              )}
            </div>
            
            {/* Step Text */}
            <div className="flex-1 pt-0.5">
              <p className={`text-sm ${completed ? 'text-gray-500 line-through' : 'text-gray-700 dark:text-gray-300'}`}>
                {step}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

