import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Box3, Vector3, Mesh, BoxGeometry, MeshStandardMaterial, Group } from 'three';
import { fitCameraToObjects, getCameraOffset } from '../../src/scene/cameraFitUtils';

describe('glb camera fit', () => {
  it('uses a left lateral-oblique offset for full construct', () => {
    const offset = getCameraOffset('full-construct');
    expect(offset.x).toBeLessThan(0);
    expect(offset.y).toBeGreaterThan(0);
    expect(offset.z).toBeGreaterThan(0);
  });

  it('uses an anterior-lateral offset for interbody cage', () => {
    const offset = getCameraOffset('interbody-cage');
    expect(offset.z).toBeGreaterThan(0);
  });

  it('uses a posterior-lateral offset for pedicle system', () => {
    const offset = getCameraOffset('pedicle-system');
    expect(offset.z).toBeLessThan(0);
    expect(offset.x).toBeGreaterThan(0);
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
