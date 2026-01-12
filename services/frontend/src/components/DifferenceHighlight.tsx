import { useEffect, useMemo } from 'react';
import { Color, MeshStandardMaterial } from 'three';
import type { Object3D } from 'three';
import { useComparativeViewStore } from '../stores/comparativeViewStore';

interface DifferenceData {
  objectId: string;
  leftValue: number;
  rightValue: number;
  difference: number;
  normalizedDifference: number;
}

interface DifferenceHighlightProps {
  leftObject: Object3D | null;
  rightObject: Object3D | null;
  propertyExtractor: (obj: Object3D) => number;
  highlightIntensity?: number;
}

export function DifferenceHighlight({
  leftObject,
  rightObject,
  propertyExtractor,
  highlightIntensity = 1.0,
}: DifferenceHighlightProps) {
  const { showDifferences, differenceThreshold } = useComparativeViewStore();

  const differenceData = useMemo<DifferenceData | null>(() => {
    if (!leftObject || !rightObject) return null;

    const leftValue = propertyExtractor(leftObject);
    const rightValue = propertyExtractor(rightObject);
    const difference = Math.abs(leftValue - rightValue);
    const maxValue = Math.max(Math.abs(leftValue), Math.abs(rightValue));
    const normalizedDifference = maxValue > 0 ? difference / maxValue : 0;

    return {
      objectId: leftObject.uuid,
      leftValue,
      rightValue,
      difference,
      normalizedDifference,
    };
  }, [leftObject, rightObject, propertyExtractor]);

  useEffect(() => {
    if (!showDifferences || !differenceData || !leftObject || !rightObject) return;

    const shouldHighlight = differenceData.normalizedDifference >= differenceThreshold;

    if (!shouldHighlight) return;

    const highlightColor = new Color().lerpColors(
      new Color(0x00ff00), // Green (no difference)
      new Color(0xff0000), // Red (max difference)
      differenceData.normalizedDifference * highlightIntensity
    );

    const applyHighlight = (obj: Object3D) => {
      const cleanups: (() => void)[] = [];
      
      obj.traverse((child) => {
        if ('material' in child && child.material) {
          const material = child.material as MeshStandardMaterial;
          const originalColor = material.color.clone();
          material.emissive = highlightColor;
          material.emissiveIntensity = 0.5 * differenceData.normalizedDifference;

          cleanups.push(() => {
            material.color = originalColor;
            material.emissive = new Color(0x000000);
            material.emissiveIntensity = 0;
          });
        }
      });
      
      return () => {
        cleanups.forEach(cleanup => cleanup());
      };
    };

    const cleanupLeft = applyHighlight(leftObject);
    const cleanupRight = applyHighlight(rightObject);

    return () => {
      cleanupLeft();
      cleanupRight();
    };
  }, [showDifferences, differenceData, differenceThreshold, highlightIntensity, leftObject, rightObject]);

  return null;
}

export function useDifferenceCalculation(
  leftData: Record<string, number>,
  rightData: Record<string, number>
): Map<string, DifferenceData> {
  return useMemo(() => {
    const differences = new Map<string, DifferenceData>();

    for (const key in leftData) {
      if (key in rightData) {
        const leftValue = leftData[key];
        const rightValue = rightData[key];
        const difference = Math.abs(leftValue - rightValue);
        const maxValue = Math.max(Math.abs(leftValue), Math.abs(rightValue));
        const normalizedDifference = maxValue > 0 ? difference / maxValue : 0;

        differences.set(key, {
          objectId: key,
          leftValue,
          rightValue,
          difference,
          normalizedDifference,
        });
      }
    }

    return differences;
  }, [leftData, rightData]);
}

export function DifferenceHeatmapLegend() {
  return (
    <div style={{
      position: 'absolute',
      bottom: 16,
      right: 16,
      padding: '8px 12px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      borderRadius: 4,
      fontSize: '12px',
    }}>
      <div style={{ marginBottom: 8, fontWeight: 'bold' }}>Difference Intensity</div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <div style={{
          width: 100,
          height: 12,
          background: 'linear-gradient(to right, #00ff00, #ffff00, #ff0000)',
          borderRadius: 2,
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', width: 100 }}>
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}
