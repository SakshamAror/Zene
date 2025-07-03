import React, { useState } from 'react';
import type { DisplayGoal } from '../types';

interface GoalInputItemProps {
  goal: DisplayGoal;
  index: number;
  isSaving: boolean;
  onToggle: (id: string) => void;
  onUpdateText: (id: string, text: string) => void;
  onSavePlaceholder: (goal: DisplayGoal, text: string) => void;
}

export default function GoalInputItem({
  goal,
  index,
  isSaving,
  onToggle,
  onUpdateText,
  onSavePlaceholder,
}: GoalInputItemProps) {
  const isPlaceholder = goal.placeholder;
  const [localEditingValue, setLocalEditingValue] = useState(isPlaceholder ? '' : goal.text);
  const showPlaceholderStyle = isPlaceholder && !localEditingValue;

  React.useEffect(() => {
    if (!isPlaceholder) setLocalEditingValue(goal.text);
  }, [goal.text, isPlaceholder]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalEditingValue(e.target.value);
  };

  const handleBlur = () => {
    if (isPlaceholder) {
      onSavePlaceholder(goal, localEditingValue.trim());
      setLocalEditingValue('');
    } else {
      if (localEditingValue !== goal.text) {
        onUpdateText(goal.id, localEditingValue);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-amber-200">
      <div className="flex items-center space-x-3">
        <button
          onClick={() => !isPlaceholder && onToggle(goal.id)}
          className={`w-6 h-6 rounded-full border-2 ${isPlaceholder
            ? 'border-amber-100'
            : 'border-amber-300 hover:border-amber-500'
            } flex items-center justify-center transition-colors duration-200`}
          disabled={isPlaceholder}
        ></button>
        <div className="flex-1 flex items-center">
          <input
            type="text"
            placeholder={isPlaceholder ? `Goal ${index + 1}` : undefined}
            value={localEditingValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={`flex-1 bg-transparent border-none outline-none font-semibold ${showPlaceholderStyle
              ? 'text-amber-400 italic placeholder-amber-300'
              : 'text-amber-800 placeholder-amber-400'
              } ${isSaving ? 'opacity-60' : ''}`}
            disabled={isSaving}
          />
          {isSaving && (
            <svg
              className="animate-spin ml-2 h-4 w-4 text-amber-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}