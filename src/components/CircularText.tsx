
import React from 'react';

interface CircularTextProps {
  text: string;
  spinDuration?: number;
  className?: string;
}

const CircularText: React.FC<CircularTextProps> = ({
  text,
  spinDuration = 25,
  className = ""
}) => {
  const characters = text.split('');
  const angleStep = 360 / characters.length;

  return (
    <div className={`relative w-24 h-24 ${className}`}>
      <div 
        className="absolute inset-0 animate-spin"
        style={{
          animationDuration: `${spinDuration}s`,
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite'
        }}
      >
        {characters.map((char, index) => (
          <span
            key={index}
            className="absolute text-xs font-light opacity-50"
            style={{
              transform: `rotate(${index * angleStep}deg) translateY(-40px)`,
              transformOrigin: '50% 50px',
              left: '50%',
              top: '50%',
              marginLeft: '-0.25rem'
            }}
          >
            {char}
          </span>
        ))}
      </div>
    </div>
  );
};

export default CircularText;
