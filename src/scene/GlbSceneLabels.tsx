import { Html } from '@react-three/drei';
import type { SceneMode } from '../types';
import { getSpineLabel } from './sceneAssetConfig';
import { useGlbSceneLayout } from './GlbSceneLayoutContext';

interface LabelEntry {
  position: [number, number, number];
  text: string;
}

function Label({ position, text, subtle = false }: LabelEntry & { subtle?: boolean }) {
  return (
    <Html position={position} center distanceFactor={subtle ? 10 : 8} zIndexRange={[0, 0]}>
      <div
        style={{
          background: subtle ? 'rgba(17, 19, 24, 0.75)' : 'rgba(17, 19, 24, 0.9)',
          border: '1px solid #323848',
          borderLeft: subtle ? '1px solid #4a5060' : '2px solid #ffc800',
          borderRadius: '3px',
          padding: subtle ? '2px 6px' : '3px 8px',
          fontSize: subtle ? '8px' : '10px',
          fontFamily: "'JetBrains Mono', monospace",
          color: subtle ? '#8a9098' : '#f0f1f4',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          letterSpacing: '0.04em',
        }}
      >
        {text}
      </div>
    </Html>
  );
}

interface GlbSceneLabelsProps {
  sceneMode: SceneMode;
  visible: boolean;
}

function getLabelsForScene(sceneMode: SceneMode, layout: ReturnType<typeof useGlbSceneLayout>): LabelEntry[] {
  const cageCenter = layout.cageCenter ?? [0, 0, 0];
  const screwCenter = layout.screwCenters[1] ?? layout.screwCenters[0] ?? [0, 0, 0];
  const l4Center = layout.spineCenters['L4.stl'] ?? layout.spineCenters['L4stl'] ?? [0, 0, 0];
  const l5Center = layout.spineCenters['L5.stl'] ?? layout.spineCenters['L5stl'] ?? [0, 0, 0];
  const discSpace: [number, number, number] = [
    (l4Center[0] + l5Center[0]) / 2,
    (l4Center[1] + l5Center[1]) / 2,
    (l4Center[2] + l5Center[2]) / 2,
  ];

  switch (sceneMode) {
    case 'full-construct':
      return [
        { position: cageCenter, text: 'Interbody Cage' },
        { position: screwCenter, text: 'Pedicle Screw' },
        { position: layout.spineCenters['L3.stl'] ?? layout.spineCenters['L3stl'] ?? screwCenter, text: 'L3 Level' },
      ];
    case 'interbody-cage':
      return [
        { position: cageCenter, text: 'Interbody Cage' },
        { position: l4Center, text: 'L4 Vertebra' },
        { position: discSpace, text: 'Disc Space' },
      ];
    case 'pedicle-system':
      return [
        { position: screwCenter, text: 'Pedicle Screw' },
        { position: layout.screwCenters[0] ?? screwCenter, text: 'Left Fixation' },
        { position: layout.screwCenters[2] ?? screwCenter, text: 'Right Fixation' },
      ];
    default:
      return [];
  }
}

export function GlbSceneLabels({ sceneMode, visible }: GlbSceneLabelsProps) {
  const layout = useGlbSceneLayout();

  if (!visible) return null;

  const productLabels = getLabelsForScene(sceneMode, layout);
  const spineLabels = Object.entries(layout.spineCenters).map(([id, position]) => ({
    id,
    position,
    text: getSpineLabel(id),
  }));

  return (
    <group>
      {spineLabels.map(({ id, position, text }) => (
        <Label key={id} position={position} text={text} subtle />
      ))}
      {productLabels.map((label, i) => (
        <Label key={`product-${i}`} position={label.position} text={label.text} />
      ))}
    </group>
  );
}
