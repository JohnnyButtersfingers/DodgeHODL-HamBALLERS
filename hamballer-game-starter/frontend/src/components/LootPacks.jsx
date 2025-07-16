import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../contexts/WalletContext';
import { useXp } from '../contexts/XpContext';
import { apiFetch } from '../services/useApiService';

const PACK_RARITIES = {
  COMMON: {
    name: 'Common',
    icon: '📦',
    color: 'bg-gray-500',
    borderColor: 'border-gray-400',
    textColor: 'text-gray-400',
    gradient: 'from-gray-400 to-gray-600'
  },
  RARE: {
    name: 'Rare',
    icon: '💎',
    color: 'bg-blue-500',
    borderColor: 'border-blue-400', 
    textColor: 'text-blue-400',
    gradient: 'from-blue-400 to-blue-600'
  },
  EPIC: {
    name: 'Epic',
    icon: '⚡',
    color: 'bg-purple-500',
    borderColor: 'border-purple-400',
    textColor: 'text-purple-400',
    gradient: 'from-purple-400 to-purple-600'
  },
  LEGENDARY: {
    name: 'Legendary',
    icon: '🌟',
    color: 'bg-yellow-500',
    borderColor: 'border-yellow-400',
    textColor: 'text-yellow-400',
    gradient: 'from-yellow-400 to-yellow-600'
  }
};

const LOOT_TYPES = {
  XP_BOOST: {
    name: 'XP Boost',
    icon: '⚡',
    description: 'Multiplies XP earned for next runs'
  },
  DBP_BONUS: {
    name: 'DBP Bonus',
    icon: '💰',
    description: 'Extra DBP tokens'
  },
  BADGE: {
    name: 'Badge',
    icon: '🏆',
    description: 'Special achievement badge'
  },
  BOOST_NFT: {
    name: 'Boost NFT',
    icon: '🚀',
    description: 'Performance enhancing NFT'
  },
  COSMETIC: {
    name: 'Cosmetic',
    icon: '🎨',
    description: 'Visual customization item'
  }
};

const PACK_DEFINITIONS = [
  {
    id: 'starter_pack',
    name: 'Starter Pack',
    rarity: 'COMMON',
    cost: 0,
    description: 'A free pack to get you started',
    guaranteedItems: 1,
    possibleItems: [
      { type: 'XP_BOOST', value: 1.5, duration: 1, rarity: 'COMMON' },
      { type: 'DBP_BONUS', value: 100, rarity: 'COMMON' }
    ]
  },
  {
    id: 'bronze_pack',
    name: 'Bronze Pack',
    rarity: 'COMMON',
    cost: 500,
    description: 'Basic rewards for dedicated players',
    guaranteedItems: 2,
    possibleItems: [
      { type: 'XP_BOOST', value: 2.0, duration: 3, rarity: 'COMMON' },
      { type: 'DBP_BONUS', value: 250, rarity: 'COMMON' },
      { type: 'BOOST_NFT', value: 'speed_boost_1', rarity: 'RARE' }
    ]
  },
  {
    id: 'silver_pack',
    name: 'Silver Pack',
    rarity: 'RARE',
    cost: 1500,
    description: 'Premium rewards with rare items',
    guaranteedItems: 3,
    possibleItems: [
      { type: 'XP_BOOST', value: 2.5, duration: 5, rarity: 'RARE' },
      { type: 'DBP_BONUS', value: 500, rarity: 'RARE' },
      { type: 'BADGE', value: 'silver_collector', rarity: 'RARE' },
      { type: 'BOOST_NFT', value: 'jump_boost_2', rarity: 'EPIC' }
    ]
  },
  {
    id: 'gold_pack',
    name: 'Gold Pack',
    rarity: 'EPIC',
    cost: 3000,
    description: 'Epic rewards for serious competitors',
    guaranteedItems: 4,
    possibleItems: [
      { type: 'XP_BOOST', value: 3.0, duration: 10, rarity: 'EPIC' },
      { type: 'DBP_BONUS', value: 1000, rarity: 'EPIC' },
      { type: 'BADGE', value: 'gold_legend', rarity: 'EPIC' },
      { type: 'BOOST_NFT', value: 'ultimate_boost', rarity: 'LEGENDARY' },
      { type: 'COSMETIC', value: 'golden_trail', rarity: 'EPIC' }
    ]
  },
  {
    id: 'diamond_pack',
    name: 'Diamond Pack',
    rarity: 'LEGENDARY',
    cost: 7500,
    description: 'The ultimate pack with legendary rewards',
    guaranteedItems: 5,
    possibleItems: [
      { type: 'XP_BOOST', value: 5.0, duration: 20, rarity: 'LEGENDARY' },
      { type: 'DBP_BONUS', value: 2500, rarity: 'LEGENDARY' },
      { type: 'BADGE', value: 'diamond_champion', rarity: 'LEGENDARY' },
      { type: 'BOOST_NFT', value: 'legendary_boost', rarity: 'LEGENDARY' },
      { type: 'COSMETIC', value: 'diamond_aura', rarity: 'LEGENDARY' }
    ]
  }
];

