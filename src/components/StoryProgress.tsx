interface StoryProgressProps {
  stepIndex: number;
  totalSteps: number;
  stepTitle: string;
  onPrevious: () => void;
  onNext: () => void;
}

export function StoryProgress({
  stepIndex,
  totalSteps,
  stepTitle,
  onPrevious,
  onNext,
}: StoryProgressProps) {
  const progress = ((stepIndex + 1) / totalSteps) * 100;

  return (
    <div className="story-progress" aria-label="Guided story navigation">
      <div className="story-progress-track">
        <div className="story-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="story-progress-controls">
        <button
          type="button"
          className="story-nav-btn"
          onClick={onPrevious}
          disabled={stepIndex === 0}
          aria-label="Previous step"
        >
          Back
        </button>

        <div className="story-progress-meta">
          <span className="story-progress-step">
            Step {stepIndex + 1} of {totalSteps}
          </span>
          <span className="story-progress-title">{stepTitle}</span>
        </div>

        <button
          type="button"
          className="story-nav-btn"
          onClick={onNext}
          disabled={stepIndex >= totalSteps - 1}
          aria-label="Next step"
        >
          Next
        </button>
      </div>
    </div>
  );
}
