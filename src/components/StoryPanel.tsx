import { STORY_STEPS } from '../data/story';

interface StoryPanelProps {
  activeStepIndex: number;
  onStepSelect: (index: number) => void;
}

export function StoryPanel({ activeStepIndex, onStepSelect }: StoryPanelProps) {
  const activeStep = STORY_STEPS[activeStepIndex];

  return (
    <div className="story-panel">
      <div className="panel-section-title story-panel-heading">Guided Story</div>
      <div className="story-steps">
        {STORY_STEPS.map((step, index) => (
          <button
            key={step.id}
            className={`story-step-btn ${index === activeStepIndex ? 'active' : ''}`}
            onClick={() => onStepSelect(index)}
            aria-current={index === activeStepIndex ? 'step' : undefined}
          >
            <span className="story-step-num">{String(index + 1).padStart(2, '0')}</span>
            <div className="story-step-content">
              <div className="story-step-title">{step.title}</div>
              <div className="story-step-subtitle">{step.subtitle}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="story-detail">
        <div className="story-detail-subtitle">{activeStep.subtitle}</div>
        <h2 className="story-detail-title">{activeStep.title}</h2>
        <p className="story-detail-body">{activeStep.body}</p>
        {activeStep.callout && (
          <div className="story-callout">
            <span className="story-callout-label">Focus</span>
            <span className="story-callout-text">{activeStep.callout}</span>
          </div>
        )}
      </div>
    </div>
  );
}
