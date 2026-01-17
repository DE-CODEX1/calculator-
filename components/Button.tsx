import React from 'react';

interface ButtonProps {
  label: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'feature';
  className?: string;
  large?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  label, 
  onClick, 
  variant = 'primary', 
  className = '',
  large = false
}) => {
  
  const baseStyles = "active:scale-95 transition-transform duration-100 flex items-center justify-center text-3xl font-medium rounded-full select-none";
  
  const variants = {
    primary: "bg-[#333333] text-white hover:bg-[#444444]", // Numbers
    secondary: "bg-[#a5a5a5] text-black hover:bg-[#d4d4d4]", // Top row (AC, +/-)
    accent: "bg-[#ff9f0a] text-white hover:bg-[#ffb544]", // Operators
    feature: "bg-indigo-600 text-white hover:bg-indigo-500 text-xl" // AI button
  };

  const size = large ? "col-span-2 w-full aspect-[2/1] rounded-[45px] pl-8 justify-start" : "w-full aspect-square";

  return (
    <button 
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${size} ${className}`}
    >
      {label}
    </button>
  );
};

export default Button;
