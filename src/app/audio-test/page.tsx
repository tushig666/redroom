"use client";

import { useEffect, useState } from 'react';

/**
 * AudioTestPage - A diagnostic utility to verify if audio assets are 
 * correctly placed in the /public/audio/ directory and accessible.
 */
export default function AudioTestPage() {
  const [results, setResults] = useState<{
    background: string;
    clown: string;
    threadling: string;
  }>({
    background: 'PENDING...',
    clown: 'PENDING...',
    threadling: 'PENDING...',
  });

  useEffect(() => {
    const checkFile = async (key: string, url: string) => {
      try {
        // Use HEAD request to check existence without downloading the whole file
        const response = await fetch(url, { method: 'HEAD' });
        setResults(prev => ({
          ...prev,
          [key]: response.ok ? 'OK' : 'FAILED'
        }));
      } catch (error) {
        setResults(prev => ({
          ...prev,
          [key]: 'FAILED'
        }));
      }
    };

    checkFile('background', '/audio/background.mp3');
    checkFile('clown', '/audio/clown.mp3');
    checkFile('threadling', '/audio/threadling.mp3');
  }, []);

  return (
    <div className="p-10 bg-[#1d1717] text-[#f5f5f5] font-mono min-h-screen flex flex-col items-center justify-center">
      <div className="border-2 border-red-900 p-8 max-w-md w-full bg-black/40 shadow-2xl">
        <h1 className="text-red-600 text-2xl font-black mb-8 text-center tracking-tighter italic">
          AUDIO ASSET AUDIT
        </h1>
        
        <div className="space-y-6 text-lg">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <span className="text-white/60">BACKGROUND:</span>
            <span className={results.background === 'OK' ? 'text-green-500 font-bold' : results.background === 'FAILED' ? 'text-red-500 font-bold' : 'text-yellow-500'}>
              {results.background}
            </span>
          </div>
          
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <span className="text-white/60">CLOWN:</span>
            <span className={results.clown === 'OK' ? 'text-green-500 font-bold' : results.clown === 'FAILED' ? 'text-red-500 font-bold' : 'text-yellow-500'}>
              {results.clown}
            </span>
          </div>
          
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <span className="text-white/60">THREADLING:</span>
            <span className={results.threadling === 'OK' ? 'text-green-500 font-bold' : results.threadling === 'FAILED' ? 'text-red-500 font-bold' : 'text-yellow-500'}>
              {results.threadling}
            </span>
          </div>
        </div>

        <div className="mt-10 text-[10px] text-white/20 text-center leading-relaxed">
          THIS PAGE USES BROWSER FETCH() TO VERIFY ASSETS IN<br/>
          /public/audio/*.mp3<br/>
          IF STATUS IS 'FAILED', ENSURE FILES ARE PROPERLY UPLOADED.
        </div>
      </div>
      
      <a 
        href="/" 
        className="mt-8 text-white/40 hover:text-red-600 transition-colors text-xs uppercase tracking-widest"
      >
        Return to Matrix
      </a>
    </div>
  );
}
