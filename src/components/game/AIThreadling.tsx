"use client";

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { adaptThreadlingAI } from '@/ai/flows/adaptive-threadling-ai';

interface AIThreadlingProps {
  scene: THREE.Scene;
  playerPos: THREE.Vector3;
}

export function AIThreadling({ scene, playerPos }: AIThreadlingProps) {
  const meshRef = useRef<THREE.Group | null>(null);
  const targetPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, -20));
  const intensity = useRef(0.1);

  useEffect(() => {
    // Initialize entity visuals
    const group = new THREE.Group();
    const bodyGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    // Tentacles / Legs (Simple representation for now)
    for(let i=0; i<8; i++) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5), bodyMat);
        leg.rotation.z = Math.random() * Math.PI;
        leg.position.y = -0.5;
        group.add(leg);
    }

    group.position.set(2, 3, -15);
    scene.add(group);
    meshRef.current = group;

    const updateAI = async () => {
      if (!meshRef.current) return;

      const aiDecision = await adaptThreadlingAI({
        threadlingCurrentPosition: { x: group.position.x, y: group.position.y, z: group.position.z },
        threadlingCurrentOrientation: { x: group.rotation.x, y: group.rotation.y, z: group.rotation.z },
        threadlingAwarenessLevel: intensity.current > 0.5 ? 'pursuing' : 'alerted',
        hasLineOfSightToPlayer: true,
        playerLastKnownLocation: { x: playerPos.x, y: playerPos.y, z: playerPos.z }
      });

      if (aiDecision.targetCoordinates) {
        targetPos.current.set(
            aiDecision.targetCoordinates.x,
            aiDecision.targetCoordinates.y,
            aiDecision.targetCoordinates.z
        );
      }
      intensity.current = aiDecision.reactionIntensity;
    };

    const interval = setInterval(updateAI, 3000);
    return () => clearInterval(interval);
  }, [scene, playerPos]);

  useEffect(() => {
    const animate = () => {
      if (meshRef.current) {
        // Move towards target
        meshRef.current.position.lerp(targetPos.current, 0.01);
        meshRef.current.rotation.y += 0.05 * intensity.current;
      }
      requestAnimationFrame(animate);
    };
    animate();
  }, []);

  return null;
}