const LootPacks = () => {
  const { address } = useWallet();
  const { xp, addXp } = useXp();
  const [playerPacks, setPlayerPacks] = useState([]);
  const [playerCurrency, setPlayerCurrency] = useState({ xp: 0, dbp: 0 });
  const [loading, setLoading] = useState(false);
  const [openingPack, setOpeningPack] = useState(null);
  const [packRewards, setPackRewards] = useState([]);
  const [showRewards, setShowRewards] = useState(false);

  useEffect(() => {
    if (address) {
      fetchPlayerPacks();
      fetchPlayerCurrency();
    }
  }, [address]);

  const fetchPlayerPacks = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`/api/lootpacks/${address}`);
      if (response.ok) {
        const data = await response.json();
        setPlayerPacks(data.packs || []);
      }
    } catch (error) {
      console.error('Error fetching player packs:', error);
      // Mock data for development
      setPlayerPacks([
        { id: 'starter_pack', quantity: 2, earnedAt: new Date().toISOString() },
        { id: 'bronze_pack', quantity: 1, earnedAt: new Date(Date.now() - 86400000).toISOString() },
        { id: 'silver_pack', quantity: 0 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerCurrency = async () => {
    try {
      const response = await apiFetch(`/api/player/currency/${address}`);
      if (response.ok) {
        const data = await response.json();
        setPlayerCurrency(data.currency || { xp: 0, dbp: 0 });
      }
    } catch (error) {
      console.error('Error fetching player currency:', error);
      // Mock data for development
      setPlayerCurrency({ xp: 2500, dbp: 1250 });
    }
  };

  const purchasePack = async (packId) => {
    const pack = PACK_DEFINITIONS.find(p => p.id === packId);
    if (!pack || playerCurrency.xp < pack.cost) return;

    try {
      const response = await apiFetch('/api/lootpacks/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: address,
          packId,
          cost: pack.cost
        })
      });

      if (response.ok) {
        fetchPlayerPacks();
        fetchPlayerCurrency();
      }
    } catch (error) {
      console.error('Error purchasing pack:', error);
    }
  };

  const openPack = async (packId) => {
    const pack = PACK_DEFINITIONS.find(p => p.id === packId);
    if (!pack) return;

    setOpeningPack(pack);

    // Simulate pack opening animation delay
    setTimeout(async () => {
      try {
        const response = await apiFetch('/api/lootpacks/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerAddress: address,
            packId
          })
        });

        let rewards = [];
        if (response.ok) {
          const data = await response.json();
          rewards = data.rewards || [];
        } else {
          // Mock rewards for development
          rewards = generateMockRewards(pack);
        }

        setPackRewards(rewards);
        setShowRewards(true);
        
        // Trigger XP notifications for XP rewards
        rewards.forEach(reward => {
          if (reward.type === 'XP_BOOST' && reward.value > 1) {
            // Convert XP boost to notification - could be base XP for getting the boost
            addXp(50, 'lootpack'); // Base XP for getting an XP boost
          } else if (reward.type === 'DBP_BONUS') {
            // Small XP reward for DBP bonus
            addXp(25, 'lootpack');
          }
        });
        
        fetchPlayerPacks();
        fetchPlayerCurrency();
              } catch (error) {
          console.error('Error opening pack:', error);
          // Show mock rewards on error
          const mockRewards = generateMockRewards(pack);
          setPackRewards(mockRewards);
          setShowRewards(true);
          
          // Trigger XP notifications for mock rewards too
          mockRewards.forEach(reward => {
            if (reward.type === 'XP_BOOST' && reward.value > 1) {
              addXp(50, 'lootpack');
            } else if (reward.type === 'DBP_BONUS') {
              addXp(25, 'lootpack');
            }
          });
        }

      setOpeningPack(null);
    }, 3000);
  };

  const generateMockRewards = (pack) => {
    const rewards = [];
    const { possibleItems, guaranteedItems } = pack;

    for (let i = 0; i < guaranteedItems; i++) {
      const randomItem = possibleItems[Math.floor(Math.random() * possibleItems.length)];
      rewards.push({
        ...randomItem,
        id: `reward_${i}`,
        packId: pack.id
      });
    }

    return rewards;
  };

  const getPackQuantity = (packId) => {
    const playerPack = playerPacks.find(p => p.id === packId);
    return playerPack?.quantity || 0;
  };

  const canAffordPack = (cost) => {
    return playerCurrency.xp >= cost;
  };

  const getRarityConfig = (rarity) => {
    return PACK_RARITIES[rarity] || PACK_RARITIES.COMMON;
  };

  const formatItemValue = (item) => {
    switch (item.type) {
      case 'XP_BOOST':
        return `${item.value}x for ${item.duration} runs`;
      case 'DBP_BONUS':
        return `+${item.value} DBP`;
      case 'BADGE':
        return item.value.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      case 'BOOST_NFT':
        return item.value.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      case 'COSMETIC':
        return item.value.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      default:
        return item.value;
    }
  };

  if (!address) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">📦</div>
        <h2 className="text-xl font-semibold text-white mb-2">Connect Wallet</h2>
        <p className="text-gray-400">Connect your wallet to view and open loot packs</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pack Opening Animation */}
      <AnimatePresence>
        {openingPack && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div className="text-center">
              <motion.div
                animate={{
                  rotateY: [0, 180, 360],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 3,
                  ease: "easeInOut",
                  times: [0, 0.5, 1]
                }}
                className={`text-8xl mb-6 inline-block bg-gradient-to-br ${getRarityConfig(openingPack.rarity).gradient} bg-clip-text text-transparent`}
              >
                {getRarityConfig(openingPack.rarity).icon}
              </motion.div>
              
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-3xl font-bold text-white mb-2"
              >
                Opening {openingPack.name}...
              </motion.h2>
              
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1.5, duration: 1.5 }}
                className="w-64 h-2 bg-gray-700 rounded-full mx-auto overflow-hidden"
              >
                <div className={`h-full bg-gradient-to-r ${getRarityConfig(openingPack.rarity).gradient} rounded-full`} />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rewards Modal */}
      <AnimatePresence>
        {showRewards && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4"
            onClick={() => setShowRewards(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gray-800 rounded-lg p-6 max-w-2xl mx-auto max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">🎉 Pack Opened!</h2>
                <p className="text-gray-400">Here are your rewards:</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {packRewards.map((reward, index) => {
                  const rarityConfig = getRarityConfig(reward.rarity);
                  const lootType = LOOT_TYPES[reward.type];
                  
                  return (
                    <motion.div
                      key={reward.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.2 }}
                      className={`p-4 rounded-lg border-2 ${rarityConfig.borderColor} bg-gradient-to-br ${rarityConfig.gradient} bg-opacity-10`}
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-2">{lootType.icon}</div>
                        <h3 className={`font-bold ${rarityConfig.textColor} mb-1`}>
                          {lootType.name}
                        </h3>
                        <p className="text-white text-sm mb-2">
                          {formatItemValue(reward)}
                        </p>
                        <div className={`text-xs ${rarityConfig.textColor} uppercase tracking-wide`}>
                          {rarityConfig.name}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="text-center">
                <button
                  onClick={() => setShowRewards(false)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Awesome!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">📦 Loot Packs</h1>
          <p className="text-gray-400 mt-1">Open packs to get XP boosts, badges, and more!</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="bg-gray-800/50 rounded-lg px-4 py-2">
            <div className="flex items-center space-x-2">
              <span className="text-purple-400">⚡</span>
              <span className="text-white font-medium">{playerCurrency.xp.toLocaleString()} XP</span>
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg px-4 py-2">
            <div className="flex items-center space-x-2">
              <span className="text-green-400">💰</span>
              <span className="text-white font-medium">{playerCurrency.dbp.toLocaleString()} DBP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Owned Packs */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">📋 Your Packs</h3>
        
        {playerPacks.filter(pack => pack.quantity > 0).length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">📦</div>
            <p>No packs to open. Purchase some packs below!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {playerPacks.filter(pack => pack.quantity > 0).map(playerPack => {
              const packDef = PACK_DEFINITIONS.find(p => p.id === playerPack.id);
              if (!packDef) return null;
              
              const rarityConfig = getRarityConfig(packDef.rarity);
              
              return (
                <motion.div
                  key={playerPack.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-4 rounded-lg border-2 ${rarityConfig.borderColor} bg-gray-800/50 relative cursor-pointer`}
                  onClick={() => openPack(playerPack.id)}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-2">{rarityConfig.icon}</div>
                    <h4 className="font-bold text-white mb-1">{packDef.name}</h4>
                    <p className="text-sm text-gray-400 mb-3">{packDef.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${rarityConfig.textColor} uppercase`}>
                        {rarityConfig.name}
                      </span>
                      <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs">
                        x{playerPack.quantity}
                      </span>
                    </div>
                  </div>
                  
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {playerPack.quantity}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pack Store */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">🛒 Pack Store</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PACK_DEFINITIONS.map(pack => {
            const rarityConfig = getRarityConfig(pack.rarity);
            const canAfford = canAffordPack(pack.cost);
            const ownedQuantity = getPackQuantity(pack.id);
            
            return (
              <motion.div
                key={pack.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-lg border-2 ${rarityConfig.borderColor} bg-gradient-to-br from-gray-800 to-gray-900`}
              >
                <div className="text-center mb-4">
                  <div className="text-5xl mb-3">{rarityConfig.icon}</div>
                  <h4 className="text-xl font-bold text-white mb-2">{pack.name}</h4>
                  <p className="text-sm text-gray-400 mb-3">{pack.description}</p>
                  
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${rarityConfig.color} text-white mb-3`}>
                    {rarityConfig.name}
                  </div>
                </div>

                {/* Preview Items */}
                <div className="mb-4">
                  <div className="text-sm text-gray-400 mb-2">Contains {pack.guaranteedItems} items:</div>
                  <div className="grid grid-cols-2 gap-2">
                    {pack.possibleItems.slice(0, 4).map((item, index) => (
                      <div key={index} className="text-center p-2 bg-gray-700/50 rounded">
                        <div className="text-lg">{LOOT_TYPES[item.type].icon}</div>
                        <div className="text-xs text-gray-400">{LOOT_TYPES[item.type].name}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cost and Purchase */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Cost:</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-purple-400">⚡</span>
                      <span className={`font-bold ${canAfford ? 'text-white' : 'text-red-400'}`}>
                        {pack.cost === 0 ? 'FREE' : pack.cost.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {ownedQuantity > 0 && (
                    <div className="text-center text-sm text-blue-400">
                      You own {ownedQuantity} of these packs
                    </div>
                  )}

                  <button
                    onClick={() => purchasePack(pack.id)}
                    disabled={!canAfford}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      canAfford
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {pack.cost === 0 ? 'Claim Free Pack' : 'Purchase Pack'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LootPacks;