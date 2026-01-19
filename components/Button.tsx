import React from 'react';
import { Theme } from '../types';

interface ButtonProps {
  label: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'feature';
  className?: string;
  theme: Theme;
}

const Button: React.FC<ButtonProps> = ({ 
  label, 
  onClick, 
  variant = 'primary', 
  className = '',
  theme
}) => {
  
  const isNeon = theme === 'neon';
  
  // Neon specific shape
  const cyberpunkShape = isNeon 
    ? { clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)' } 
    : {};

  // Shape: More rounded to match video (almost circle/squircle)
  const shape = isNeon ? 'rounded-none relative overflow-hidden btn-scanline' : 'rounded-[1.3rem]';
  
  // Base styles
  const baseLayout = `active:scale-95 transition-all duration-100 flex items-center justify-center text-lg sm:text-xl font-normal select-none outline-none ${shape} w-full aspect-[5/4] sm:aspect-square`;
  
  const getThemeStyles = () => {
    switch (theme) {
      case 'multicolor':
        return {
          primary: "bg-blue-600 text-white shadow-lg",
          secondary: "bg-purple-600 text-white shadow-lg",
          accent: "bg-orange-500 text-white shadow-lg font-bold",
          feature: "bg-teal-600 text-white shadow-lg"
        };
      case 'neon':
        return {
          primary: "bg-black text-green-500 border border-green-900/50 hover:bg-green-900/20 font-mono",
          secondary: "bg-gray-900 text-green-300 border border-green-800/50 hover:bg-gray-800 font-mono",
          accent: "bg-green-900/80 text-white border border-green-400 font-bold",
          feature: "bg-green-950 text-green-400 border border-green-900 font-mono"
        };
      case 'glass':
        return {
          primary: "bg-white/10 text-white backdrop-blur-md border border-white/10",
          secondary: "bg-white/20 text-white backdrop-blur-md border border-white/20",
          accent: "bg-pink-500/80 text-white backdrop-blur-md",
          feature: "bg-indigo-500/80 text-white backdrop-blur-md"
        };
      case 'classic':
      default:
        // Matching the video exactly:
        // Backgrounds: Very Dark #151515
        // Numbers: White Text
        // Operators (AC, %, /, *, -, +): Orange Text (#ff9f0a), Dark BG
        // Accent (=): Orange BG, White Text
        // Scientific: Grey Text, Dark BG
        return {
          primary: "bg-[#151515] text-white hover:bg-[#222222]", // Numbers
          secondary: "bg-[#151515] text-[#ff9f0a] hover:bg-[#222222] text-xl", // Operators with Orange Text
          accent: "bg-[#ff9f0a] text-white hover:bg-[#ffb340] text-3xl pb-1", // Equals
          feature: "bg-[#151515] text-[#6b7280] hover:text-white hover:bg-[#222222] text-sm sm:text-base" // Sci keys
        };
    }
  };

  const themeStyles = getThemeStyles();

  return (
    <button 
      onClick={onClick}
      style={cyberpunkShape}
      className={`${baseLayout} ${themeStyles[variant]} ${className}`}
    >
      {label}
    </button>
  );
};

export default Button;