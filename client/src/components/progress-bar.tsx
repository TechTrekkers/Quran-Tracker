import { Progress } from "@/components/ui/progress";

interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
}

export default function ProgressBar({ value, max = 100, showLabel = false }: ProgressBarProps) {
  // Ensure value is between 0 and max
  const normalizedValue = Math.min(Math.max(0, value), max);
  const percentage = (normalizedValue / max) * 100;
  
  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between mb-1 text-sm">
          <span className="text-neutral-600">{normalizedValue}</span>
          <span className="text-neutral-600">{max}</span>
        </div>
      )}
      <Progress value={percentage} className="h-2.5" />
    </div>
  );
}
