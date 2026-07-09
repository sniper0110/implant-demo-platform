import type { ViewToggles } from '../types';

interface ViewControlsProps {
  toggles: ViewToggles;
  onToggle: (key: keyof ViewToggles) => void;
}

const TOGGLE_CONFIG: { key: keyof ViewToggles; label: string }[] = [
  { key: 'anatomy', label: 'Anatomy' },
  { key: 'implant', label: 'Implant' },
  { key: 'labels', label: 'Labels' },
  { key: 'explode', label: 'Explode View' },
];

export function ViewControls({ toggles, onToggle }: ViewControlsProps) {
  return (
    <div className="view-controls">
      {TOGGLE_CONFIG.map(({ key, label }) => (
        <button
          key={key}
          className={`toggle-btn ${toggles[key] ? 'on' : ''}`}
          onClick={() => onToggle(key)}
          aria-pressed={toggles[key]}
        >
          <span className="toggle-indicator" />
          {label}
        </button>
      ))}
    </div>
  );
}
