import { useCallback, useEffect, useState } from 'react';
import useContracts from './useContracts';
import { useAccount, usePublicClient } from 'wagmi';
import { CONTRACT_ABIS } from '../config/networks';

const BADGE_IDS = [0, 1, 2, 3, 4];

/**
 * React hook providing convenience helpers for interacting with the XPBadge ERC-1155 contract.
 *
 * Responsibilities:
 * 1. Fetch the caller's badge balances via `balanceOfBatch`.
 * 2. Subscribe to `BadgeMinted` events so the UI updates in real-time when a badge is minted.
 * 3. Expose a `mintBadge` helper that wraps the `mintBadge` contract call (useful for dev / test tooling).
 */
export const useXPBadge = () => {
  const { contracts } = useContracts();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const xpBadge = contracts?.xpBadge;

  const [balances, setBalances] = useState({}); // { 0: '1', 1: '0', ... }
  const [lastTx, setLastTx] = useState(null); // { hash, tokenId }
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  /**
   * Fetch `balanceOfBatch` for all badge IDs.
   */
  const fetchBalances = useCallback(
    async (playerAddress = address) => {
      if (!xpBadge || !playerAddress) return;
      setLoading(true);
      setError(null);
      try {
        const accounts = BADGE_IDS.map(() => playerAddress);
        const res = await xpBadge.read.balanceOfBatch([accounts, BADGE_IDS]);
        const newBalances = {};
        res.forEach((bn, idx) => {
          newBalances[BADGE_IDS[idx]] = BigInt(bn).toString();
        });
        setBalances(newBalances);
      } catch (err) {
        console.error('Failed to fetch badge balances:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [xpBadge, address]
  );

  /**
   * Optional helper for client-side minting (only works if caller has MINTER_ROLE).
   */
  const mintBadge = useCallback(
    async ({ tokenId, xp, season }) => {
      if (!xpBadge) throw new Error('XPBadge contract not initialised');
      try {
        const txHash = await xpBadge.write.mintBadge([address, tokenId, xp, season]);
        setLastTx({ hash: txHash, tokenId });
        return txHash;
      } catch (err) {
        console.error('Failed to mint badge:', err);
        throw err;
      }
    },
    [xpBadge, address]
  );

  /* ------------------------------------------------------------------ */
  // Lifecycles
  /* ------------------------------------------------------------------ */

  // Fetch balances on mount & when contract/address changes.
  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  // Subscribe to BadgeMinted events for real-time updates.
  useEffect(() => {
    if (!publicClient || !xpBadge) return;

    const unwatch = publicClient.watchContractEvent({
      address: xpBadge.address,
      abi: CONTRACT_ABIS.XP_BADGE,
      eventName: 'BadgeMinted',
      listener: (logs) => {
        // Only refetch if current user is involved to save RPC calls.
        if (!Array.isArray(logs)) return;
        for (const log of logs) {
          const { args } = log;
          if (args && args.player && args.player.toLowerCase() === address?.toLowerCase()) {
            fetchBalances();
            break;
          }
        }
      },
    });

    return () => unwatch?.();
  }, [publicClient, xpBadge, address, fetchBalances]);

  return {
    balances,
    fetchBalances,
    mintBadge,
    lastTx,
    loading,
    error,
  };
};

export default useXPBadge;