import React from 'react';

interface HexagonProps {
  children?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  onClick?: () => void;
}

const Hexagon: React.FC<HexagonProps> = ({ 
  children, 
  className = '', 
  size = 'md', 
  color = 'bg-gray-200',
  onClick
}) => {
  const sizeClasses = {
    sm: 'w-12 h-14',
    md: 'w-24 h-28',
    lg: 'w-32 h-36',
    xl: 'w-48 h-56'
  };

  return (
    <div 
      onClick={onClick}
      className={`relative ${sizeClasses[size]} flex items-center justify-center shrink-0 transition-transform hover:scale-105 duration-300 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
        {/* Main Hexagon Background */}
      <div className={`absolute inset-0 hex-mask ${color} shadow-lg`} />
      
      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center p-2">
        {children}
      </div>
    </div>
  );
};

export default Hexagon;