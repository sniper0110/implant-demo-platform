import { Html } from '@react-three/drei';

export function SceneLoadingFallback() {
  return (
    <Html center position={[0, 0.5, 0]} zIndexRange={[10, 10]}>
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
          pointerEvents: 'none',
        }}
      >
        Loading CT spine meshes…
      </div>
    </Html>
  );
}
