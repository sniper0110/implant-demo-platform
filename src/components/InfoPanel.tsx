import { useState } from 'react';
import type { StoryStep, ViewToggles } from '../types';
import { ViewControls } from './ViewControls';

interface InfoPanelProps {
  step: StoryStep;
  toggles: ViewToggles;
  onToggle: (key: keyof Pick<ViewToggles, 'cage' | 'pedicleScrews' | 'labels'>) => void;
  onAnatomyOpacityChange: (value: number) => void;
  compactLayout?: boolean;
}

interface CollapsibleSectionProps {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ label, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`info-panel-section collapsible-section ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="collapsible-trigger"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="info-panel-label">{label}</span>
        <span className="collapsible-icon" aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  );
}

export function InfoPanel({
  step,
  toggles,
  onToggle,
  onAnatomyOpacityChange,
  compactLayout = false,
}: InfoPanelProps) {
  if (compactLayout) {
    return (
      <aside className="info-panel info-panel-compact" aria-label="Implant information">
        <CollapsibleSection label="Implant" defaultOpen>
          <h2 className="info-panel-implant">{step.implantName}</h2>
          <p className="info-panel-level">{step.anatomyLevel}</p>
        </CollapsibleSection>

        <CollapsibleSection label="Key Callouts">
          <ul className="info-panel-callouts">
            {step.callouts.map((callout) => (
              <li key={callout}>{callout}</li>
            ))}
          </ul>
        </CollapsibleSection>

        <CollapsibleSection label="Scene Controls">
          <ViewControls
            toggles={toggles}
            onToggle={onToggle}
            onAnatomyOpacityChange={onAnatomyOpacityChange}
          />
        </CollapsibleSection>
      </aside>
    );
  }

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
