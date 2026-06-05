
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { MatrixRedShader } from './Shaders';
import * as Tone from 'tone';

// --- CONSTANTS ---
const ROOM_SIZE = 20;
const BOUNDARY = 9.4; // Slightly offset for character radius
const PLAYER_HEIGHT = 1.7;
const MOUSE_SENSITIVITY = 0.0025;
const MOVEMENT_SPEED = 4.5;
const MAX_DT = 0.1;
const INTERACTION_DISTANCE = 3.5;

type GameState = 'STATE_MENU' | 'STATE_PLAYING' | 'STATE_WIN_SEQUENCE';
type DoorCardinal = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';

interface DoorMeta {
  mesh: THREE.Mesh;
  cardinal: DoorCardinal;
  isCorrect: boolean;
  position: THREE.Vector3;
}

export default function Engine() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>('STATE_MENU');
  const [depth, setDepth] = useState(1);
  const [isLocked, setIsLocked] = useState(false);

  // Engine Refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const playerRef = useRef<THREE.Group | null>(null);
  const doorsRef = useRef<DoorMeta[]>([]);
  
  // Physics & Input Refs
  const keyStates = useRef<{ [key: string]: boolean }>({
    KeyW: false, KeyA: false, KeyS: false, KeyD: false
  });
  const playerPos = useRef(new THREE.Vector3(0, PLAYER_HEIGHT, 0));
  const yaw = useRef(0);
  const pitch = useRef(0);
  const totalElapsedTime = useRef(0);
  const correctDoorIndex = useRef(Math.floor(Math.random() * 4));

  // Audio Refs
  const heartbeatRef = useRef<Tone.MembraneSynth | null>(null);
  const droneRef = useRef<Tone.Oscillator | null>(null);

  // --- TRANSITION LOGIC ---
  const transitionTo = useCallback((nextState: GameState) => {
    setGameState(nextState);
    if (nextState === 'STATE_PLAYING') {
      playerPos.current.set(0, PLAYER_HEIGHT, 0);
    }
  }, []);

  const resetRoom = (advance: boolean) => {
    if (advance) {
      if (depth >= 4) {
        transitionTo('STATE_WIN_SEQUENCE');
        return;
      }
      setDepth(d => d + 1);
    } else {
      setDepth(1);
    }
    
    // Teleport to center
    playerPos.current.set(0, PLAYER_HEIGHT, 0);
    correctDoorIndex.current = Math.floor(Math.random() * 4);
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.1, 100);
    cameraRef.current = camera;

    const player = new THREE.Group();
    player.add(camera);
    scene.add(player);
    playerRef.current = player;

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xff0000);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const buildGeometry = () => {
      // Monolithic Red Shader
      const redMat = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(MatrixRedShader.uniforms),
        vertexShader: MatrixRedShader.vertexShader,
        fragmentShader: MatrixRedShader.fragmentShader,
        side: THREE.BackSide,
      });

      const boxGeo = new THREE.BoxGeometry(ROOM_SIZE, 6, ROOM_SIZE);
      const room = new THREE.Mesh(boxGeo, redMat);
      room.position.set(0, 3, 0);
      scene.add(room);

      // Doors
      const doorCardinalPoints = [
        { cardinal: 'NORTH' as const, pos: [0, 1.4, -9.99], rot: [0, 0, 0] },
        { cardinal: 'SOUTH' as const, pos: [0, 1.4, 9.99], rot: [0, Math.PI, 0] },
        { cardinal: 'EAST' as const, pos: [9.99, 1.4, 0], rot: [0, -Math.PI / 2, 0] },
        { cardinal: 'WEST' as const, pos: [-9.99, 1.4, 0], rot: [0, Math.PI / 2, 0] },
      ];

      doorCardinalPoints.forEach((point, i) => {
        const doorGeo = new THREE.PlaneGeometry(2.5, 3.5);
        const doorMat = new THREE.ShaderMaterial({
          uniforms: { ...THREE.UniformsUtils.clone(MatrixRedShader.uniforms), u_IsDoor: { value: true } },
          vertexShader: MatrixRedShader.vertexShader,
          fragmentShader: MatrixRedShader.fragmentShader,
        });
        const doorMesh = new THREE.Mesh(doorGeo, doorMat);
        doorMesh.position.set(point.pos[0], point.pos[1], point.pos[2]);
        doorMesh.rotation.set(point.rot[0], point.rot[1], point.rot[2]);
        scene.add(doorMesh);
        
        doorsRef.current.push({
          mesh: doorMesh,
          cardinal: point.cardinal,
          isCorrect: false, // Calculated per logic pass
          position: new THREE.Vector3(point.pos[0], point.pos[1], point.pos[2])
        });
      });
    };

    buildGeometry();

    // Event Listeners
    const onKeyDown = (e: KeyboardEvent) => { if (keyStates.current.hasOwnProperty(e.code)) keyStates.current[e.code] = true; };
    const onKeyUp = (e: KeyboardEvent) => { if (keyStates.current.hasOwnProperty(e.code)) keyStates.current[e.code] = false; };
    const onMouseMove = (e: MouseEvent) => {
      if (!isLocked) return;
      yaw.current -= e.movementX * MOUSE_SENSITIVITY;
      pitch.current -= e.movementY * MOUSE_SENSITIVITY;
      pitch.current = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch.current));
    };

    const onClick = () => {
      if (!isLocked) {
        lockPointer();
        return;
      }
      
      // Interaction Raycast
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera({ x: 0, y: 0 }, camera);
      const intersects = raycaster.intersectObjects(doorsRef.current.map(d => d.mesh));
      
      if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const doorData = doorsRef.current.find(d => d.mesh === hitMesh);
        const dist = playerPos.current.distanceTo(intersects[0].point);
        
        if (doorData && dist < INTERACTION_DISTANCE) {
          const isCorrect = doorsRef.current.indexOf(doorData) === correctDoorIndex.current;
          resetRoom(isCorrect);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onClick);
    
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
        // --- 1. KINEMATIC INTEGRATION ---
        const forward = new THREE.Vector3(Math.sin(yaw.current), 0, Math.cos(yaw.current)).normalize();
        const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
        
        const moveVec = new THREE.Vector3(0, 0, 0);
        if (keyStates.current['KeyW']) moveVec.add(forward.clone().multiplyScalar(-1));
        if (keyStates.current['KeyS']) moveVec.add(forward);
        if (keyStates.current['KeyA']) moveVec.add(right);
        if (keyStates.current['KeyD']) moveVec.add(right.clone().multiplyScalar(-1));
        
        if (moveVec.length() > 0) {
          moveVec.normalize().multiplyScalar(MOVEMENT_SPEED * dt);
          playerPos.current.add(moveVec);
        }

        // --- 2. COLLISION BOUNDING ---
        playerPos.current.x = Math.max(-BOUNDARY, Math.min(BOUNDARY, playerPos.current.x));
        playerPos.current.z = Math.max(-BOUNDARY, Math.min(BOUNDARY, playerPos.current.z));
        playerPos.current.y = PLAYER_HEIGHT;

        playerRef.current!.position.copy(playerPos.current);
        camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ');
      }

      // --- 3. UNIFORM STATE UPDATES ---
      const isDepth5 = depth >= 5 || gameState === 'STATE_WIN_SEQUENCE';
      const clearColor = isDepth5 ? 0xffffff : 0xff0000;
      renderer.setClearColor(clearColor);

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.ShaderMaterial) {
          obj.material.uniforms.u_DepthLevel.value = depth;
          obj.material.uniforms.u_IsWin.value = isDepth5;
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
      window.removeEventListener('mousedown', onClick);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      renderer.dispose();
    };
  }, [gameState, isLocked]);

  // --- AUDIO SYNTHESIS ---
  useEffect(() => {
    const initAudio = async () => {
      await Tone.start();
      
      const drone = new Tone.Oscillator(55, "sine").toDestination().start();
      drone.volume.value = -30;
      droneRef.current = drone;

      const heart = new Tone.MembraneSynth().toDestination();
      heartbeatRef.current = heart;

      const loop = new Tone.Loop(time => {
        heart.triggerAttackRelease("C1", "8n", time);
        heart.triggerAttackRelease("C1", "8n", time + 0.2);
      }, "1n").start(0);
      Tone.Transport.start();
    };
    
    if (gameState === 'STATE_PLAYING') initAudio();
    return () => { Tone.Transport.stop(); };
  }, [gameState]);

  const lockPointer = () => {
    if (gameState === 'STATE_MENU') transitionTo('STATE_PLAYING');
    containerRef.current?.requestPointerLock();
  };

  return (
    <div ref={containerRef} className="w-full h-full relative cursor-crosshair">
      <div className="absolute top-12 left-12 mix-blend-difference pointer-events-none opacity-80 z-50">
        <h1 className="font-headline text-4xl font-black text-primary tracking-tighter uppercase mb-1">
          REDROOM: THE LAST EXIT
        </h1>
        <div className="font-mono text-xs space-y-0.5 uppercase">
          <p>DEPTH: {depth.toString().padStart(3, '0')}</p>
          <p>SIGNAL: {gameState === 'STATE_WIN_SEQUENCE' ? 'LOST' : 'PURE'}</p>
          <p>STATUS: {isLocked ? 'LOCKED' : 'AWAITING LOCK'}</p>
        </div>
      </div>

      {gameState === 'STATE_MENU' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#ff0000] z-[5000]">
          <div className="text-center">
            <h2 className="text-9xl font-black text-black mb-8 animate-pulse italic">REDROOM</h2>
            <p className="text-xl font-mono text-black uppercase tracking-[0.5em] opacity-60">Click to enter the loop</p>
          </div>
        </div>
      )}

      {gameState === 'STATE_WIN_SEQUENCE' && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-[6000]">
          <div className="text-center text-black">
            <h2 className="text-9xl font-black mb-4">THE EXIT</h2>
            <p className="text-2xl font-mono uppercase tracking-widest opacity-80 mb-12">You have reached the void.</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-12 py-5 border-4 border-black font-black text-2xl uppercase hover:bg-black hover:text-white transition-all"
            >
              Reset Simulation
            </button>
          </div>
        </div>
      )}

      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 mix-blend-difference pointer-events-none z-40" />
      
      {/* Red Grain Overlay */}
      <div className="horror-noise opacity-10" />
    </div>
  );
}
