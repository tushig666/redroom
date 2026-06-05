
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { FleshShader } from './Shaders';
import { useToast } from '@/hooks/use-toast';
import { generateDynamicHorrorSoundscape } from '@/ai/flows/dynamic-horror-soundscape';
import * as Tone from 'tone';
import { AIThreadling } from './AIThreadling';

// --- CONSTANTS ---
const ROOM_SIZE = 20;
const BOUNDARY = 9.5;
const PLAYER_HEIGHT = 1.7;
const MOUSE_SENSITIVITY = 0.0022;
const FRICTION = 12.0;
const ACCEL_SCALE = 80.0;
const MAX_DT = 0.1;

type GameState = 'STATE_MENU' | 'STATE_PLAYING' | 'STATE_ROOM_RESET' | 'STATE_MONSTER_AMBUSH' | 'STATE_DEATH_SEQUENCE' | 'STATE_WIN_SEQUENCE';
type DoorType = 'PROGRESSION' | 'DEAD_END' | 'MONSTER_TRIGGER' | 'NOISE_TRAP';

interface DoorMeta {
  mesh: THREE.Group;
  type: DoorType;
  position: THREE.Vector3;
  direction: THREE.Vector3; // Normal vector of the door face
}

export default function Engine() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>('STATE_MENU');
  const [depth, setDepth] = useState(0);
  const [psychLevel, setPsychLevel] = useState(0.1);
  const [isLocked, setIsLocked] = useState(false);

  // Engine Refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const playerRef = useRef<THREE.Group | null>(null);
  const roomsRef = useRef<THREE.Group[]>([]);
  const doorsRef = useRef<DoorMeta[]>([]);
  
  // Physics & Input Refs
  const inputBuffer = useRef<{ [key: string]: boolean }>({});
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const playerPos = useRef(new THREE.Vector3(0, PLAYER_HEIGHT, 5));
  const yaw = useRef(0);
  const pitch = useRef(0);
  const totalElapsedTime = useRef(0);
  const roomAcousticIntensity = useRef(0);

  // Audio Refs
  const droneRef = useRef<Tone.Oscillator | null>(null);
  const { toast } = useToast();

  // --- TRANSITION LOGIC ---
  const transitionTo = useCallback((nextState: GameState) => {
    setGameState(nextState);
    if (nextState === 'STATE_ROOM_RESET') {
      // Teleport to center logic
      playerPos.current.set(0, PLAYER_HEIGHT, 8);
      velocity.current.set(0, 0, 0);
      setDepth(d => d + 1);
      setTimeout(() => setGameState('STATE_PLAYING'), 100);
    }
    if (nextState === 'STATE_DEATH_SEQUENCE') {
      try {
        document.exitPointerLock();
      } catch (e) {
        // Silently fail if not locked
      }
      setIsLocked(false);
    }
  }, []);

  // --- INITIALIZATION ---
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0505, 0.015);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraRef.current = camera;

    const player = new THREE.Group();
    player.add(camera);
    player.position.copy(playerPos.current);
    scene.add(player);
    playerRef.current = player;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0a0505);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const createRoom = () => {
      const group = new THREE.Group();
      const fleshMat = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(FleshShader.uniforms),
        vertexShader: FleshShader.vertexShader,
        fragmentShader: FleshShader.fragmentShader,
        side: THREE.BackSide,
      });

      const boxGeo = new THREE.BoxGeometry(ROOM_SIZE, 6, ROOM_SIZE);
      const room = new THREE.Mesh(boxGeo, fleshMat);
      room.position.set(0, 3, 0);
      group.add(room);

      // Light Sources
      const pointLight = new THREE.PointLight(0xff0000, 1, 15);
      pointLight.position.set(0, 5, 0);
      group.add(pointLight);

      scene.add(group);
      return group;
    };

    const spawnDoors = () => {
      // Clear old doors
      doorsRef.current.forEach(d => scene.remove(d.mesh));
      doorsRef.current = [];

      const doorCoords = [
        { pos: [0, 1.25, -9.9], rot: [0, 0, 0], dir: [0, 0, -1] },
        { pos: [0, 1.25, 9.9], rot: [0, Math.PI, 0], dir: [0, 0, 1] },
        { pos: [-9.9, 1.25, 0], rot: [0, Math.PI / 2, 0], dir: [-1, 0, 0] },
        { pos: [9.9, 1.25, 0], rot: [0, -Math.PI / 2, 0], dir: [1, 0, 0] },
      ];

      const types: DoorType[] = ['PROGRESSION', 'DEAD_END', 'MONSTER_TRIGGER', 'NOISE_TRAP'];
      // Shuffle types
      for (let i = types.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [types[i], types[j]] = [types[j], types[i]];
      }

      doorCoords.forEach((coord, i) => {
        const doorGroup = new THREE.Group();
        const doorGeo = new THREE.PlaneGeometry(2, 3);
        const doorMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const door = new THREE.Mesh(doorGeo, doorMat);
        doorGroup.add(door);
        
        doorGroup.position.set(coord.pos[0], coord.pos[1], coord.pos[2]);
        doorGroup.rotation.set(coord.rot[0], coord.rot[1], coord.rot[2]);
        
        scene.add(doorGroup);
        doorsRef.current.push({
          mesh: doorGroup,
          type: types[i],
          position: new THREE.Vector3(coord.pos[0], coord.pos[1], coord.pos[2]),
          direction: new THREE.Vector3(coord.dir[0], coord.dir[1], coord.dir[2])
        });
      });
    };

    roomsRef.current.push(createRoom());
    spawnDoors();

    // Event Listeners
    const onKeyDown = (e: KeyboardEvent) => inputBuffer.current[e.code] = true;
    const onKeyUp = (e: KeyboardEvent) => inputBuffer.current[e.code] = false;
    const onMouseMove = (e: MouseEvent) => {
      if (!isLocked) return;
      yaw.current -= e.movementX * MOUSE_SENSITIVITY;
      pitch.current -= e.movementY * MOUSE_SENSITIVITY;
      pitch.current = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, pitch.current));
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    
    const onPointerLockChange = () => {
      setIsLocked(document.pointerLockElement === containerRef.current);
    };
    
    document.addEventListener('pointerlockchange', onPointerLockChange);

    let lastTime = performance.now();
    const animate = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, MAX_DT);
      lastTime = time;
      totalElapsedTime.current += dt;

      if (gameState === 'STATE_PLAYING') {
        // --- 1. KINEMATIC CHARACTER MOTOR ---
        const forward = new THREE.Vector3(Math.sin(yaw.current), 0, Math.cos(yaw.current)).normalize();
        const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
        
        const accel = new THREE.Vector3(0, 0, 0);
        if (inputBuffer.current['KeyW']) accel.add(forward.clone().multiplyScalar(-1));
        if (inputBuffer.current['KeyS']) accel.add(forward);
        if (inputBuffer.current['KeyA']) accel.add(right);
        if (inputBuffer.current['KeyD']) accel.add(right.clone().multiplyScalar(-1));
        accel.normalize().multiplyScalar(ACCEL_SCALE);

        // Friction & Velocity Integration
        velocity.current.add(accel.clone().multiplyScalar(dt));
        velocity.current.add(velocity.current.clone().multiplyScalar(-FRICTION * dt));
        playerPos.current.add(velocity.current.clone().multiplyScalar(dt));

        // --- 2. SPATIAL BOUNDING & COLLISION ---
        if (Math.abs(playerPos.current.x) > BOUNDARY) {
          playerPos.current.x = Math.sign(playerPos.current.x) * BOUNDARY;
          velocity.current.x = 0;
        }
        if (Math.abs(playerPos.current.z) > BOUNDARY) {
          playerPos.current.z = Math.sign(playerPos.current.z) * BOUNDARY;
          velocity.current.z = 0;
        }
        playerPos.current.y = PLAYER_HEIGHT; // Hard floor lock

        // --- 3. ACOUSTIC SIGNATURE PROPAGATION ---
        const moveSpeed = velocity.current.length();
        if (moveSpeed > 0.1) {
          roomAcousticIntensity.current = Math.min(100, roomAcousticIntensity.current + (moveSpeed * 2.0 * dt));
        } else {
          roomAcousticIntensity.current *= Math.exp(-0.5 * dt); // Decay
        }

        // --- 4. INTERACTION & DOOR EVALUATION ---
        doorsRef.current.forEach(door => {
          const dist = playerPos.current.distanceTo(door.position);
          if (dist < 1.5) {
            if (door.type === 'PROGRESSION') {
              if (depth >= 4) transitionTo('STATE_WIN_SEQUENCE');
              else {
                transitionTo('STATE_ROOM_RESET');
                spawnDoors();
              }
            } else if (door.type === 'DEAD_END') {
              // RESET depth silently or just the position
              playerPos.current.set(0, PLAYER_HEIGHT, 8);
              velocity.current.set(0, 0, 0);
              setPsychLevel(p => Math.min(1, p + 0.1));
            } else if (door.type === 'NOISE_TRAP') {
              roomAcousticIntensity.current += 50.0;
              toast({ title: "A LOUD ECHO RINGS OUT", variant: "destructive" });
              door.type = 'DEAD_END'; // Only trap once
            } else if (door.type === 'MONSTER_TRIGGER') {
               transitionTo('STATE_MONSTER_AMBUSH');
            }
          }
        });

        // --- 5. UNOBSERVED SPATIAL SHIFT ---
        const playerForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        doorsRef.current.forEach(door => {
          const toDoor = door.position.clone().sub(playerPos.current).normalize();
          const dot = playerForward.dot(toDoor);
          if (dot < -0.2) { // Unobserved
            const drift = Math.sin(totalElapsedTime.current * 0.5) * 0.05;
            door.mesh.position.x += drift;
          }
        });

        // View Bobbing
        if (moveSpeed > 0.1) {
           const bobY = Math.sin(totalElapsedTime.current * 10.0) * 0.05;
           camera.position.y = bobY;
           camera.position.x = Math.cos(totalElapsedTime.current * 5.0) * 0.03;
        } else {
           camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0, 0.1);
           camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0, 0.1);
        }

        player.position.copy(playerPos.current);
        camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ');
      }

      // Render Loop Extras
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.density = 0.015 + (depth * 0.012) + (psychLevel * 0.05);
      }

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.ShaderMaterial) {
          obj.material.uniforms.uTime.value = totalElapsedTime.current;
          obj.material.uniforms.uPsychLevel.value = psychLevel;
        }
      });

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      renderer.dispose();
    };
  }, [gameState, depth, psychLevel, isLocked, transitionTo]);

  // Audio Integration
  useEffect(() => {
    const initAudio = async () => {
      await Tone.start();
      const drone = new Tone.Oscillator(80, "sawtooth").toDestination().start();
      drone.volume.value = -35;
      droneRef.current = drone;
    };
    initAudio();

    const interval = setInterval(async () => {
      try {
        const soundParams = await generateDynamicHorrorSoundscape({
          dangerProximity: psychLevel,
          psychologicalState: psychLevel
        });
        if (droneRef.current) {
          droneRef.current.frequency.rampTo(soundParams.droneFrequencyHz, 5);
          droneRef.current.volume.rampTo(Tone.gainToDb(soundParams.droneVolume * 0.4), 5);
        }
      } catch (e) {}
    }, 20000);

    return () => clearInterval(interval);
  }, [psychLevel]);

  const lockPointer = () => {
    // Attempt state transition first to ensure game starts regardless of pointer lock success
    if (gameState === 'STATE_MENU') {
      transitionTo('STATE_PLAYING');
    }

    const element = containerRef.current;
    if (!element) return;

    try {
      // Modern browsers return a promise from requestPointerLock
      const lockResult = element.requestPointerLock() as any;
      if (lockResult instanceof Promise) {
        lockResult.catch((err) => {
          console.warn("Pointer lock rejected by browser/sandbox:", err);
          setIsLocked(true); // Fallback to allowing mouse movement without lock
        });
      }
    } catch (e) {
      console.warn("Synchronous pointer lock failure:", e);
      // If pointer lock is totally blocked (sandbox), we still want to play
      setIsLocked(true); 
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative" onClick={lockPointer}>
      <div id="crosshair" />
      <div className="horror-noise" />
      
      {sceneRef.current && playerRef.current && (
         <AIThreadling 
           scene={sceneRef.current} 
           playerPos={playerPos.current} 
           acousticIntensity={roomAcousticIntensity.current}
           onCatch={() => transitionTo('STATE_DEATH_SEQUENCE')}
           depth={depth}
         />
      )}

      <div className="absolute top-8 left-8 mix-blend-difference opacity-70 pointer-events-none">
        <h1 className="font-headline text-2xl tracking-tighter text-primary uppercase">
          REDROOM: THE LAST EXIT
        </h1>
        <div className="font-body text-xs mt-2 space-y-1">
          <p>DEPTH: {depth.toString().padStart(4, '0')}m</p>
          <p>PSYCHE: {(psychLevel * 100).toFixed(1)}%</p>
          <p>ACOUSTIC: {roomAcousticIntensity.current.toFixed(1)}%</p>
          <p>SIGNAL: STABLE</p>
        </div>
      </div>

      {gameState === 'STATE_MENU' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-[2000]">
          <div className="text-center animate-visceral-pulse">
            <h2 className="font-headline text-6xl mb-4 text-primary font-bold">INITIATE DESCENT</h2>
            <p className="font-body text-sm opacity-50 uppercase tracking-[0.3em]">Click to begin the cycle</p>
          </div>
        </div>
      )}

      {gameState === 'STATE_DEATH_SEQUENCE' && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-950/90 z-[3000]">
          <div className="text-center">
            <h2 className="font-headline text-8xl mb-4 text-white font-black animate-glitch">CONSUMED</h2>
            <p className="font-body text-xl text-white opacity-70 mb-8 uppercase tracking-widest">The exit is an illusion</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-12 py-4 bg-white text-black font-bold uppercase hover:bg-red-600 transition-colors"
            >
              Restart Cycle
            </button>
          </div>
        </div>
      )}

      {gameState === 'STATE_WIN_SEQUENCE' && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-[3000]">
          <div className="text-center">
            <h2 className="font-headline text-8xl mb-4 text-black font-black">ESCAPED?</h2>
            <p className="font-body text-xl text-black opacity-70 mb-8 uppercase tracking-widest">Depth 5 Reached. You are alone in the white.</p>
          </div>
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none z-[1500] border-[40px] border-black/20" />
    </div>
  );
}
