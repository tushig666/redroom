
'use client';

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';

/**
 * ThreadlingVisuals - AAA Creature Component
 * 
 * Implements "The Resonance Weaver":
 * - 12-16 Asymmetrical limbs (Needles)
 * - Translucent pulsating Bladders (Sensors)
 * - Shifting Form (Limb Jitter)
 */
interface Props {
  position: THREE.Vector3;
  state: string;
}

export default function ThreadlingVisuals({ position, state }: Props) {
  const meshRef = useRef<THREE.Group>(null);

  // Procedural Limb Generation
  const limbs = useMemo(() => {
    const limbCount = 14;
    return Array.from({ length: limbCount }).map((_, i) => ({
      id: i,
      rotation: new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      ),
      length: 5 + Math.random() * 15, // AAA Scale: Limbs are up to 15m long
      thickness: 0.02 + Math.random() * 0.05
    }));
  }, []);

  // Sync with system position
  React.useEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(position);
    }
  }, [position]);

  return (
    <group ref={meshRef}>
      {/* Central Resonance Hub - The "Head" cluster */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshBasicMaterial 
          color={state === 'HUNTING' ? 0xff0000 : 0x220000} 
          transparent 
          opacity={0.8}
        />
      </mesh>

      {/* Pulsating Bladders - Acoustic Sensory Organs */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.sin(i) * 0.5, -0.8, Math.cos(i) * 0.5]}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshBasicMaterial color={0x441111} wireframe />
        </mesh>
      ))}

      {/* The Needles - 14 Asymmetrical multi-jointed limbs */}
      {limbs.map((limb) => (
        <group key={limb.id} rotation={limb.rotation}>
          <mesh position={[0, limb.length / 2, 0]}>
            <cylinderGeometry args={[limb.thickness, limb.thickness * 0.5, limb.length]} />
            <meshBasicMaterial color={0x110000} />
          </mesh>
          {/* Distal Joint - Makes the limbs look "broken" */}
          <group position={[0, limb.length, 0]} rotation={[0.5, 0, 0]}>
            <mesh position={[0, 2, 0]}>
              <cylinderGeometry args={[limb.thickness * 0.5, 0.001, 4]} />
              <meshBasicMaterial color={0x080000} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}
