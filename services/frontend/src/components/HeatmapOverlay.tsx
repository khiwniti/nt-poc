import { useMemo, useRef } from 'react';
import { Color, ShaderMaterial, Vector3, Mesh } from 'three';
import { useFrame } from '@react-three/fiber';

export type HeatmapMetric = 'temperature' | 'voltage' | 'soc' | 'soh';

interface HeatmapData {
  position: [number, number, number];
  value: number;
}

interface HeatmapOverlayProps {
  data: HeatmapData[];
  metric: HeatmapMetric;
  enabled: boolean;
  interpolationRadius?: number;
  opacity?: number;
}

const vertexShader = `
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 dataPositions[100];
  uniform float dataValues[100];
  uniform int dataCount;
  uniform float interpolationRadius;
  uniform float minValue;
  uniform float maxValue;
  uniform vec3 gradientColors[5];
  uniform float opacity;
  
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  vec3 getGradientColor(float t) {
    t = clamp(t, 0.0, 1.0);
    
    if (t < 0.25) {
      return mix(gradientColors[0], gradientColors[1], t * 4.0);
    } else if (t < 0.5) {
      return mix(gradientColors[1], gradientColors[2], (t - 0.25) * 4.0);
    } else if (t < 0.75) {
      return mix(gradientColors[2], gradientColors[3], (t - 0.5) * 4.0);
    } else {
      return mix(gradientColors[3], gradientColors[4], (t - 0.75) * 4.0);
    }
  }
  
  float interpolateValue(vec3 pos) {
    float totalWeight = 0.0;
    float weightedSum = 0.0;
    
    for (int i = 0; i < 100; i++) {
      if (i >= dataCount) break;
      
      float dist = distance(pos, dataPositions[i]);
      
      if (dist < interpolationRadius) {
        float weight = 1.0 - (dist / interpolationRadius);
        weight = weight * weight * weight;
        
        totalWeight += weight;
        weightedSum += dataValues[i] * weight;
      }
    }
    
    if (totalWeight > 0.0) {
      return weightedSum / totalWeight;
    }
    
    return -1.0;
  }
  
  void main() {
    float value = interpolateValue(vPosition);
    
    if (value < 0.0) {
      discard;
    }
    
    float normalizedValue = (value - minValue) / (maxValue - minValue);
    vec3 color = getGradientColor(normalizedValue);
    
    float facing = abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
    float alpha = opacity * (0.6 + 0.4 * facing);
    
    gl_FragColor = vec4(color, alpha);
  }
`;

const gradientPresets: Record<HeatmapMetric, Color[]> = {
  temperature: [
    new Color(0x0000ff), // Blue - cold
    new Color(0x00ffff), // Cyan
    new Color(0x00ff00), // Green
    new Color(0xffff00), // Yellow
    new Color(0xff0000), // Red - hot
  ],
  voltage: [
    new Color(0xff0000), // Red - low
    new Color(0xff8800), // Orange
    new Color(0xffff00), // Yellow
    new Color(0x88ff00), // Light green
    new Color(0x00ff00), // Green - high
  ],
  soc: [
    new Color(0xff0000), // Red - empty
    new Color(0xff8800), // Orange
    new Color(0xffff00), // Yellow
    new Color(0x88ff00), // Light green
    new Color(0x00ff00), // Green - full
  ],
  soh: [
    new Color(0xff0000), // Red - poor
    new Color(0xff8800), // Orange
    new Color(0xffff00), // Yellow
    new Color(0x88ff00), // Light green
    new Color(0x00ff00), // Green - excellent
  ],
};

export function HeatmapOverlay({
  data,
  metric,
  enabled,
  interpolationRadius = 5.0,
  opacity = 0.7,
}: HeatmapOverlayProps) {
  const meshRef = useRef<Mesh>(null);

  const { minValue, maxValue } = useMemo(() => {
    if (data.length === 0) return { minValue: 0, maxValue: 1 };
    
    const values = data.map(d => d.value);
    return {
      minValue: Math.min(...values),
      maxValue: Math.max(...values),
    };
  }, [data]);

  const material = useMemo(() => {
    const positions = new Array(100).fill(null).map((_, i) => 
      data[i] ? new Vector3(...data[i].position) : new Vector3(0, 0, 0)
    );
    
    const values = new Array(100).fill(0).map((_, i) => 
      data[i] ? data[i].value : 0
    );

    const colors = gradientPresets[metric];

    const mat = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        dataPositions: { value: positions },
        dataValues: { value: values },
        dataCount: { value: Math.min(data.length, 100) },
        interpolationRadius: { value: interpolationRadius },
        minValue: { value: minValue },
        maxValue: { value: maxValue },
        gradientColors: { value: colors },
        opacity: { value: opacity },
      },
      transparent: true,
      depthWrite: false,
    });
    
    return mat;
  }, [data, metric, interpolationRadius, minValue, maxValue, opacity]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.visible = enabled;
    }
  });

  if (!enabled) return null;

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[20, 20, 20]} />
      {/* eslint-disable-next-line react/no-unknown-property */}
      <primitive object={material} attach="material" />
    </mesh>
  );
}
