
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
import { ClownVisuals } from './ClownVisuals';

export default function Engine() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'DEAD' | 'WON'>('MENU');
  
  const [uiData, setUiData] = useState({ 
    progress: 'ROOM 1/6', 
    bpm: 70, 
    deathReason: '',
    roomType: 'MAIN',
    roomId: '0,0',
    monsterDist: 0,
    monsterState: 'HIDDEN',
    attacked: false
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
    clownVisuals: ClownVisuals;
    redMat: THREE.ShaderMaterial;
    threeCamera: THREE.PerspectiveCamera;
  } | null>(null);

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

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), mat);
    floor.rotation.x = -Math.PI / 2;
    group.add(floor);

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), mat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 6;
    group.add(ceil);

    const buildWall = (dir: string, outcome: OpeningOutcome) => {
      const wallGroup = new THREE.Group();
      if (dir === 'north') wallGroup.position.set(0, 0, -10);
      if (dir === 'south') { wallGroup.position.set(0, 0, 10); wallGroup.rotation.y = Math.PI; }
      if (dir === 'east') { wallGroup.position.set(10, 0, 0); wallGroup.rotation.y = -Math.PI / 2; }
      if (dir === 'west') { wallGroup.position.set(-10, 0, 0); wallGroup.rotation.y = Math.PI / 2; }

      if (outcome === OpeningOutcome.NONE) {
        const fullWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 6), mat);
        fullWall.position.y = 3;
        wallGroup.add(fullWall);
      } else {
        const left = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 6), mat);
        left.position.set(-5.75, 3, 0);
        wallGroup.add(left);
        const right = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 6), mat);
        right.position.set(5.75, 3, 0);
        wallGroup.add(right);
        const header = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), mat);
        header.position.set(0, 5, 0);
        wallGroup.add(header);
        
        const voidMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const voidPlane = new THREE.Mesh(new THREE.PlaneGeometry(3, 4), voidMat);
        voidPlane.position.set(0, 2, -0.1);
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
    const { room } = systems;
    engineRef.current.roomGroup.clear();

    const cur = room.currentRoom;
    engineRef.current.roomGroup.add(createRoomMeshes(cur, 0, 0));
    
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
    const threeCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 50);
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000);
    containerRef.current.appendChild(renderer.domElement);

    const redMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(MatrixRedShader.uniforms),
      vertexShader: MatrixRedShader.vertexShader,
      fragmentShader: MatrixRedShader.fragmentShader,
      side: THREE.FrontSide,
    });

    const roomGroup = new THREE.Group();
    scene.add(roomGroup);

    const monsterVisuals = new ThreadlingVisuals();
    scene.add(monsterVisuals.group);

    const clownVisuals = new ClownVisuals();
    scene.add(clownVisuals.group);

    const input = new InputManager();
    input.mouse.setElement(containerRef.current);
    const cameraCtrl = new CameraController(threeCamera);
    const playerCtrl = new PlayerController(input, cameraCtrl);

    const gameLoop = new GameLoop(input, playerCtrl, cameraCtrl, (dt) => {
      if (systems.death.isDead) { setGameState('DEAD'); return; }
      if (systems.win.hasWon) { setGameState('WON'); return; }

      // Boundary Streaming Transitions
      if (playerCtrl.position.z < -10) handleTransition('north');
      else if (playerCtrl.position.z > 10) handleTransition('south');
      else if (playerCtrl.position.x > 10) handleTransition('east');
      else if (playerCtrl.position.x < -10) handleTransition('west');

      // Update Camera & Bob
      const isSprinting = playerCtrl.movementState === 'SPRINT';
      threeCamera.fov = THREE.MathUtils.lerp(threeCamera.fov, isSprinting ? 82 : 75, 0.1);
      threeCamera.updateProjectionMatrix();

      const moveSpeed = new THREE.Vector2(playerCtrl.velocity.x, playerCtrl.velocity.z).length();
      const bob = Math.sin(Date.now() * 0.001 * (isSprinting ? 12 : 8)) * (isSprinting ? 0.08 : 0.05) * (moveSpeed / 5);
      
      // Systems Update
      systems.monster.update(dt, playerCtrl.position, systems.heart.bpm);
      monsterVisuals.update(systems.monster.position, MonsterState[systems.monster.state]);

      // Clown Update (Noise Trap)
      const isTrap = systems.room.currentRoom.type === RoomType.TRAP;
      clownVisuals.update(isTrap);
      if (isTrap) {
        clownVisuals.group.position.set(0, 1.8, 0); // Position in center of room
      }

      const dist = systems.monster.position.distanceTo(playerCtrl.position);
      const isVisible = systems.monster.state !== MonsterState.HIDDEN;
      systems.heart.update(dt, isVisible ? Math.max(0, 1 - (dist / 15)) : 0, isVisible);
      
      if (systems.heart.isHeartFailure) systems.death.trigger("HEART FAILURE");
      if (systems.monster.state === MonsterState.ATTACKING) {
        systems.death.trigger("YOU WERE CONSUMED");
      }

      threeCamera.position.copy(playerCtrl.position);
      threeCamera.position.y += bob;
      renderer.render(scene, threeCamera);

      setUiData({
        progress: systems.progression.progressString,
        bpm: Math.round(systems.heart.bpm),
        deathReason: systems.death.deathReason,
        roomType: RoomType[systems.room.currentRoom.type],
        roomId: systems.room.currentRoom.id,
        monsterDist: parseFloat(dist.toFixed(2)),
        monsterState: MonsterState[systems.monster.state],
        attacked: systems.monster.state === MonsterState.ATTACKING
      });
    });

    const handleTransition = (dir: 'north' | 'south' | 'east' | 'west') => {
      const prevRoom = systems.room.currentRoom;
      const outcome = prevRoom.outcomes[dir];
      
      if (outcome === OpeningOutcome.CORRECT) {
        systems.progression.increment();
      } else if (outcome === OpeningOutcome.MONSTER) {
        systems.monster.spawn(new THREE.Vector3(0, 4.5, -5));
      } else if (outcome === OpeningOutcome.NOISE_TRAP) {
        // Noise trap room entered - clown will be active
      } else {
        // Hide monster if we leave an encounter area
        systems.monster.hide();
      }

      systems.room.move(dir);
      
      if (dir === 'north') playerCtrl.position.z += 15;
      if (dir === 'south') playerCtrl.position.z -= 15;
      if (dir === 'east') playerCtrl.position.x -= 15;
      if (dir === 'west') playerCtrl.position.x += 15;

      if (systems.progression.isComplete()) {
        systems.win.trigger();
        setGameState('WON');
      }

      refreshRoomVisuals();
    };

    engineRef.current = { 
      input, camera: cameraCtrl, player: playerCtrl, loop: gameLoop, scene, renderer, roomGroup, monsterVisuals, clownVisuals, redMat, threeCamera
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
          
          <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
             <div className="px-4 py-1 bg-black/80 text-red-500 font-mono text-xs border border-red-900/50">
               MONSTER: {uiData.monsterState} | DIST: {uiData.monsterDist}m
             </div>
             {uiData.attacked && (
               <div className="px-4 py-1 bg-red-600 text-white font-mono text-xs uppercase animate-pulse">
                 ATTACK TRIGGERED
               </div>
             )}
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
            <p className="text-white/40 font-headline tracking-widest animate-pulse uppercase">RETRY</p>
          </div>
        </div>
      )}
      {gameState === 'WON' && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-50">
          <div className="text-center">
            <h1 className="text-6xl font-black text-black mb-8 tracking-tighter">SURVIVAL CONFIRMED</h1>
            <p className="text-black/40 font-headline tracking-widest animate-pulse uppercase">Exit Matrix</p>
          </div>
        </div>
      )}
      <div className="horror-noise opacity-20 pointer-events-none" />
    </div>
  );
}
