
"use client";

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface AIThreadlingProps {
  scene: THREE.Scene;
  playerPos: THREE.Vector3;
  acousticIntensity: number;
  depth: number;
  onCatch: () => void;
}

type AIState = 'STATE_IDLE' | 'STATE_ALERT' | 'STATE_HUNT';

export function AIThreadling({ scene, playerPos, acousticIntensity, depth, onCatch }: AIThreadlingProps) {
  const groupRef = useRef<THREE.Group | null>(null);
  const aiState = useRef<AIState>('STATE_IDLE');
  const targetPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 4, 0));
  const lastAcousticEventPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const limbsRef = useRef<THREE.Mesh[]>([]);
  const limbAnchors = useRef<THREE.Vector3[]>([]);

  useEffect(() => {
    const group = new THREE.Group();
    const bodyGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    // Initialize 10 limbs for Procedural IK simulation
    for (let i = 0; i < 10; i++) {
      const limbGeo = new THREE.CylinderGeometry(0.03, 0.03, 1);
      const limb = new THREE.Mesh(limbGeo, bodyMat);
      group.add(limb);
      limbsRef.current.push(limb);
      limbAnchors.current.push(new THREE.Vector3(0, 0, 0));
    }

    group.position.set(0, 4.5, -5);
    scene.add(group);
    groupRef.current = group;

    return () => {
      scene.remove(group);
    };
  }, [scene]);

  useEffect(() => {
    let frameId: number;
    const raycaster = new THREE.Raycaster();

    const animate = () => {
      const group = groupRef.current;
      if (!group) return;

      const baseSpeed = 1.8 + (depth * 0.4);
      const huntSpeed = baseSpeed * 2.5;
      const dt = 0.016; // Approx 60fps

      // --- 1. AI STATE MACHINE LOGIC ---
      if (acousticIntensity > 40.0) {
        aiState.current = 'STATE_HUNT';
        targetPos.current.copy(playerPos);
      } else if (acousticIntensity > 15.0) {
        aiState.current = 'STATE_ALERT';
        lastAcousticEventPos.current.copy(playerPos);
        targetPos.current.copy(lastAcousticEventPos.current);
      } else if (group.position.distanceTo(targetPos.current) < 0.5) {
        aiState.current = 'STATE_IDLE';
        // Pick random wall/ceiling point
        targetPos.current.set(
          (Math.random() - 0.5) * 18,
          2 + Math.random() * 3,
          (Math.random() - 0.5) * 18
        );
      }

      // --- 2. MOVEMENT INTERPOLATION ---
      const currentSpeed = aiState.current === 'STATE_HUNT' ? huntSpeed : baseSpeed;
      const moveDir = targetPos.current.clone().sub(group.position).normalize();
      group.position.add(moveDir.multiplyScalar(currentSpeed * dt));

      // --- 3. PROCEDURAL IK LIMB CLAMPING ---
      limbsRef.current.forEach((limb, i) => {
        const anchor = limbAnchors.current[i];
        const distToBody = group.position.distanceTo(anchor);

        // If body moves too far, snap leg to new surface
        if (distToBody > 1.8) {
          const castDir = new THREE.Vector3(
            Math.sin(i * 0.6 + Date.now() * 0.001),
            Math.cos(i * 0.6 + Date.now() * 0.001),
            Math.sin(i * 1.2)
          ).normalize();
          
          raycaster.set(group.position, castDir);
          const intersects = raycaster.intersectObjects(scene.children, true);
          
          if (intersects.length > 0) {
             anchor.copy(intersects[0].point);
          }
        }

        // Visual orientation of limb
        limb.position.copy(group.position.clone().add(anchor).divideScalar(2));
        limb.lookAt(anchor);
        limb.rotateX(Math.PI / 2);
        const scale = group.position.distanceTo(anchor);
        limb.scale.set(1, scale, 1);
      });

      // --- 4. LOSS CONDITION EVALUATION ---
      if (group.position.distanceTo(playerPos) < 1.2) {
        onCatch();
      }

      frameId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(frameId);
  }, [playerPos, acousticIntensity, depth, onCatch, scene]);

  return null;
}
