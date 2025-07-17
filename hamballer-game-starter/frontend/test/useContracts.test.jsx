import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import useContracts from '../src/hooks/useContracts';

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true
  }),
  usePublicClient: () => ({
    readContract: vi.fn()
  }),
  useWalletClient: () => ({
    data: {
      writeContract: vi.fn()
    }
  })
}));

// Mock viem with simplified contract
const mockContract = {
  read: {
    balanceOf: vi.fn(),
    balanceOfBatch: vi.fn(),
    getCurrentPrice: vi.fn(),
    getPlayerStats: vi.fn()
  },
  write: {
    startRun: vi.fn(),
    endRun: vi.fn(),
    approve: vi.fn(),
    setApprovalForAll: vi.fn()
  }
};

vi.mock('viem', () => ({
  getContract: vi.fn(() => mockContract)
}));

// Mock network config
vi.mock('../src/config/networks.js', () => ({
  CONTRACT_ADDRESSES: {
    DBP_TOKEN: '0xDBPTokenAddress',
    BOOST_NFT: '0xBoostNFTAddress',
    HODL_MANAGER: '0xHODLManagerAddress'
  },
  CONTRACT_ABIS: {
    DBP_TOKEN: [],
    BOOST_NFT: [],
    HODL_MANAGER: []
  }
}));

