import { Html } from '@react-three/drei';
import type { ProductId } from '../types';
import { useSpineLayout } from './SpineLayoutContext';

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

interface SceneLabelsProps {
  productId: ProductId;
  visible: boolean;
}

export function SceneLabels({ productId, visible }: SceneLabelsProps) {
  const { anchors, implants } = useSpineLayout();

  if (!visible) return null;

  const productLabels: LabelEntry[] = (() => {
    switch (productId) {
      case 'solar-psi':
        return [
          { position: implants.interbody.position, text: 'Interbody Cage' },
          { position: implants.labels.vertebralBody, text: 'Vertebral Body' },
          { position: implants.labels.discSpace, text: 'Disc Space' },
        ];
      case 'impulse-am':
        return [
          { position: implants.interbody.position, text: 'Lattice Structure' },
          { position: [implants.interbody.position[0] + 0.5, implants.interbody.position[1], implants.interbody.position[2] - 0.1], text: 'Porosity Zone' },
          { position: implants.labels.endplate, text: 'Endplate' },
        ];
      case 'hyper-c':
        return [
          { position: implants.cervical.plateCenter, text: 'Cervical Plate' },
          { position: implants.cervical.screwPositions[0], text: 'Fixation Screw' },
          { position: implants.cervical.vertebraLabel, text: 'T11 Vertebra' },
        ];
      case 'e3-f1': {
        const screw = implants.pedicle.levels[1];
        return [
          { position: screw.left, text: 'Pedicle Screw' },
          { position: implants.pedicle.rodLeft, text: 'Connecting Rod' },
          { position: implants.pedicle.crossConnector, text: 'Cross-Connector' },
        ];
      }
      case 'augmenta-vad':
        return [
          { position: [implants.vad.cannulaBase[0] - 0.35, implants.vad.cannulaBase[1] + 0.25, implants.vad.cannulaBase[2] + 0.35], text: 'Access Cannula' },
          { position: implants.vad.target, text: 'Fill Material' },
          { position: implants.labels.vertebralBody, text: 'Vertebral Body' },
        ];
      default:
        return [];
    }
  })();

  return (
    <group>
      {anchors.map((anchor) => (
        <Label key={anchor.id} position={anchor.center} text={anchor.label} subtle />
      ))}
      {productLabels.map((label, i) => (
        <Label key={`product-${i}`} position={label.position} text={label.text} />
      ))}
    </group>
  );
}
