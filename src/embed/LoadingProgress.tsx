import { useEffect, useMemo, useState } from 'react';
import { mapProgressToUiPercent, type DownloadProgress } from './modelDownload';

const HINTS = [
  'This interactive demo lets you explore the implant in 3D.',
  'Drag to rotate the view once the scene is ready.',
  'Use the story steps below to walk through the construct.',
  'Pinch or scroll to zoom in on implant details.',
];

function describeStage(progress: DownloadProgress | null, parsingScene: boolean): string {
  if (parsingScene) return 'Almost ready — setting up the scene…';
  if (!progress || progress.loadedBytes === 0) return 'Connecting to the demo…';
  const pct = mapProgressToUiPercent(progress);
  if (pct >= 85) return 'Almost ready — setting up the scene…';
  return `Preparing the 3D implant model… ${Math.max(pct, 10)}%`;
}

export function LoadingProgress({
  progress,
  parsingScene = false,
}: {
  progress: DownloadProgress | null;
  parsingScene?: boolean;
}) {
  const [hintIndex, setHintIndex] = useState(0);
  const uiPercent = useMemo(() => {
    if (parsingScene) return 92;
    if (!progress) return 8;
    return Math.max(8, mapProgressToUiPercent(progress));
  }, [progress, parsingScene]);

  const primary = describeStage(progress, parsingScene);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHintIndex((current) => (current + 1) % HINTS.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, []);

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (uiPercent / 100) * circumference;

  return (
    <div className="embed-loading-shell embed-loading-progress" aria-live="polite">
      <div className="embed-progress-ring" aria-hidden="true">
        <svg viewBox="0 0 88 88" width="88" height="88" role="presentation">
          <circle className="embed-progress-track" cx="44" cy="44" r={radius} />
          <circle
            className="embed-progress-fill"
            cx="44"
            cy="44"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <span className="embed-progress-value">{uiPercent}%</span>
      </div>
      <p className="embed-progress-primary">{primary}</p>
      <p className="embed-progress-hint">{HINTS[hintIndex]}</p>
    </div>
  );
}
