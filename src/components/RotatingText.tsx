
import React, { useState, useEffect } from 'react';

interface RotatingTextProps {
  texts: string[];
  typingSpeed?: number;
  pauseDuration?: number;
  className?: string;
}

const RotatingText: React.FC<RotatingTextProps> = ({
  texts,
  typingSpeed = 30,  
  pauseDuration = 1500,
  className = ""
}) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const currentText = texts[currentTextIndex];

    if (isTyping) {
      if (displayText.length < currentText.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentText.slice(0, displayText.length + 1));
        }, typingSpeed);
      } else {
        timeout = setTimeout(() => {
          setIsTyping(false);
        }, pauseDuration);
      }
    } else {
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, typingSpeed / 3);
      } else {
        setCurrentTextIndex((prev) => (prev + 1) % texts.length);
        setIsTyping(true);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isTyping, currentTextIndex, texts, typingSpeed, pauseDuration]);

  return (
    <span className={className}>
      {displayText}
      <span className="ml-1 animate-pulse text-blue-600 font-bold">|</span>
    </span>
  );
};

export default RotatingText;
