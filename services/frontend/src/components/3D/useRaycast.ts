import { useThree } from '@react-three/fiber';
import { Vector2, Mesh } from 'three';

export const useRaycast = () => {
  const { camera, raycaster } = useThree();

  const raycast = (x: number, y: number, objects: Mesh[]) => {
    const mouse = new Vector2(x, y);
    raycaster.setFromCamera(mouse, camera);
    return raycaster.intersectObjects(objects, true);
  };

  return raycast;
};
