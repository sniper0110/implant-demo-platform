import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Box3, Vector3, Mesh, BoxGeometry, MeshStandardMaterial, Group } from 'three';
import { fitCameraToObjects, getCameraOffset } from '../../src/scene/cameraFitUtils';

describe('glb camera fit', () => {
  it('uses a posterior-elevated offset for full construct', () => {
    const offset = getCameraOffset('full-construct', 10);
    expect(offset.y).toBeGreaterThan(offset.x);
    expect(offset.z).toBeGreaterThan(offset.x);
  });

  it('frames a horizontal bounding box', () => {
    const root = new Group();
    const mesh = new Mesh(new BoxGeometry(20, 4, 4), new MeshStandardMaterial());
    root.add(mesh);
    root.updateMatrixWorld(true);

    const camera = new PerspectiveCamera(42, 1, 0.1, 2000);
    fitCameraToObjects([root], camera, null, 'full-construct');

    const box = new Box3().setFromObject(root);
    const center = box.getCenter(new Vector3());
    expect(camera.position.distanceTo(center)).toBeGreaterThan(5);
  });
});
