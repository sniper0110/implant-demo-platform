export type ProductId =
  | 'solar-psi'
  | 'impulse-am'
  | 'hyper-c'
  | 'e3-f1'
  | 'augmenta-vad';

export type ProductFamily = 'lumbar-fusion' | 'vertebral-augmentation';

export type SceneMode =
  | 'full-construct'
  | 'interbody-cage'
  | 'pedicle-system'
  | 'vad';

export type SpineRegion = 'lumbar' | 'cervical';

export interface Product {
  id: ProductId;
  name: string;
  shortName: string;
  category: string;
  region: SpineRegion;
  family: ProductFamily;
  description: string;
  highlights: string[];
  implantType: 'interbody' | 'cervical-plate' | 'pedicle-screw' | 'vad';
}

export interface MeasurementAnnotation {
  id: string;
  label: string;
  value: string;
  start: [number, number, number];
  end: [number, number, number];
}

export interface StoryStep {
  id: string;
  title: string;
  subtitle: string;
  implantName: string;
  anatomyLevel: string;
  callouts: [string, string, string];
  sceneMode: SceneMode;
  productId: ProductId;
  camera: {
    position: [number, number, number];
    target: [number, number, number];
  };
  measurements: MeasurementAnnotation[];
}

export interface ViewToggles {
  anatomyOpacity: number;
  cage: boolean;
  pedicleScrews: boolean;
  labels: boolean;
  measurements: boolean;
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
}
