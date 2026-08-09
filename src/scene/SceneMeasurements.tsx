import { Html, Line } from '@react-three/drei';
import type { MeasurementAnnotation } from '../types';

interface SceneMeasurementsProps {
  measurements: MeasurementAnnotation[];
  visible: boolean;
}

function MeasurementLine({ measurement }: { measurement: MeasurementAnnotation }) {
  const mid: [number, number, number] = [
    (measurement.start[0] + measurement.end[0]) / 2,
    (measurement.start[1] + measurement.end[1]) / 2 + 0.08,
    (measurement.start[2] + measurement.end[2]) / 2,
  ];

  return (
    <group>
      <Line
        points={[measurement.start, measurement.end]}
        color="#ffc800"
        lineWidth={1.5}
        dashed
        dashSize={0.06}
        gapSize={0.04}
      />
      <mesh position={measurement.start}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshBasicMaterial color="#ffc800" />
      </mesh>
      <mesh position={measurement.end}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshBasicMaterial color="#ffc800" />
      </mesh>
      <Html position={mid} center distanceFactor={9} zIndexRange={[0, 0]}>
        <div
          style={{
            background: 'rgba(17, 19, 24, 0.92)',
            border: '1px solid #323848',
            borderLeft: '2px solid #ffc800',
            borderRadius: '3px',
            padding: '3px 7px',
            fontSize: '9px',
            fontFamily: "'JetBrains Mono', monospace",
            color: '#f0f1f4',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            letterSpacing: '0.04em',
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#949bab', fontSize: '8px' }}>{measurement.label}</div>
          <div style={{ fontWeight: 600 }}>{measurement.value}</div>
        </div>
      </Html>
    </group>
  );
}

export function SceneMeasurements({ measurements, visible }: SceneMeasurementsProps) {
  if (!visible || measurements.length === 0) return null;

  return (
    <group>
      {measurements.map((measurement) => (
        <MeasurementLine key={measurement.id} measurement={measurement} />
      ))}
    </group>
  );
}
