
"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { MatrixRedShader } from './Shaders';
import { InputManager } from '@/game/input/InputManager';
import { CameraController } from '@/game/player/CameraController';
import { PlayerController } from '@/game/player/PlayerController';
import { GameLoop } from '@/game/core/GameLoop';

// Systems
import { RoomSystem, RoomType, OpeningOutcome } from '@/game/systems/RoomSystem';
import { ProgressionSystem } from '@/game/systems/ProgressionSystem';
import { MonsterSystem, MonsterState } from '@/game/systems/MonsterSystem';
import { HeartRateSystem } from '@/game/systems/HeartRateSystem';
import { DeathSystem } from '@/game/systems/DeathSystem';
import { WinSystem } from '@/game/systems/WinSystem';

// AAA Visuals
import { ThreadlingVisuals } from './ThreadlingVisuals';

export default function Engine() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'DEAD' | 'WON'>('MENU');
  
  const [uiData, setUiData] = useState({ 
    progress: 'ROOM 1/6', 
    bpm: 70, 
    deathReason: '',
    roomType: 'MAIN'
  });

  const systems = useMemo(() => ({
    room: new RoomSystem(),
    progression: new ProgressionSystem(),
    monster: new MonsterSystem(),
    heart: new HeartRateSystem(),
    death: new DeathSystem(),
    win: new WinSystem(),
  }), []);

  const engineRef = useRef<{
    input: InputManager;
    camera: CameraController;
    player: PlayerController;
    loop: GameLoop;
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    roomGroup: THREE.Group;
    monsterVisuals: ThreadlingVisuals;
    redMat: THREE.ShaderMaterial;
  } | null>(null);

  // Helper to build a single room mesh group
  const createRoomMeshes = (config: any, xOffset: number, zOffset: number) => {
    const group = new THREE.Group();
    group.position.set(xOffset, 0, zOffset);

    const wallMat = engineRef.current?.redMat || new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(MatrixRedShader.uniforms),
      vertexShader: MatrixRedShader.vertexShader,
      fragmentShader: MatrixRedShader.fragmentShader,
      side: THREE.BackSide,
    });

    const isWhite = config.type === RoomType.FINAL;
    const mat = wallMat.clone();
    mat.uniforms.u_IsWin.value = isWhite;
    mat.uniforms.u_DepthLevel.value = config.progressAtCreation;

    // Floor & Ceiling
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), mat);
    floor.rotation.x = -Math.PI / 2;
    group.add(floor);

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), mat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 6;
    group.add(ceil);

    // Wall Panels (2 per wall to create opening)
    const buildWall = (dir: string, outcome: OpeningOutcome) => {
      const wallGroup = new THREE.Group();
      if (dir === 'north') { wallGroup.position.z = -10; }
      if (dir === 'south') { wallGroup.position.z = 10; wallGroup.rotation.y = Math.PI; }
      if (dir === 'east') { wallGroup.position.x = 10; wallGroup.rotation.y = -Math.PI / 2; }
      if (dir === 'west') { wallGroup.position.x = -10; wallGroup.rotation.y = Math.PI / 2; }

      if (outcome === OpeningOutcome.NONE) {
        const fullWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 6), mat);
        fullWall.position.y = 3;
        wallGroup.add(fullWall);
      } else {
        // Left panel
        const left = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 6), mat);
        left.position.set(-5.75, 3, 0);
        wallGroup.add(left);
        // Right panel
        const right = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 6), mat);
        right.position.set(5.75, 3, 0);
        wallGroup.add(right);
        // Header
        const header = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), mat);
        header.position.set(0, 5, 0);
        wallGroup.add(header);
        
        // "Void" plane behind opening to block far view
        const voidMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const voidPlane = new THREE.Mesh(new THREE.PlaneGeometry(3, 4), voidMat);
        voidPlane.position.set(0, 2, -0.1); // Slightly behind wall
        wallGroup.add(voidPlane);
      }
      group.add(wallGroup);
    };

    buildWall('north', config.outcomes.north);
    buildWall('south', config.outcomes.south);
    buildWall('east', config.outcomes.east);
    buildWall('west', config.outcomes.west);

    return group;
  };

  const refreshRoomVisuals = () => {
    if (!engineRef.current) return;
    const { roomGroup, room } = systems;
    engineRef.current.roomGroup.clear();

    const cur = room.currentRoom;
    // Main room
    engineRef.current.roomGroup.add(createRoomMeshes(cur, 0, 0));
    
    // Neighbors
    if (cur.outcomes.north !== OpeningOutcome.NONE) 
      engineRef.current.roomGroup.add(createRoomMeshes(room.getOrCreateRoom(cur.x, cur.z - 1, cur.progressAtCreation, cur), 0, -20));
    if (cur.outcomes.south !== OpeningOutcome.NONE) 
      engineRef.current.roomGroup.add(createRoomMeshes(room.getOrCreateRoom(cur.x, cur.z + 1, cur.progressAtCreation, cur), 0, 20));
    if (cur.outcomes.east !== OpeningOutcome.NONE) 
      engineRef.current.roomGroup.add(createRoomMeshes(room.getOrCreateRoom(cur.x + 1, cur.z, cur.progressAtCreation, cur), 20, 0));
    if (cur.outcomes.west !== OpeningOutcome.NONE) 
      engineRef.current.roomGroup.add(createRoomMeshes(room.getOrCreateRoom(cur.x - 1, cur.z, cur.progressAtCreation, cur), -20, 0));
    
    engineRef.current.player.activeOutcomes = cur.outcomes;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.1, 50);
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000);
    containerRef.current.appendChild(renderer.domElement);

    const redMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(MatrixRedShader.uniforms),
      vertexShader: MatrixRedShader.vertexShader,
      fragmentShader: MatrixRedShader.fragmentShader,
      side: THREE.FrontSide, // Walls are planes now
    });

    const roomGroup = new THREE.Group();
    scene.add(roomGroup);

    const monsterVisuals = new ThreadlingVisuals();
    scene.add(monsterVisuals.group);

    const input = new InputManager();
    input.mouse.setElement(containerRef.current);
    const cameraCtrl = new CameraController(camera);
    const playerCtrl = new PlayerController(input, cameraCtrl);

    const gameLoop = new GameLoop(input, playerCtrl, cameraCtrl, (dt) => {
      if (systems.death.isDead) { setGameState('DEAD'); return; }
      if (systems.win.hasWon) { setGameState('WON'); return; }

      // 1. Boundary Streaming Detection
      if (playerCtrl.position.z < -10) {
        handleTransition('north');
      } else if (playerCtrl.position.z > 10) {
        handleTransition('south');
      } else if (playerCtrl.position.x > 10) {
        handleTransition('east');
      } else if (playerCtrl.position.x < -10) {
        handleTransition('west');
      }

      // 2. Update Systems
      systems.monster.update(dt, playerCtrl.position, systems.heart.bpm);
      monsterVisuals.update(systems.monster.position, MonsterState[systems.monster.state]);

      const dist = systems.monster.position.distanceTo(playerCtrl.position);
      const isVisible = systems.monster.state !== MonsterState.HIDDEN && dist < 15;
      systems.heart.update(dt, systems.monster.state !== MonsterState.HIDDEN ? Math.max(0, 1 - (dist / 18)) : 0, isVisible);
      
      if (systems.heart.isHeartFailure) systems.death.trigger("HEART FAILURE");
      if (dist < 1.2 && systems.monster.state !== MonsterState.HIDDEN) systems.death.trigger("YOU WERE CONSUMED");

      camera.position.copy(playerCtrl.position);
      renderer.render(scene, camera);

      setUiData({
        progress: systems.progression.progressString,
        bpm: Math.round(systems.heart.bpm),
        deathReason: systems.death.deathReason,
        roomType: RoomType[systems.room.currentRoom.type]
      });
    });

    const handleTransition = (dir: 'north' | 'south' | 'east' | 'west') => {
      const prevRoom = systems.room.currentRoom;
      const outcome = prevRoom.outcomes[dir];
      
      // Process Outcome
      if (outcome === OpeningOutcome.CORRECT) {
        systems.progression.increment();
      } else if (outcome === OpeningOutcome.DEAD_END || outcome === OpeningOutcome.EXIT_BACK) {
        // No progress
      } else if (outcome === OpeningOutcome.MONSTER) {
        systems.monster.spawn(new THREE.Vector3(0, 5, -5));
        systems.monster.triggerHunt(playerCtrl.position);
      } else if (outcome === OpeningOutcome.NOISE_TRAP) {
        systems.monster.spawn(new THREE.Vector3(0, 5, -15));
      }

      // Shift world
      systems.room.move(dir);
      if (dir === 'north') { playerCtrl.position.z += 20; systems.monster.position.z += 20; }
      if (dir === 'south') { playerCtrl.position.z -= 20; systems.monster.position.z -= 20; }
      if (dir === 'east') { playerCtrl.position.x -= 20; systems.monster.position.x -= 20; }
      if (dir === 'west') { playerCtrl.position.x += 20; systems.monster.position.x += 20; }

      if (systems.progression.isComplete()) {
        systems.win.trigger();
        setGameState('WON');
      }

      refreshRoomVisuals();
    };

    engineRef.current = { 
      input, camera: cameraCtrl, player: playerCtrl, loop: gameLoop, scene, renderer, roomGroup, monsterVisuals, redMat
    };
    
    refreshRoomVisuals();
    gameLoop.start();

    return () => {
      gameLoop.stop();
      input.dispose();
      renderer.dispose();
    };
  }, [systems]);

  const handleInteraction = () => {
    if (!engineRef.current) return;
    engineRef.current.input.mouse.requestLock();
    if (gameState === 'MENU') setGameState('PLAYING');
    if (gameState === 'DEAD' || gameState === 'WON') window.location.reload();
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden cursor-none" onClick={handleInteraction}>
      {gameState === 'PLAYING' && (
        <>
          <div className="absolute top-8 left-8 font-headline text-2xl text-red-600 font-bold select-none">
            {uiData.progress}
          </div>
          <div className="absolute top-8 right-8 font-headline text-2xl text-red-600 font-bold flex items-center gap-2 select-none animate-visceral-pulse">
            <span className="text-3xl">❤</span> {uiData.bpm} BPM
          </div>
          <div className="absolute bottom-4 left-4 font-mono text-[10px] text-white/20 pointer-events-none">
            TYPE: {uiData.roomType}
          </div>
        </>
      )}
      {gameState === 'MENU' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50">
          <div className="text-center">
            <h1 className="text-8xl font-black text-red-600 italic tracking-tighter mb-8 animate-glitch">REDROOM</h1>
            <p className="text-white/40 font-headline tracking-[0.5em] animate-pulse uppercase">Enter the connected void</p>
          </div>
        </div>
      )}
      {gameState === 'DEAD' && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-950/90 z-50">
          <div className="text-center">
            <h1 className="text-6xl font-black text-red-600 mb-4 uppercase">{uiData.deathReason}</h1>
            <p className="text-8xl font-black text-white mb-8">TERMINATED</p>
            <p className="text-white/40 font-headline tracking-widest animate-pulse">RETRY</p>
          </div>
        </div>
      )}
      {gameState === 'WON' && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-50">
          <div className="text-center">
            <h1 className="text-6xl font-black text-black mb-8 tracking-tighter">SURVIVAL CONFIRMED</h1>
            <p className="text-black/40 font-headline tracking-widest animate-pulse">EXIT MATRIX</p>
          </div>
        </div>
      )}
      <div className="horror-noise opacity-20 pointer-events-none" />
    </div>
  );
}
