"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { FleshShader } from './Shaders';
import { useToast } from '@/hooks/use-toast';
import { generateDynamicHorrorSoundscape } from '@/ai/flows/dynamic-horror-soundscape';
import { adaptThreadlingAI } from '@/ai/flows/adaptive-threadling-ai';
import * as Tone from 'tone';

const ROOM_SIZE = 10;
const INFINITE_DEPTH = 100;

export default function Engine() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const playerRef = useRef<THREE.Group | null>(null);
  const roomsRef = useRef<THREE.Group[]>([]);
  const { toast } = useToast();

  const [psychLevel, setPsychLevel] = useState(0.1);
  const [depth, setDepth] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  // Audio refs
  const droneRef = useRef<Tone.Oscillator | null>(null);
  const heartbeatRef = useRef<Tone.Player | null>(null);

  // Movement state
  const moveState = useRef({ forward: false, backward: false, left: false, right: false });
  const mouseMove = useRef({ x: 0, y: 0 });
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x1d1717, 0.15);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraRef.current = camera;

    const player = new THREE.Group();
    player.add(camera);
    player.position.set(0, 1.7, 0);
    scene.add(player);
    playerRef.current = player;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x1d1717);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Room Generation Logic
    const createRoom = (zOffset: number) => {
      const group = new THREE.Group();
      const fleshMat = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(FleshShader.uniforms),
        vertexShader: FleshShader.vertexShader,
        fragmentShader: FleshShader.fragmentShader,
        side: THREE.BackSide,
      });

      const boxGeo = new THREE.BoxGeometry(ROOM_SIZE, 4, ROOM_SIZE);
      const room = new THREE.Mesh(boxGeo, fleshMat);
      room.position.set(0, 2, 0);
      group.add(room);

      // Recursive Depth Doors
      const doorGeo = new THREE.PlaneGeometry(1.5, 2.5);
      const doorMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.position.set(0, 1.25, -ROOM_SIZE / 2 + 0.01);
      group.add(door);

      group.position.z = zOffset;
      scene.add(group);
      return group;
    };

    // Initialize initial corridor
    for (let i = 0; i < 3; i++) {
      roomsRef.current.push(createRoom(-i * ROOM_SIZE));
    }

    // 3. Hardware Tracking & Input
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyW') moveState.current.forward = true;
      if (e.code === 'KeyS') moveState.current.backward = true;
      if (e.code === 'KeyA') moveState.current.left = true;
      if (e.code === 'KeyD') moveState.current.right = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW') moveState.current.forward = false;
      if (e.code === 'KeyS') moveState.current.backward = false;
      if (e.code === 'KeyA') moveState.current.left = false;
      if (e.code === 'KeyD') moveState.current.right = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isLocked) return;
      const sensitivity = 0.002;
      euler.current.y -= e.movementX * sensitivity;
      euler.current.x -= e.movementY * sensitivity;
      euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x));
      camera.quaternion.setFromEuler(euler.current);
    };

    const handlePointerLockChange = () => {
      setIsLocked(document.pointerLockElement === containerRef.current);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    // 4. Animation Loop
    let lastTime = performance.now();
    let bobTime = 0;
    const animate = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      // Movement Physics
      const velocity = 3.5;
      const direction = new THREE.Vector3();
      if (moveState.current.forward) direction.z -= 1;
      if (moveState.current.backward) direction.z += 1;
      if (moveState.current.left) direction.x -= 1;
      if (moveState.current.right) direction.x += 1;
      direction.normalize();

      const moveVec = direction.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), euler.current.y));
      player.position.addScaledVector(moveVec, velocity * delta);

      // Head Bob
      if (direction.length() > 0) {
        bobTime += delta * 12;
        camera.position.y = Math.sin(bobTime) * 0.05;
        camera.position.x = Math.cos(bobTime * 0.5) * 0.03;
      } else {
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0, 0.1);
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0, 0.1);
      }

      // Recursive depth orchestration
      if (player.position.z < roomsRef.current[1].position.z) {
        setDepth(d => d + 1);
        const oldRoom = roomsRef.current.shift()!;
        oldRoom.position.z -= roomsRef.current.length * ROOM_SIZE;
        roomsRef.current.push(oldRoom);
        
        // Perceptual Disorientation: Subtle room changes
        if (Math.random() > 0.7) {
          setPsychLevel(p => Math.min(1, p + 0.05));
        }
      }

      // Update shaders
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.ShaderMaterial) {
          obj.material.uniforms.uTime.value = time / 1000;
          obj.material.uniforms.uPsychLevel.value = psychLevel;
        }
      });

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      renderer.dispose();
    };
  }, [isLocked, psychLevel]);

  // Audio Integration with GenAI
  useEffect(() => {
    const initAudio = async () => {
      await Tone.start();
      const drone = new Tone.Oscillator(100, "sawtooth").toDestination().start();
      drone.volume.value = -30;
      droneRef.current = drone;
    };
    initAudio();

    const updateAudio = async () => {
      try {
        const soundParams = await generateDynamicHorrorSoundscape({
          dangerProximity: psychLevel,
          psychologicalState: psychLevel
        });
        if (droneRef.current) {
          droneRef.current.frequency.rampTo(soundParams.droneFrequencyHz, 2);
          droneRef.current.volume.rampTo(Tone.gainToDb(soundParams.droneVolume * 0.5), 2);
        }
      } catch (e) {
        console.error("Audio update failed", e);
      }
    };

    const interval = setInterval(updateAudio, 5000);
    return () => clearInterval(interval);
  }, [psychLevel]);

  const lockPointer = () => {
    containerRef.current?.requestPointerLock();
  };

  return (
    <div ref={containerRef} className="w-full h-full relative" onClick={lockPointer}>
      <div id="crosshair" />
      <div className="horror-noise" />
      
      {/* HUD Overlay */}
      <div className="absolute top-8 left-8 mix-blend-difference opacity-70 pointer-events-none">
        <h1 className="font-headline text-2xl tracking-tighter text-primary uppercase">
          REDROOM: THE LAST EXIT
        </h1>
        <div className="font-body text-xs mt-2 space-y-1">
          <p>DEPTH: {depth.toString().padStart(4, '0')}m</p>
          <p>PSYCHE: {(psychLevel * 100).toFixed(1)}%</p>
          <p>SIGNAL: STABLE</p>
        </div>
      </div>

      {!isLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-[2000] cursor-pointer">
          <div className="text-center animate-visceral-pulse">
            <h2 className="font-headline text-5xl mb-4 text-primary">INITIATE DESCENT</h2>
            <p className="font-body text-sm opacity-50 uppercase tracking-[0.3em]">Click to engage perceptual matrix</p>
          </div>
        </div>
      )}

      {/* Screen Effects */}
      <div className="absolute inset-0 pointer-events-none z-[1500] border-[40px] border-black/20" />
      <div 
        className="absolute inset-0 pointer-events-none z-[1501] opacity-20 bg-gradient-to-t from-primary/10 via-transparent to-primary/5"
        style={{ filter: `blur(${psychLevel * 10}px)` }}
      />
    </div>
  );
}
