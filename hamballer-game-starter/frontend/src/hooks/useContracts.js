import { useState, useEffect } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { getContract } from 'viem';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '../config/networks';

export const useContracts = () => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  const [contracts, setContracts] = useState({
    dbpToken: null,
    boostNft: null,
    hodlManager: null,
    xpBadge: null,
  });

  useEffect(() => {
    if (publicClient && CONTRACT_ADDRESSES.DBP_TOKEN) {
      const dbpToken = getContract({
        address: CONTRACT_ADDRESSES.DBP_TOKEN,
        abi: CONTRACT_ABIS.DBP_TOKEN,
        publicClient,
        walletClient: walletClient || undefined,
      });

      const boostNft = getContract({
        address: CONTRACT_ADDRESSES.BOOST_NFT,
        abi: CONTRACT_ABIS.BOOST_NFT,
        publicClient,
        walletClient: walletClient || undefined,
      });

      const hodlManager = getContract({
        address: CONTRACT_ADDRESSES.HODL_MANAGER,
        abi: CONTRACT_ABIS.HODL_MANAGER,
        publicClient,
        walletClient: walletClient || undefined,
      });

      const xpBadge = getContract({
        address: CONTRACT_ADDRESSES.XP_BADGE,
        abi: CONTRACT_ABIS.XP_BADGE,
        publicClient,
        walletClient: walletClient || undefined,
      });

      setContracts({
        dbpToken,
        boostNft,
        hodlManager,
        xpBadge,
      });
    }
  }, [publicClient, walletClient]);

  // Contract interaction helpers
  const getDbpBalance = async (userAddress = address) => {
    if (!contracts.dbpToken || !userAddress) return '0';
    
    try {
      const balance = await contracts.dbpToken.read.balanceOf([userAddress]);
      return balance.toString();
    } catch (error) {
      console.error('Error fetching DBP balance:', error);
      return '0';
    }
  };

  const getBoostBalances = async (userAddress = address) => {
    if (!contracts.boostNft || !userAddress) return [];
    
    try {
      const boostIds = [0, 1, 2, 3, 4]; // All boost types
      const balances = await contracts.boostNft.read.balanceOfBatch([
        Array(boostIds.length).fill(userAddress),
        boostIds
      ]);
      
      return boostIds.map((id, index) => ({
        id,
        balance: balances[index].toString(),
      }));
    } catch (error) {
      console.error('Error fetching boost balances:', error);
      return [];
    }
  };

  const getCurrentPrice = async () => {
    if (!contracts.hodlManager) return '0';
    
    try {
      const price = await contracts.hodlManager.read.getCurrentPrice();
      return price.toString();
    } catch (error) {
      console.error('Error fetching current price:', error);
      return '0';
    }
  };

  const getPlayerStats = async (userAddress = address) => {
    if (!contracts.hodlManager || !userAddress) return null;
    
    try {
      const stats = await contracts.hodlManager.read.getPlayerStats([userAddress]);
      return {
        totalRuns: stats[0]?.toString() || '0',
        successfulRuns: stats[1]?.toString() || '0',
        totalDbpEarned: stats[2]?.toString() || '0',
        currentXp: stats[3]?.toString() || '0',
        level: stats[4]?.toString() || '1',
      };
    } catch (error) {
      console.error('Error fetching player stats:', error);
      return null;
    }
  };

  const startRun = async (moves, boostIds = []) => {
    if (!contracts.hodlManager || !walletClient) {
      throw new Error('Contract not available or wallet not connected');
    }
    
    try {
      // Convert moves to uint8 array
      const moveBytes = moves.map(move => move === 'UP' ? 0 : 1);
      
      const tx = await contracts.hodlManager.write.startRun([moveBytes, boostIds]);
      return tx;
    } catch (error) {
      console.error('Error starting run:', error);
      throw error;
    }
  };

  const endRun = async (runId, hodlDecision) => {
    if (!contracts.hodlManager || !walletClient) {
      throw new Error('Contract not available or wallet not connected');
    }
    
    try {
      const tx = await contracts.hodlManager.write.endRun([runId, hodlDecision]);
      return tx;
    } catch (error) {
      console.error('Error ending run:', error);
      throw error;
    }
  };

  const approveDbpSpending = async (spender, amount) => {
    if (!contracts.dbpToken || !walletClient) {
      throw new Error('Contract not available or wallet not connected');
    }
    
    try {
      const tx = await contracts.dbpToken.write.approve([spender, amount]);
      return tx;
    } catch (error) {
      console.error('Error approving DBP spending:', error);
      throw error;
    }
  };

  const approveBoostSpending = async (operator, approved = true) => {
    if (!contracts.boostNft || !walletClient) {
      throw new Error('Contract not available or wallet not connected');
    }
    
    try {
      const tx = await contracts.boostNft.write.setApprovalForAll([operator, approved]);
      return tx;
    } catch (error) {
      console.error('Error approving boost spending:', error);
      throw error;
    }
  };

  return {
    contracts,
    isConnected: isConnected && !!contracts.dbpToken,
    
    // Read functions
    getDbpBalance,
    getBoostBalances,
    getCurrentPrice,
    getPlayerStats,
    
    // Write functions
    startRun,
    endRun,
    approveDbpSpending,
    approveBoostSpending,
  };
};

export default useContracts;