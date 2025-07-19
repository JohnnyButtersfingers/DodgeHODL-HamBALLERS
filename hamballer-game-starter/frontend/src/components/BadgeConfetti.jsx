import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export const BadgeConfetti = ({ badge }) => {
  const containerRef = useRef(null);
  
  // Generate confetti particles
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100 - 50,
    y: Math.random() * -100,
    rotation: Math.random() * 360,
    scale: Math.random() * 0.5 + 0.5,
    color: i % 3 === 0 ? badge.gradient.split(' ')[1] : 
           i % 3 === 1 ? '#FFD700' : '#00FF00'
  }));

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
      aria-hidden="true"
    >
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute left-1/2 top-1/2"
          initial={{
            x: 0,
            y: 0,
            scale: 0,
            rotate: 0,
            opacity: 1
          }}
          animate={{
            x: particle.x * 4,
            y: particle.y * 4 + 200,
            scale: particle.scale,
            rotate: particle.rotation,
            opacity: 0
          }}
          transition={{
            duration: 2 + Math.random(),
            ease: "easeOut",
            delay: Math.random() * 0.5
          }}
          style={{
            width: '10px',
            height: '10px',
            backgroundColor: particle.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '0%',
            transform: 'translate(-50%, -50%)'
          }}
        />
      ))}
      
      {/* Central burst effect */}
      <motion.div
        className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        <div className={`w-32 h-32 bg-gradient-to-r ${badge.gradient} rounded-full blur-xl`} />
      </motion.div>
      
      {/* Emoji celebration */}
      <motion.div
        className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-8xl"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: [0, 1.5, 1], rotate: 0 }}
        transition={{ 
          duration: 0.8,
          type: "spring",
          stiffness: 200,
          damping: 10
        }}
      >
        {badge.emoji}
      </motion.div>
    </div>
  );
};