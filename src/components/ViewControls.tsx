import type { ViewToggles } from '../types';

interface ViewControlsProps {
  toggles: ViewToggles;
  onToggle: (key: keyof Pick<ViewToggles, 'cage' | 'pedicleScrews' | 'labels'>) => void;
  onAnatomyOpacityChange: (value: number) => void;
}

const TOGGLE_CONFIG: {
  key: keyof Pick<ViewToggles, 'cage' | 'pedicleScrews' | 'labels'>;
  label: string;
}[] = [
  { key: 'cage', label: 'Cage' },
  { key: 'pedicleScrews', label: 'Pedicle Screws' },
  { key: 'labels', label: 'Labels' },
];

export function ViewControls({ toggles, onToggle, onAnatomyOpacityChange }: ViewControlsProps) {
  const anatomyPercent = Math.round(toggles.anatomyOpacity * 100);

  return (
    <div className="view-controls">
      <div className="opacity-control">
        <div className="opacity-control-header">
          <span>Spine Opacity</span>
          <span className="opacity-value">{anatomyPercent}%</span>
        </div>
        <input
          type="range"
          className="opacity-slider"
          min={0}
          max={100}
          value={anatomyPercent}
          onChange={(e) => onAnatomyOpacityChange(Number(e.target.value) / 100)}
          aria-label="Spine opacity"
        />
      </div>

      {TOGGLE_CONFIG.map(({ key, label }) => (
        <button
          key={key}
          type="button"
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
