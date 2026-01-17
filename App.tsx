import React, { useState } from 'react';
import Calculator from './components/Calculator';
import Vault from './components/Vault';
import { AppMode } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('CALCULATOR');

  const handleUnlock = () => {
    // Add a small delay for dramatic effect
    setTimeout(() => {
      setMode('VAULT');
    }, 200);
  };

  const handleLock = () => {
    setMode('CALCULATOR');
  };

  return (
    <div className="w-full h-screen bg-black flex items-center justify-center overflow-hidden">
      {/* Mobile container simulation */}
      <div className="w-full h-full sm:w-[400px] sm:h-[850px] bg-black sm:rounded-[3rem] sm:border-[8px] sm:border-[#222] overflow-hidden relative shadow-2xl">
        
        {/* Dynamic Island / Notch simulation for realism */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-xl z-50 hidden sm:block"></div>
        
        <div className="w-full h-full relative">
          {/* Calculator View */}
          <div 
            className={`absolute inset-0 transition-transform duration-500 ease-in-out ${
              mode === 'CALCULATOR' ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
            }`}
          >
            <Calculator onUnlockVault={handleUnlock} />
          </div>

          {/* Vault View */}
          <div 
            className={`absolute inset-0 transition-transform duration-500 ease-in-out ${
              mode === 'VAULT' ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
            }`}
          >
             {/* Only render vault contents if mode is VAULT to prevent peeking via devtools/state easily */}
             {mode === 'VAULT' && <Vault onLock={handleLock} />}
          </div>
        </div>
      </div>
      
      {/* Desktop Hint */}
      <div className="hidden sm:block absolute left-10 top-1/2 -translate-y-1/2 text-gray-500 max-w-xs">
        <h3 className="text-white font-bold mb-2">Secret Code:</h3>
        <p className="mb-4">Type <code className="bg-gray-800 px-2 py-1 rounded text-orange-500">1234</code> then press <code className="bg-gray-800 px-2 py-1 rounded text-orange-500">=</code></p>
        <p className="text-sm">This is a fully functional calculator built with React and Tailwind.</p>
        <p className="text-sm mt-4 text-indigo-400">Features:</p>
        <ul className="list-disc ml-4 text-xs mt-1 space-y-1">
            <li>Standard Math Operations</li>
            <li>Hidden Photo Vault (Client-side)</li>
            <li>Gemini AI "Math Explainer"</li>
        </ul>
      </div>
    </div>
  );
};

export default App;
