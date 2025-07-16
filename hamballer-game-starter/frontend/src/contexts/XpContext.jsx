import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWallet } from './WalletContext';
import { apiFetch } from '../services/useApiService';

const XpContext = createContext();

export const XpProvider = ({ children }) => {
  const { address } = useWallet();
  const [xp, setXp] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [xpToNextLevel, setXpToNextLevel] = useState(100);
  const [achievementsUnlocked, setAchievementsUnlocked] = useState(0);
  const [recentXpGains, setRecentXpGains] = useState([]);

  useEffect(() => {
    if (address) {
      fetchPlayerXpData();
    }
  }, [address]);

  const fetchPlayerXpData = async () => {
    try {
      const response = await apiFetch(`/api/player/xp/${address}`);
      if (response.ok) {
        const data = await response.json();
        setXp(data.currentXp || 0);
        setTotalXp(data.totalXp || 0);
        setLevel(data.level || 1);
        setXpToNextLevel(data.xpToNextLevel || 100);
        setAchievementsUnlocked(data.achievementsUnlocked || 0);
      }
    } catch (error) {
      console.error('Error fetching XP data:', error);
      // Set mock data for development
      setXp(1250);
      setTotalXp(2500);
      setLevel(5);
      setXpToNextLevel(350);
      setAchievementsUnlocked(3);
    }
  };

  const addXp = (amount, source = 'unknown') => {
    const newXp = xp + amount;
    setXp(newXp);
    setTotalXp(prev => prev + amount);
    
    // Add to recent gains for animations
    const gain = {
      id: Date.now(),
      amount,
      source,
      timestamp: new Date()
    };
    setRecentXpGains(prev => [...prev.slice(-4), gain]); // Keep last 5
    
    // Check for level up
    checkLevelUp(newXp);
    
    // Remove from recent gains after 5 seconds
    setTimeout(() => {
      setRecentXpGains(prev => prev.filter(g => g.id !== gain.id));
    }, 5000);
  };

  const checkLevelUp = (currentXp) => {
    const xpPerLevel = 500; // Base XP per level
    const newLevel = Math.floor(currentXp / xpPerLevel) + 1;
    
    if (newLevel > level) {
      setLevel(newLevel);
      const nextLevelXp = newLevel * xpPerLevel;
      setXpToNextLevel(nextLevelXp - currentXp);
      
      // Trigger level up celebration
      triggerLevelUpEvent(newLevel);
    } else {
      const nextLevelXp = level * xpPerLevel;
      setXpToNextLevel(Math.max(0, nextLevelXp - currentXp));
    }
  };

  const triggerLevelUpEvent = (newLevel) => {
    // Dispatch custom event for level up animations
    window.dispatchEvent(new CustomEvent('playerLevelUp', {
      detail: { newLevel, previousLevel: level }
    }));
  };

  const getXpProgress = () => {
    const xpPerLevel = 500;
    const currentLevelXp = (level - 1) * xpPerLevel;
    const nextLevelXp = level * xpPerLevel;
    const progressXp = xp - currentLevelXp;
    const levelXpRange = nextLevelXp - currentLevelXp;
    
    return {
      current: progressXp,
      required: levelXpRange,
      percentage: (progressXp / levelXpRange) * 100
    };
  };

  const value = {
    xp,
    totalXp,
    level,
    xpToNextLevel,
    achievementsUnlocked,
    recentXpGains,
    setXp,
    addXp,
    getXpProgress,
    refreshXpData: fetchPlayerXpData
  };

  return (
    <XpContext.Provider value={value}>
      {children}
    </XpContext.Provider>
  );
};

export const useXp = () => {
  const context = useContext(XpContext);
  if (!context) {
    throw new Error('useXp must be used within an XpProvider');
  }
  return context;
};
