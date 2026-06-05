
"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { MatrixRedShader } from './Shaders';
import { InputManager } from '@/game/input/InputManager';
import { CameraController } from '@/game/player/CameraController';
import { PlayerController } from '@/game/player/PlayerController';
import { GameLoop } from '@/game/core/GameLoop';

// Systems
import { RoomSystem, RoomType, DoorOutcome } from '@/game/systems/RoomSystem';
import { ProgressionSystem } from '@/game/systems/ProgressionSystem';
import { MonsterSystem, MonsterState } from '@/game/systems/MonsterSystem';
import { HeartRateSystem } from '@/game/systems/HeartRateSystem';
import { DoorSystem } from '@/game/systems/DoorSystem';
import { DeathSystem } from '@/game/systems/DeathSystem';
import { WinSystem } from '@/game/systems/WinSystem';

// AAA Visuals
import ThreadlingVisuals from './ThreadlingVisuals';

export default function Engine() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'DEAD' | 'WON'>('MENU');
  const isTransitioning = useRef(false);
  const lastActivationTime = useRef(0);

  const [uiData, setUiData] = useState({ 
    progress: 'ROOM 1/6', 
    bpm: 70, 
    deathReason: '',
    monsterState: 'HIDDEN',
    monsterPos: new THREE.Vector3(0, -50, 0)
  });

  const systems = useMemo(() => ({
    room: new RoomSystem(),
    progression: new ProgressionSystem(),
    monster: new MonsterSystem(),
    heart: new HeartRateSystem(),
    door: new DoorSystem(),
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
    doorMeshes: THREE.Group;
    roomBox: THREE.Mesh;
    redMat: THREE.ShaderMaterial;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000);
    containerRef.current.appendChild(renderer.domElement);

    const redMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(MatrixRedShader.uniforms),
      vertexShader: MatrixRedShader.vertexShader,
      fragmentShader: MatrixRedShader.fragmentShader,
      side: THREE.BackSide,
    });
    const box = new THREE.Mesh(new THREE.BoxGeometry(20, 6, 20), redMat);
    box.position.set(0, 3, 0);
    scene.add(box);

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

      // 1. Update Monster (The Weaver)
      systems.monster.update(dt, playerCtrl.position, systems.heart.bpm);
      const distToMonster = systems.monster.position.distanceTo(playerCtrl.position);
      const isVisible = systems.monster.state !== MonsterState.HIDDEN && distToMonster < 15;

      // 2. Update Heart Rate (Stress-based failure)
      const danger = systems.monster.state !== MonsterState.HIDDEN ? Math.max(0, 1 - (distToMonster / 18)) : 0;
      systems.heart.update(dt, danger, isVisible);
      if (systems.heart.isHeartFailure) {
        systems.death.trigger("HEART FAILURE");
      }

      // 3. Collision with Monster
      if (distToMonster < 1.2 && systems.monster.state !== MonsterState.HIDDEN) {
        systems.death.trigger("YOU WERE CONSUMED");
      }

      // 4. Update Visuals
      redMat.uniforms.u_IsWin.value = systems.win.hasWon;
      redMat.uniforms.u_DepthLevel.value = systems.progression.currentRoomProgress;
      
      camera.position.copy(playerCtrl.position);
      renderer.render(scene, camera);

      setUiData({
        progress: systems.progression.progressString,
        bpm: Math.round(systems.heart.bpm),
        deathReason: systems.death.deathReason,
        monsterState: MonsterState[systems.monster.state],
        monsterPos: systems.monster.position.clone()
      });
    });

    engineRef.current = { input, camera: cameraCtrl, player: playerCtrl, loop: gameLoop, scene, renderer, doorMeshes, roomBox: box, redMat };
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
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [systems]);

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

    if (isTransitioning.current) return;
    const now = Date.now();
    if (now - lastActivationTime.current < 1500) return;

    const interaction = systems.door.checkInteraction(
      engineRef.current.player.position,
      engineRef.current.camera.getDirection(),
      systems.room.currentRoom.doorOutcomes
    );

    if (interaction !== null) {
      processDoorOutcome(interaction.outcome, interaction.key);
    }
  };

  const processDoorOutcome = (outcome: DoorOutcome, directionKey: string) => {
    const prevRoom = systems.room.currentRoom;
    isTransitioning.current = true;
    lastActivationTime.current = Date.now();

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
        // AAA: Weaver emerges from the ceiling
        systems.monster.spawn(new THREE.Vector3(0, 5, -5)); 
        systems.monster.triggerHunt(engineRef.current!.player.position);
        resetPlayer(directionKey);
        break;
      case DoorOutcome.NOISE_TRAP:
        systems.room.currentRoom = systems.room.generateTrapRoom(prevRoom);
        systems.monster.spawn(new THREE.Vector3(0, 5, -15));
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

    buildRoomVisuals();
    setTimeout(() => { isTransitioning.current = false; }, 1000);
  };

  const resetPlayer = (directionKey: string) => {
    if (!engineRef.current) return;
    const player = engineRef.current.player;
    const spawnPos = 4.5; 
    player.position.set(0, 1.7, 0);
    if (directionKey === 'north') player.position.z = spawnPos;
    if (directionKey === 'south') player.position.z = -spawnPos;
    if (directionKey === 'east') player.position.x = -spawnPos;
    if (directionKey === 'west') player.position.x = spawnPos;
    systems.monster.hide();
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative overflow-hidden cursor-none"
      onClick={handleInteraction}
    >
      {/* AAA WEAVER VISUALS */}
      {engineRef.current && (
        <div className="hidden">
          <ThreadlingVisuals 
            position={uiData.monsterPos} 
            state={uiData.monsterState} 
          />
        </div>
      )}

      {gameState === 'PLAYING' && (
        <>
          <div className="absolute top-8 left-8 font-headline text-2xl text-red-600 font-bold select-none">
            {uiData.progress}
          </div>
          <div className="absolute top-8 right-8 font-headline text-2xl text-red-600 font-bold flex items-center gap-2 select-none animate-visceral-pulse">
            <span className="text-3xl">❤</span> {uiData.bpm} BPM
          </div>
          <div className="absolute bottom-4 left-4 font-mono text-[10px] text-white/20 pointer-events-none">
            WEAVER STATE: {uiData.monsterState}
          </div>
        </>
      )}

      {gameState === 'MENU' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50">
          <div className="text-center">
            <h1 className="text-8xl font-black text-red-600 italic tracking-tighter mb-8 animate-glitch">REDROOM</h1>
            <p className="text-white/40 font-headline tracking-[0.5em] animate-pulse">INITIATE THE LOOP</p>
          </div>
        </div>
      )}

      {gameState === 'DEAD' && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-950/90 z-50">
          <div className="text-center">
            <h1 className="text-6xl font-black text-red-600 mb-4">{uiData.deathReason}</h1>
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

      <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 mix-blend-difference pointer-events-none" />
      <div className="horror-noise opacity-20 pointer-events-none" />
    </div>
  );
}
