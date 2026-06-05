
"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { MatrixRedShader } from './Shaders';
import { InputManager } from '@/game/input/InputManager';
import { CameraController } from '@/game/player/CameraController';
import { PlayerController } from '@/game/player/PlayerController';
import { GameLoop } from '@/game/core/GameLoop';

// Systems
import { RoomSystem, RoomType, DoorOutcome, RoomConfig } from '@/game/systems/RoomSystem';
import { ProgressionSystem } from '@/game/systems/ProgressionSystem';
import { MonsterSystem, MonsterState } from '@/game/systems/MonsterSystem';
import { HeartRateSystem } from '@/game/systems/HeartRateSystem';
import { DoorSystem } from '@/game/systems/DoorSystem';
import { DeathSystem } from '@/game/systems/DeathSystem';
import { WinSystem } from '@/game/systems/WinSystem';

export default function Engine() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'DEAD' | 'WON'>('MENU');
  
  // Transition Lock State
  const isTransitioning = useRef(false);
  const lastActivationTime = useRef(0);

  const [uiData, setUiData] = useState({ 
    progress: 'ROOM 1/6', 
    bpm: 70, 
    deathReason: '',
    monsterState: 'HIDDEN',
    roomId: '',
    roomType: '',
    parentId: ''
  });

  // System Refs
  const systems = useRef({
    room: new RoomSystem(),
    progression: new ProgressionSystem(),
    monster: new MonsterSystem(),
    heart: new HeartRateSystem(),
    door: new DoorSystem(),
    death: new DeathSystem(),
    win: new WinSystem(),
  }).current;

  const engineRef = useRef<{
    input: InputManager;
    camera: CameraController;
    player: PlayerController;
    loop: GameLoop;
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    monsterMesh: THREE.Mesh;
    doorMeshes: THREE.Group;
    roomBox: THREE.Mesh;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000);
    containerRef.current.appendChild(renderer.domElement);

    // Shaders
    const redMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(MatrixRedShader.uniforms),
      vertexShader: MatrixRedShader.vertexShader,
      fragmentShader: MatrixRedShader.fragmentShader,
      side: THREE.BackSide,
    });
    const box = new THREE.Mesh(new THREE.BoxGeometry(20, 6, 20), redMat);
    box.position.set(0, 3, 0);
    scene.add(box);

    // Monster Mesh
    const monsterGeo = new THREE.IcosahedronGeometry(0.8, 0);
    const monsterMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const monsterMesh = new THREE.Mesh(monsterGeo, monsterMat);
    scene.add(monsterMesh);

    // Door Group
    const doorMeshes = new THREE.Group();
    scene.add(doorMeshes);

    const input = new InputManager();
    input.mouse.setElement(containerRef.current);
    const cameraCtrl = new CameraController(camera);
    const playerCtrl = new PlayerController(input, cameraCtrl);

    const gameLoop = new GameLoop(input, playerCtrl, cameraCtrl, (dt) => {
      if (systems.death.isDead) {
        setGameState('DEAD');
        return;
      }
      if (systems.win.hasWon) {
        setGameState('WON');
        return;
      }

      // 1. Update Monster
      const distToMonster = monsterMesh.position.distanceTo(playerCtrl.position);
      const isTerrified = distToMonster < 8 && systems.monster.state !== MonsterState.HIDDEN;
      systems.monster.update(dt, playerCtrl.position, systems.heart.bpm);
      monsterMesh.position.copy(systems.monster.position);

      // 2. Update Heart Rate
      const danger = systems.monster.state !== MonsterState.HIDDEN ? Math.max(0, 1 - (distToMonster / 15)) : 0;
      systems.heart.update(dt, danger, isTerrified);
      if (systems.heart.isHeartFailure) {
        systems.death.trigger("HEART FAILURE");
      }

      // 3. Collision with Monster
      if (distToMonster < 1.1 && systems.monster.state !== MonsterState.HIDDEN) {
        systems.death.trigger("YOU WERE CONSUMED");
      }

      // 4. Update Visuals
      redMat.uniforms.u_IsWin.value = systems.win.hasWon;
      redMat.uniforms.u_DepthLevel.value = systems.progression.currentRoomProgress;
      
      // Sync Three.js Camera
      camera.position.copy(playerCtrl.position);
      renderer.render(scene, camera);

      // UI Sync
      setUiData({
        progress: systems.progression.progressString,
        bpm: Math.round(systems.heart.bpm),
        deathReason: systems.death.deathReason,
        monsterState: MonsterState[systems.monster.state],
        roomId: systems.room.currentRoom.id,
        roomType: RoomType[systems.room.currentRoom.type],
        parentId: systems.room.currentRoom.parent?.id || 'NONE'
      });
    });

    engineRef.current = { input, camera: cameraCtrl, player: playerCtrl, loop: gameLoop, scene, renderer, monsterMesh, doorMeshes, roomBox: box };
    gameLoop.start();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      gameLoop.stop();
      input.dispose();
      window.removeResizeListener?.();
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  const buildRoomVisuals = () => {
    if (!engineRef.current) return;
    const { doorMeshes } = engineRef.current;
    doorMeshes.clear();

    const doorGeo = new THREE.BoxGeometry(2, 3, 0.2);
    const doorMat = new THREE.ShaderMaterial({
      uniforms: { ...THREE.UniformsUtils.clone(MatrixRedShader.uniforms), u_IsDoor: { value: true } },
      vertexShader: MatrixRedShader.vertexShader,
      fragmentShader: MatrixRedShader.fragmentShader,
    });

    const outcomes = systems.room.currentRoom.doorOutcomes;
    
    if (outcomes.north !== undefined) {
      const d = new THREE.Mesh(doorGeo, doorMat);
      d.position.set(0, 1.5, -9.8);
      doorMeshes.add(d);
    }
    if (outcomes.south !== undefined) {
      const d = new THREE.Mesh(doorGeo, doorMat);
      d.position.set(0, 1.5, 9.8);
      doorMeshes.add(d);
    }
    if (outcomes.east !== undefined) {
      const d = new THREE.Mesh(doorGeo, doorMat);
      d.rotation.y = Math.PI / 2;
      d.position.set(9.8, 1.5, 0);
      doorMeshes.add(d);
    }
    if (outcomes.west !== undefined) {
      const d = new THREE.Mesh(doorGeo, doorMat);
      d.rotation.y = Math.PI / 2;
      d.position.set(-9.8, 1.5, 0);
      doorMeshes.add(d);
    }
  };

  const handleInteraction = () => {
    if (!engineRef.current) return;
    engineRef.current.input.mouse.requestLock();

    if (gameState === 'MENU') {
      setGameState('PLAYING');
      buildRoomVisuals();
      return;
    }

    if (gameState === 'DEAD' || gameState === 'WON') {
      window.location.reload();
      return;
    }

    // TRANSITION GUARD
    if (isTransitioning.current) {
      console.log('[Engine] Transition Lock Active - Ignoring Interaction');
      return;
    }

    // COOLDOWN GUARD
    const now = Date.now();
    if (now - lastActivationTime.current < 1500) {
      console.log('[Engine] Door Cooldown Active');
      return;
    }

    const interaction = systems.door.checkInteraction(
      engineRef.current.player.position,
      engineRef.current.camera.getDirection(),
      systems.room.currentRoom.doorOutcomes
    );

    if (interaction !== null) {
      console.log(`[Engine] DOOR ENTERED: ${interaction.key.toUpperCase()} | TYPE: ${DoorOutcome[interaction.outcome]}`);
      processDoorOutcome(interaction.outcome, interaction.key);
    }
  };

  const processDoorOutcome = (outcome: DoorOutcome, directionKey: string) => {
    const prevRoom = systems.room.currentRoom;
    
    // LOCK TRANSITIONS
    isTransitioning.current = true;
    lastActivationTime.current = Date.now();
    console.log('[Engine] TRANSITION LOCK ENABLED');

    switch (outcome) {
      case DoorOutcome.CORRECT:
        systems.progression.increment();
        if (systems.progression.isComplete()) {
          systems.win.trigger();
          setGameState('WON');
        } else {
          systems.room.currentRoom = systems.room.generateMainRoom(prevRoom, systems.progression.currentRoomProgress);
          resetPlayer(directionKey);
        }
        break;
      case DoorOutcome.DEAD_END:
        systems.room.currentRoom = systems.room.generateDeadEndRoom(prevRoom);
        resetPlayer(directionKey);
        break;
      case DoorOutcome.MONSTER:
        systems.room.currentRoom = systems.room.generateMonsterRoom(prevRoom);
        systems.monster.spawn(new THREE.Vector3(0, 1.7, -5));
        systems.monster.triggerHunt(engineRef.current!.player.position);
        resetPlayer(directionKey);
        break;
      case DoorOutcome.NOISE_TRAP:
        systems.room.currentRoom = systems.room.generateTrapRoom(prevRoom);
        systems.monster.spawn(new THREE.Vector3(0, 1.7, -15));
        resetPlayer(directionKey);
        break;
      case DoorOutcome.EXIT_BACK:
        if (prevRoom.parent) {
          systems.room.currentRoom = prevRoom.parent;
          systems.progression.currentRoomProgress = prevRoom.parent.progressAtCreation;
        }
        resetPlayer(directionKey);
        break;
    }

    console.log(`[Engine] ROOM GENERATED: ${systems.room.currentRoom.id}`);
    buildRoomVisuals();

    // UNLOCK AFTER DELAY
    setTimeout(() => {
      isTransitioning.current = false;
      console.log('[Engine] TRANSITION LOCK DISABLED');
    }, 1000);
  };

  const resetPlayer = (directionKey: string) => {
    if (!engineRef.current) return;
    
    const player = engineRef.current.player;
    // Spawn 5 units inside the room to be safe from doorway triggers (9.5 - 5 = 4.5 dist to door)
    const spawnPos = 4.5; 

    // Reset to center
    player.position.set(0, 1.7, 0);

    // Inverse Cardinal logic for "walking through"
    // e.g. North click -> Appear at South end facing center
    if (directionKey === 'north') player.position.z = spawnPos;
    if (directionKey === 'south') player.position.z = -spawnPos;
    if (directionKey === 'east') player.position.x = -spawnPos;
    if (directionKey === 'west') player.position.x = spawnPos;

    systems.monster.hide();
    console.log(`[Engine] PLAYER SPAWNED AT SAFE POSITION: ${player.position.x}, ${player.position.z}`);
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative overflow-hidden cursor-none"
      onClick={handleInteraction}
    >
      {/* DEBUG OVERLAY */}
      {gameState === 'PLAYING' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 font-mono text-[10px] text-red-500 bg-black/50 p-2 pointer-events-none text-center z-[60]">
          ID: {uiData.roomId} | TYPE: {uiData.roomType} | PROG: {uiData.progress} | PARENT: {uiData.parentId}
          <br/>
          DEBUG PATHS: N: {DoorOutcome[systems.room.currentRoom.doorOutcomes.north ?? -1]} | 
          S: {DoorOutcome[systems.room.currentRoom.doorOutcomes.south ?? -1]} | 
          E: {DoorOutcome[systems.room.currentRoom.doorOutcomes.east ?? -1]} | 
          W: {DoorOutcome[systems.room.currentRoom.doorOutcomes.west ?? -1]}
        </div>
      )}

      {/* HUD */}
      {gameState === 'PLAYING' && (
        <>
          <div className="absolute top-8 left-8 font-headline text-2xl text-red-600 font-bold select-none">
            {uiData.progress}
          </div>
          <div className="absolute top-8 right-8 font-headline text-2xl text-red-600 font-bold flex items-center gap-2 select-none animate-visceral-pulse">
            <span className="text-3xl">❤</span> {uiData.bpm} BPM
          </div>
          
          <div className="absolute bottom-4 left-4 font-mono text-[10px] text-white/20 pointer-events-none">
            MONSTER: {uiData.monsterState}
          </div>
        </>
      )}

      {/* OVERLAYS */}
      {gameState === 'MENU' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50">
          <div className="text-center">
            <h1 className="text-8xl font-black text-red-600 italic tracking-tighter mb-8 animate-glitch">REDROOM</h1>
            <p className="text-white/40 font-headline tracking-[0.5em] animate-pulse">CLICK TO START THE LOOP</p>
          </div>
        </div>
      )}

      {gameState === 'DEAD' && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-950/90 z-50">
          <div className="text-center">
            <h1 className="text-6xl font-black text-red-600 mb-4">{uiData.deathReason}</h1>
            <p className="text-8xl font-black text-white mb-8">YOU DIED</p>
            <p className="text-white/40 font-headline tracking-widest animate-pulse">CLICK TO RESTART</p>
          </div>
        </div>
      )}

      {gameState === 'WON' && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-50">
          <div className="text-center">
            <h1 className="text-6xl font-black text-black mb-8 tracking-tighter">YOU SURVIVED</h1>
            <p className="text-black/40 font-headline tracking-widest animate-pulse">CLICK TO EXIT</p>
          </div>
        </div>
      )}

      <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 mix-blend-difference pointer-events-none" />
      <div className="horror-noise opacity-20 pointer-events-none" />
    </div>
  );
}