describe('useContracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock contract methods
    Object.values(mockContract.read).forEach(mock => mock.mockReset());
    Object.values(mockContract.write).forEach(mock => mock.mockReset());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Contract Initialization', () => {
    it('should initialize contracts when public client is available', async () => {
      const { result } = renderHook(() => useContracts());

      await waitFor(() => {
        expect(result.current.contracts.dbpToken).toBeDefined();
        expect(result.current.contracts.boostNft).toBeDefined();
        expect(result.current.contracts.hodlManager).toBeDefined();
      });
    });

    it('should set isConnected to true when contracts are available', async () => {
      const { result } = renderHook(() => useContracts());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });
  });

  describe('Read Functions', () => {
    it('should fetch DBP balance correctly', async () => {
      const mockBalance = '1000000000000000000000'; // 1000 DBP in wei
      mockContract.read.balanceOf.mockResolvedValue(mockBalance);

      const { result } = renderHook(() => useContracts());

      await waitFor(async () => {
        const balance = await result.current.getDbpBalance();
        expect(balance).toBe(mockBalance);
        expect(mockContract.read.balanceOf).toHaveBeenCalledWith(['0x1234567890123456789012345678901234567890']);
      });
    });

    it('should handle DBP balance errors gracefully', async () => {
      mockContract.read.balanceOf.mockRejectedValue(new Error('Contract error'));

      const { result } = renderHook(() => useContracts());

      await waitFor(async () => {
        const balance = await result.current.getDbpBalance();
        expect(balance).toBe('0');
      });
    });

    it('should fetch boost balances correctly', async () => {
      const mockBalances = ['1', '0', '2', '0', '1'];
      mockContract.read.balanceOfBatch.mockResolvedValue(mockBalances);

      const { result } = renderHook(() => useContracts());

      await waitFor(async () => {
        const balances = await result.current.getBoostBalances();
        expect(balances).toEqual([
          { id: 0, balance: '1' },
          { id: 1, balance: '0' },
          { id: 2, balance: '2' },
          { id: 3, balance: '0' },
          { id: 4, balance: '1' }
        ]);
      });
    });

    it('should fetch current price correctly', async () => {
      const mockPrice = '1234567890000000000'; // 1.23456789 DBP in wei
      mockContract.read.getCurrentPrice.mockResolvedValue(mockPrice);

      const { result } = renderHook(() => useContracts());

      await waitFor(async () => {
        const price = await result.current.getCurrentPrice();
        expect(price).toBe(mockPrice);
      });
    });

    it('should fetch player stats correctly', async () => {
      const mockStats = [
        '10', // totalRuns
        '8',  // successfulRuns
        '500000000000000000000', // totalDbpEarned (500 DBP)
        '1500', // currentXp
        '5'   // level
      ];
      mockContract.read.getPlayerStats.mockResolvedValue(mockStats);

      const { result } = renderHook(() => useContracts());

      await waitFor(async () => {
        const stats = await result.current.getPlayerStats();
        expect(stats).toEqual({
          totalRuns: '10',
          successfulRuns: '8',
          totalDbpEarned: '500000000000000000000',
          currentXp: '1500',
          level: '5'
        });
      });
    });

    it('should handle player stats errors gracefully', async () => {
      mockContract.read.getPlayerStats.mockRejectedValue(new Error('Contract error'));

      const { result } = renderHook(() => useContracts());

      await waitFor(async () => {
        const stats = await result.current.getPlayerStats();
        expect(stats).toBeNull();
      });
    });
  });

  describe('Write Functions', () => {
    it('should start run correctly', async () => {
      const mockTx = { hash: '0x123...' };
      mockContract.write.startRun.mockResolvedValue(mockTx);

      const { result } = renderHook(() => useContracts());
      const moves = ['UP', 'DOWN', 'UP', 'DOWN', 'UP'];
      const boostIds = [1, 2];

      await waitFor(async () => {
        const tx = await result.current.startRun(moves, boostIds);
        expect(tx).toEqual(mockTx);
        expect(mockContract.write.startRun).toHaveBeenCalledWith([[0, 1, 0, 1, 0], [1, 2]]);
      });
    });

    it('should end run correctly', async () => {
      const mockTx = { hash: '0x456...' };
      mockContract.write.endRun.mockResolvedValue(mockTx);

      const { result } = renderHook(() => useContracts());

      await waitFor(async () => {
        const tx = await result.current.endRun('run123', true);
        expect(tx).toEqual(mockTx);
        expect(mockContract.write.endRun).toHaveBeenCalledWith(['run123', true]);
      });
    });

    it('should approve DBP spending correctly', async () => {
      const mockTx = { hash: '0x789...' };
      mockContract.write.approve.mockResolvedValue(mockTx);

      const { result } = renderHook(() => useContracts());

      await waitFor(async () => {
        const tx = await result.current.approveDbpSpending('0xSpender', '1000000000000000000000');
        expect(tx).toEqual(mockTx);
        expect(mockContract.write.approve).toHaveBeenCalledWith(['0xSpender', '1000000000000000000000']);
      });
    });

    it('should approve boost spending correctly', async () => {
      const mockTx = { hash: '0xabc...' };
      mockContract.write.setApprovalForAll.mockResolvedValue(mockTx);

      const { result } = renderHook(() => useContracts());

      await waitFor(async () => {
        const tx = await result.current.approveBoostSpending('0xOperator', true);
        expect(tx).toEqual(mockTx);
        expect(mockContract.write.setApprovalForAll).toHaveBeenCalledWith(['0xOperator', true]);
      });
    });

    it('should throw error when wallet is not connected', async () => {
      // Mock disconnected wallet
      vi.mocked(require('wagmi').useWalletClient).mockReturnValue({ data: null });

      const { result } = renderHook(() => useContracts());

      await waitFor(async () => {
        await expect(result.current.startRun(['UP'], [])).rejects.toThrow('Contract not available or wallet not connected');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle contract read errors gracefully', async () => {
      mockContract.read.balanceOf.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useContracts());

      await waitFor(async () => {
        const balance = await result.current.getDbpBalance();
        expect(balance).toBe('0');
      });
    });

    it('should handle contract write errors gracefully', async () => {
      mockContract.write.startRun.mockRejectedValue(new Error('Transaction failed'));

      const { result } = renderHook(() => useContracts());

      await waitFor(async () => {
        await expect(result.current.startRun(['UP'], [])).rejects.toThrow('Transaction failed');
      });
    });

    it('should handle missing contract addresses', async () => {
      // Mock missing contract addresses
      vi.mocked(require('../src/config/networks.js').CONTRACT_ADDRESSES).DBP_TOKEN = null;

      const { result } = renderHook(() => useContracts());

      await waitFor(() => {
        expect(result.current.contracts.dbpToken).toBeNull();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty moves array', async () => {
      const mockTx = { hash: '0x123...' };
      mockContract.write.startRun.mockResolvedValue(mockTx);

      const { result } = renderHook(() => useContracts());

      await waitFor(async () => {
        const tx = await result.current.startRun([], []);
        expect(tx).toEqual(mockTx);
        expect(mockContract.write.startRun).toHaveBeenCalledWith([[], []]);
      });
    });

    it('should handle invalid move values', async () => {
      const mockTx = { hash: '0x123...' };
      mockContract.write.startRun.mockResolvedValue(mockTx);

      const { result } = renderHook(() => useContracts());

      await waitFor(async () => {
        const tx = await result.current.startRun(['INVALID', 'UP'], []);
        expect(tx).toEqual(mockTx);
        expect(mockContract.write.startRun).toHaveBeenCalledWith([[1, 0], []]);
      });
    });

    it('should handle null user address', async () => {
      mockContract.read.balanceOf.mockResolvedValue('0');

      const { result } = renderHook(() => useContracts());

      await waitFor(async () => {
        const balance = await result.current.getDbpBalance(null);
        expect(balance).toBe('0');
      });
    });
  });
}); 