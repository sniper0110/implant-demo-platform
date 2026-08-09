import { Html } from '@react-three/drei';

interface SceneLoadingFallbackProps {
  message?: string;
}

export function SceneLoadingFallback({
  message = 'Loading scene…',
}: SceneLoadingFallbackProps) {
  return (
    <Html fullscreen zIndexRange={[10, 10]}>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            background: 'rgba(17, 19, 24, 0.92)',
            border: '1px solid #323848',
            borderLeft: '2px solid #ffc800',
            borderRadius: '4px',
            padding: '10px 16px',
            fontSize: '11px',
            fontFamily: "'JetBrains Mono', monospace",
            color: '#a8adb8',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {message}
        </div>
      </div>
    </Html>
  );
}
