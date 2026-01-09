import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAssetLoader } from '../hooks/useAssetLoader';
import type { Group } from 'three';

export interface GLTFModelProps {
  url: string | null;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
  visible?: boolean;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  onLoaded?: () => void;
  onError?: (error: string) => void;
}

export function GLTFModel({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  visible = true,
  autoRotate = false,
  autoRotateSpeed = 0.01,
  onLoaded,
  onError,
}: GLTFModelProps) {
  const groupRef = useRef<Group>(null);
  const { gltf, isLoading, error } = useAssetLoader({ url, enabled: !!url });

  useEffect(() => {
    if (gltf && onLoaded) {
      onLoaded();
    }
  }, [gltf, onLoaded]);

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  useFrame(() => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += autoRotateSpeed;
    }
  });

  if (!gltf || isLoading || error) {
    return null;
  }

  const scaleArray = Array.isArray(scale) ? scale : [scale, scale, scale];

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={scaleArray as [number, number, number]}
      visible={visible}
    >
      <primitive object={gltf.scene.clone()} />
    </group>
  );
}
