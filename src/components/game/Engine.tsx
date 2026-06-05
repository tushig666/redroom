
"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { MatrixRedShader } from './Shaders';
import { InputManager } from '@/game/input/InputManager';
import { CameraController } from '@/game/player/CameraController';
import { PlayerController } from '@/game/player/PlayerController';
import { GameLoop } from '@/game/core/GameLoop';

export default function Engine() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [debug, setDebug] = useState({ fps: 0, pos: '0, 0', rot: '0, 0', status: 'DISABLED' });
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING'>('MENU');
  
  // Logic Refs
  const engineRef = useRef<{
    input: InputManager;
    camera: CameraController;
    player: PlayerController;
    loop: GameLoop;
    threeCamera: THREE.PerspectiveCamera;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- THREE JS SETUP ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xff0000);
    containerRef.current.appendChild(renderer.domElement);

    // --- ENVIRONMENT ---
    const redMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(MatrixRedShader.uniforms),
      vertexShader: MatrixRedShader.vertexShader,
      fragmentShader: MatrixRedShader.fragmentShader,
      side: THREE.BackSide,
    });
    const box = new THREE.Mesh(new THREE.BoxGeometry(20, 6, 20), redMat);
    box.position.set(0, 3, 0);
    scene.add(box);

    // --- ENGINE INITIALIZATION ---
    const input = new InputManager();
    input.mouse.setElement(containerRef.current);
    
    const cameraCtrl = new CameraController(camera);
    const playerCtrl = new PlayerController(input, cameraCtrl);
    
    const gameLoop = new GameLoop(input, playerCtrl, cameraCtrl, (dt) => {
      // Sync Three.js Camera to Player position
      camera.position.copy(playerCtrl.position);
      renderer.render(scene, camera);

      // Debug Updates
      setDebug({
        fps: Math.round(1/dt),
        pos: `${playerCtrl.position.x.toFixed(1)}, ${playerCtrl.position.z.toFixed(1)}`,
        rot: `${cameraCtrl.getYaw().toFixed(2)}, ${cameraCtrl.getPitch().toFixed(2)}`,
        status: input.mouse.status
      });
    });

    engineRef.current = { input, camera: cameraCtrl, player: playerCtrl, loop: gameLoop, threeCamera: camera };
    gameLoop.start();

    // Resize Handler
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
  }, []);

  const handleInteraction = () => {
    if (engineRef.current) {
      engineRef.current.input.mouse.requestLock();
      if (gameState === 'MENU') setGameState('PLAYING');
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative overflow-hidden"
      onClick={handleInteraction}
    >
      {/* HUD & DEBUG */}
      <div className="absolute top-4 left-4 font-mono text-[10px] text-white/50 pointer-events-none space-y-1">
        <p>FPS: {debug.fps}</p>
        <p>POS: {debug.pos}</p>
        <p>ROT: {debug.rot}</p>
        <p className={debug.status === 'FALLBACK' ? 'text-red-500 animate-pulse' : ''}>
          STATUS: {debug.status}
        </p>
      </div>

      {debug.status === 'FALLBACK' && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-red-900/80 px-4 py-2 text-white font-mono text-xs border border-red-500 animate-pulse">
          PREVIEW ENVIRONMENT DETECTED — RUNNING IN MOUSE CAPTURE FALLBACK MODE
        </div>
      )}

      {gameState === 'MENU' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="text-center">
            <h1 className="text-6xl font-black text-red-600 italic mb-4">REDROOM</h1>
            <p className="text-white/60 font-mono tracking-widest animate-pulse">CLICK TO ENTER THE LOOP</p>
          </div>
        </div>
      ) : (
        <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 mix-blend-difference pointer-events-none" />
      )}
      
      <div className="horror-noise opacity-10 pointer-events-none" />
    </div>
  );
}
