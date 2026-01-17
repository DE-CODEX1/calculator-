import React, { useState, useEffect } from 'react';
import Button from './Button';
import { CalculatorAction } from '../types';
import { SECRET_CODE } from '../constants';
import { ArrowLeft, Sparkles, Info, User } from 'lucide-react';
import { explainMathWithGemini } from '../services/geminiService';

interface CalculatorProps {
  onUnlockVault: () => void;
}

const Calculator: React.FC<CalculatorProps> = ({ onUnlockVault }) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState(''); // Stores the logic string
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showInfo) return; // Disable keyboard when modal is open
      
      const key = e.key;
      if (/[0-9]/.test(key)) handleNumber(key);
      if (key === '.') handleDecimal();
      if (key === '=' || key === 'Enter') handleEqual();
      if (key === 'Backspace') handleClear();
      if (['+', '-', '*', '/'].includes(key)) handleOperator(key);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [display, equation, showInfo]);

  const handleNumber = (num: string) => {
    setAiExplanation(null);
    if (waitingForOperand) {
      setDisplay(num);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const handleDecimal = () => {
    setAiExplanation(null);
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
    setWaitingForOperand(false);
    setAiExplanation(null);
  };

  const handleOperator = (op: string) => {
    setAiExplanation(null);
    const value = parseFloat(display);
    setEquation(String(value) + ' ' + op + ' ');
    setWaitingForOperand(true);
  };

  const handleEqual = () => {
    // Secret Code Check
    if (display === SECRET_CODE) {
      onUnlockVault();
      setDisplay('0');
      setEquation('');
      return;
    }

    // Normal Math
    try {
      // Basic math parser
      const fullExpression = equation + display;
      
      // Safety check: only allow numbers and operators
      if (!/^[0-9+\-*/.\s]+$/.test(fullExpression)) {
        setDisplay('Error');
        return;
      }

      // eslint-disable-next-line no-new-func
      const result = new Function('return ' + fullExpression)();
      
      // Format result to avoid long decimals
      const resultStr = String(Math.round(result * 100000000) / 100000000);
      
      setDisplay(resultStr);
      setEquation(''); // Reset equation after result
      setWaitingForOperand(true); // Ready for next operation starting with this result
    } catch (e) {
      setDisplay('Error');
    }
  };

  const handlePercent = () => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  };

  const handleAiExplain = async () => {
    if (display === '0' || display === 'Error') return;
    setIsLoadingAi(true);
    // Explain the number currently on screen, or the last operation if we had context
    const expression = equation ? equation + display : `The number ${display}`;
    const explanation = await explainMathWithGemini(expression, display);
    setAiExplanation(explanation);
    setIsLoadingAi(false);
  };

  return (
    <div className="flex flex-col h-full max-w-md mx-auto bg-black p-5 pb-8 relative">
       {/* Developer Info Button */}
       <div className="absolute top-4 left-4 z-20">
          <button 
            onClick={() => setShowInfo(true)} 
            className="text-gray-600 hover:text-indigo-400 transition-colors p-2 active:scale-95"
            title="About Developer"
          >
            <Info className="w-6 h-6" />
          </button>
       </div>

       {/* Developer Info Modal */}
       {showInfo && (
         <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-indigo-600/10 p-4 rounded-full mb-6 border border-indigo-500/20">
              <User className="w-12 h-12 text-indigo-400" />
            </div>
            
            <h2 className="text-white text-xl font-medium mb-1 tracking-wide">Developed By</h2>
            <div className="w-16 h-1 bg-indigo-600 rounded-full mb-6 mt-2"></div>
            
            <h1 className="text-3xl text-indigo-400 font-bold mb-2 tracking-tight">Suvojeet Naskar</h1>
            <p className="text-gray-500 text-sm mb-10">Full Stack Developer</p>
            
            <button 
                onClick={() => setShowInfo(false)}
                className="px-8 py-3 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors border border-gray-700 font-medium text-sm tracking-wide"
            >
                Close
            </button>
         </div>
       )}

       {/* AI Explanation Overlay */}
       {aiExplanation && !showInfo && (
        <div className="absolute top-14 left-4 right-4 bg-indigo-900/90 text-indigo-100 p-4 rounded-2xl z-20 shadow-lg backdrop-blur-md border border-indigo-500/30">
          <div className="flex justify-between items-start mb-2">
             <div className="flex items-center gap-2 text-sm font-bold text-indigo-300">
               <Sparkles className="w-4 h-4" /> AI Math Tutor
             </div>
             <button onClick={() => setAiExplanation(null)} className="text-gray-400 hover:text-white">✕</button>
          </div>
          <p className="text-sm leading-relaxed">{aiExplanation}</p>
        </div>
      )}

      {/* Screen */}
      <div className="flex-1 flex flex-col justify-end items-end mb-6 px-2">
        <div className="text-gray-400 text-xl h-6 mb-1">{equation}</div>
        <div className={`text-white font-light break-all leading-none transition-all ${display.length > 7 ? 'text-6xl' : 'text-8xl'}`}>
          {display}
        </div>
      </div>

      {/* Keypad Grid */}
      <div className="grid grid-cols-4 gap-4">
        <Button label="AC" variant="secondary" onClick={handleClear} />
        <Button label="+/-" variant="secondary" onClick={() => setDisplay(String(parseFloat(display) * -1))} />
        <Button label="%" variant="secondary" onClick={handlePercent} />
        <Button label="÷" variant="accent" onClick={() => handleOperator('/')} />

        <Button label="7" onClick={() => handleNumber('7')} />
        <Button label="8" onClick={() => handleNumber('8')} />
        <Button label="9" onClick={() => handleNumber('9')} />
        <Button label="×" variant="accent" onClick={() => handleOperator('*')} />

        <Button label="4" onClick={() => handleNumber('4')} />
        <Button label="5" onClick={() => handleNumber('5')} />
        <Button label="6" onClick={() => handleNumber('6')} />
        <Button label="-" variant="accent" onClick={() => handleOperator('-')} />

        <Button label="1" onClick={() => handleNumber('1')} />
        <Button label="2" onClick={() => handleNumber('2')} />
        <Button label="3" onClick={() => handleNumber('3')} />
        <Button label="+" variant="accent" onClick={() => handleOperator('+')} />

        <Button label="0" large onClick={() => handleNumber('0')} />
        <Button label="." onClick={handleDecimal} />
        <Button label="=" variant="accent" onClick={handleEqual} />
      </div>

      {/* Hidden AI Feature Button */}
      <div className="mt-6 flex justify-center">
         <button 
           onClick={handleAiExplain}
           disabled={isLoadingAi}
           className="flex items-center gap-2 text-gray-600 hover:text-indigo-400 text-sm transition-colors py-2 px-4 rounded-full active:bg-gray-900"
         >
           {isLoadingAi ? (
             <span className="animate-pulse">Thinking...</span>
           ) : (
             <>
               <Sparkles className="w-4 h-4" /> Explain Math
             </>
           )}
         </button>
      </div>
      
      <div className="absolute bottom-1 left-0 w-full text-center text-[10px] text-gray-800 pointer-events-none">
        Secure Calculator v1.0 • Suvojeet Naskar
      </div>
    </div>
  );
};

export default Calculator;