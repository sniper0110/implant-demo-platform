import type { StoryStep, ViewToggles } from '../types';
import { ViewControls } from './ViewControls';

interface InfoPanelProps {
  step: StoryStep;
  toggles: ViewToggles;
  onToggle: (key: keyof Pick<ViewToggles, 'cage' | 'pedicleScrews' | 'labels' | 'measurements'>) => void;
  onAnatomyOpacityChange: (value: number) => void;
}

export function InfoPanel({ step, toggles, onToggle, onAnatomyOpacityChange }: InfoPanelProps) {
  return (
    <aside className="info-panel" aria-label="Implant information">
      <div className="info-panel-section">
        <span className="info-panel-label">Implant</span>
        <h2 className="info-panel-implant">{step.implantName}</h2>
      </div>

      <div className="info-panel-section">
        <span className="info-panel-label">Anatomy Level</span>
        <p className="info-panel-level">{step.anatomyLevel}</p>
      </div>

      <div className="info-panel-section">
        <span className="info-panel-label">Key Callouts</span>
        <ul className="info-panel-callouts">
          {step.callouts.map((callout) => (
            <li key={callout}>{callout}</li>
          ))}
        </ul>
      </div>

      <div className="info-panel-section info-panel-controls">
        <span className="info-panel-label">Scene Controls</span>
        <ViewControls
          toggles={toggles}
          onToggle={onToggle}
          onAnatomyOpacityChange={onAnatomyOpacityChange}
        />
      </div>
    </aside>
  );
}
