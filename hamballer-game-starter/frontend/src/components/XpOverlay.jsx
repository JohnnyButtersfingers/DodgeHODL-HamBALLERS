import React, { useEffect, useRef, useState } from 'react';
import { useXp } from '../contexts/XpContext';

const XpOverlay = () => {
  const { xp } = useXp();
  const [highlight, setHighlight] = useState(false);
  const prevXp = useRef(xp);

  useEffect(() => {
    if (prevXp.current !== xp) {
      setHighlight(true);
      prevXp.current = xp;
      const t = setTimeout(() => setHighlight(false), 500); // TODO animation timing
      return () => clearTimeout(t);
    }
  }, [xp]);

  return (
    <div
      className={`text-green-400 drop-shadow-lg ${
        highlight ? 'animate-in fade-in animate-bounce' : ''
      }`}
    >
      +{xp} XP
    </div>
  );
};

export default XpOverlay;
