import { useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import useContracts from './useContracts';
import { useXp } from '../contexts/XpContext';
import useXPBadge from './useXPBadge';

/**
 * Subscribes to RunCompleted events from the HODLManager contract and updates
 * XP context + badge balances when the connected player finishes a run.
 */
export const useRunCompletedListener = (playerAddress) => {
  const publicClient = usePublicClient();
  const { contracts } = useContracts();
  const { setXp } = useXp();
  const { fetchBalances } = useXPBadge();

  useEffect(() => {
    if (!publicClient || !contracts?.hodlManager || !playerAddress) return;

    const unwatch = publicClient.watchContractEvent({
      address: contracts.hodlManager.address,
      abi: [
        'event RunCompleted(address indexed user, uint256 xpEarned, uint256 cpEarned, uint256 dbpMinted, uint256 duration, bool bonusThrowUsed, uint256[] boostsUsed)'
      ],
      eventName: 'RunCompleted',
      listener: (logs) => {
        for (const log of logs) {
          const { args } = log;
          if (args && args.user?.toLowerCase() === playerAddress.toLowerCase()) {
            const xpEarned = Number(args.xpEarned);
            setXp((prev) => prev + xpEarned);
            // Refresh badge balances – backend mint may take a couple blocks, but fetch anyway
            fetchBalances(playerAddress);
          }
        }
      },
    });

    return () => unwatch?.();
  }, [publicClient, contracts?.hodlManager, playerAddress, setXp, fetchBalances]);
};

export default useRunCompletedListener;