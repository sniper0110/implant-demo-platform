import type { Product } from '../types';

export const PRODUCTS: Product[] = [
  {
    id: 'solar-psi',
    name: 'Solar PSI',
    shortName: 'Solar PSI',
    category: 'Patient-Specific Interbody',
    region: 'lumbar',
    family: 'lumbar-fusion',
    description:
      'Modular interbody platform concept for lumbar fusion workflows. Demonstrates footprint sizing, lordotic options, and instrumentation compatibility in a sales-education context.',
    highlights: [
      'Multiple footprint profiles',
      'Lordotic angle variants',
      'Instrument tray integration',
    ],
    implantType: 'interbody',
  },
  {
    id: 'impulse-am',
    name: 'Impulse AM',
    shortName: 'Impulse AM',
    category: 'Additive Manufactured Cage',
    region: 'lumbar',
    family: 'lumbar-fusion',
    description:
      'Lattice-structured interbody concept illustrating additive manufacturing design freedom. Shown for manufacturing capability discussion, not patient-specific planning.',
    highlights: [
      'Open lattice architecture',
      'Porosity visualization',
      'Rapid design iteration',
    ],
    implantType: 'interbody',
  },
  {
    id: 'e3-f1',
    name: 'E3 / F1',
    shortName: 'E3 / F1',
    category: 'Pedicle Screw System',
    region: 'lumbar',
    family: 'lumbar-fusion',
    description:
      'Posterior fixation construct with polyaxial pedicle screws and connecting rods. Illustrates rod contouring, screw angulation, and cross-connector placement.',
    highlights: [
      'Polyaxial screw heads',
      'Titanium rod system',
      'Cross-connector option',
    ],
    implantType: 'pedicle-screw',
  },
  {
    id: 'augmenta-vad',
    name: 'Augmenta VAD',
    shortName: 'Augmenta VAD',
    category: 'Vertebral Augmentation Device',
    region: 'lumbar',
    family: 'vertebral-augmentation',
    description:
      'Vertebral augmentation delivery concept for sales discussions around access, fill material distribution, and procedural workflow visualization.',
    highlights: [
      'Minimally invasive access',
      'Controlled fill delivery',
      'Bilateral approach option',
    ],
    implantType: 'vad',
  },
];

export const PRODUCT_MAP = Object.fromEntries(
  PRODUCTS.map((p) => [p.id, p])
) as Record<Product['id'], Product>;
