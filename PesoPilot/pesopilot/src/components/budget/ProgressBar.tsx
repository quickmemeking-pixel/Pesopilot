"use client";

interface ProgressBarProps {
  percentage: number;
  showLabel?: boolean;
}

export default function ProgressBar({
  percentage,
  showLabel = true,
}: ProgressBarProps) {
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);

  // Determine color based on percentage
  let colorClass = "bg-green-500";
  if (percentage > 50) colorClass = "bg-yellow-500";
  if (percentage > 80) colorClass = "bg-red-500";

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Budget Used
          </span>
          <span
            className={`text-sm font-medium ${
              percentage > 80
                ? "text-red-600 dark:text-red-400"
                : "text-gray-700 dark:text-gray-300"
            }`}
          >
            {clampedPercentage.toFixed(1)}%
          </span>
        </div>
      )}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
        <div
          className={`${colorClass} h-2.5 rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${clampedPercentage}%` }}
        ></div>
      </div>
    </div>
  );
}
