/**
 * Gas Optimization Service
 * Implements dynamic gas strategies for optimal transaction costs
 */

import { ethers } from 'ethers';

class GasOptimizationService {
  constructor() {
    this.gasHistory = [];
    this.maxHistorySize = 100;
    this.strategies = {
      STANDARD: 'standard',
      PRIORITY: 'priority',
      ECONOMY: 'economy',
      ADAPTIVE: 'adaptive'
    };
    this.currentStrategy = this.strategies.ADAPTIVE;
    this.gasLimits = {
      badge_claim: 150000,
      proof_verification: 200000,
      batch_claim: 500000
    };
  }

  /**
   * Get current gas prices from multiple sources
   */
  async getCurrentGasPrices(provider) {
    try {
      // Get base fee from latest block
      const block = await provider.getBlock('latest');
      const baseFee = block.baseFeePerGas;
      
      // Get priority fees from recent transactions
      const priorityFees = await this.analyzePriorityFees(provider);
      
      // Calculate different price tiers
      const prices = {
        economy: {
          maxFeePerGas: baseFee.mul(110).div(100), // Base + 10%
          maxPriorityFeePerGas: ethers.utils.parseUnits('1', 'gwei')
        },
        standard: {
          maxFeePerGas: baseFee.mul(125).div(100), // Base + 25%
          maxPriorityFeePerGas: priorityFees.median || ethers.utils.parseUnits('2', 'gwei')
        },
        priority: {
          maxFeePerGas: baseFee.mul(150).div(100), // Base + 50%
          maxPriorityFeePerGas: priorityFees.high || ethers.utils.parseUnits('3', 'gwei')
        }
      };
      
      // Store in history
      this.addToHistory({
        timestamp: Date.now(),
        baseFee: baseFee.toString(),
        prices
      });
      
      return prices;
    } catch (error) {
      console.error('Error fetching gas prices:', error);
      return this.getFallbackPrices();
    }
  }

  /**
   * Analyze priority fees from recent transactions
   */
  async analyzePriorityFees(provider, blockCount = 5) {
    try {
      const latestBlock = await provider.getBlockNumber();
      const fees = [];
      
      // Sample recent blocks
      for (let i = 0; i < blockCount; i++) {
        const block = await provider.getBlock(latestBlock - i);
        if (block && block.transactions.length > 0) {
          // Sample a few transactions from each block
          const sampleSize = Math.min(5, block.transactions.length);
          for (let j = 0; j < sampleSize; j++) {
            const tx = await provider.getTransaction(block.transactions[j]);
            if (tx.maxPriorityFeePerGas) {
              fees.push(tx.maxPriorityFeePerGas);
            }
          }
        }
      }
      
      if (fees.length === 0) return null;
      
      // Sort fees
      fees.sort((a, b) => a.sub(b).isNegative() ? -1 : 1);
      
      return {
        low: fees[Math.floor(fees.length * 0.1)],
        median: fees[Math.floor(fees.length * 0.5)],
        high: fees[Math.floor(fees.length * 0.9)]
      };
    } catch (error) {
      console.error('Error analyzing priority fees:', error);
      return null;
    }
  }

  /**
   * Get optimized gas parameters for a transaction
   */
  async getOptimizedGasParams(provider, txType = 'badge_claim', urgency = 'standard') {
    const prices = await this.getCurrentGasPrices(provider);
    const gasLimit = this.gasLimits[txType] || 200000;
    
    let gasParams;
    
    switch (this.currentStrategy) {
      case this.strategies.ECONOMY:
        gasParams = prices.economy;
        break;
      
      case this.strategies.PRIORITY:
        gasParams = prices.priority;
        break;
      
      case this.strategies.ADAPTIVE:
        // Adaptive strategy based on network conditions
        gasParams = await this.getAdaptiveGasParams(provider, prices, urgency);
        break;
      
      default:
        gasParams = prices.standard;
    }
    
    // Add buffer for gas limit
    const adjustedGasLimit = Math.floor(gasLimit * 1.1);
    
    return {
      ...gasParams,
      gasLimit: adjustedGasLimit,
      estimatedCost: this.estimateTxCost(gasParams, adjustedGasLimit)
    };
  }

  /**
   * Adaptive gas strategy based on network conditions
   */
  async getAdaptiveGasParams(provider, prices, urgency) {
    try {
      // Check network congestion
      const pendingBlock = await provider.getBlock('pending');
      const latestBlock = await provider.getBlock('latest');
      
      const congestionRatio = pendingBlock.transactions.length / 
        (latestBlock.gasLimit.div(21000).toNumber()); // Approximate tx capacity
      
      // Adjust based on congestion
      if (congestionRatio > 0.9) {
        // High congestion - use priority pricing
        return prices.priority;
      } else if (congestionRatio > 0.6) {
        // Medium congestion - use standard pricing
        return prices.standard;
      } else {
        // Low congestion - use economy pricing
        return prices.economy;
      }
    } catch (error) {
      // Fallback to urgency-based selection
      return urgency === 'high' ? prices.priority : 
             urgency === 'low' ? prices.economy : 
             prices.standard;
    }
  }

  /**
   * Estimate transaction cost in ETH
   */
  estimateTxCost(gasParams, gasLimit) {
    const maxFee = ethers.BigNumber.from(gasParams.maxFeePerGas);
    const totalCost = maxFee.mul(gasLimit);
    return ethers.utils.formatEther(totalCost);
  }

  /**
   * Get gas price recommendations
   */
  getGasRecommendations() {
    if (this.gasHistory.length === 0) {
      return {
        trend: 'stable',
        recommendation: 'Use standard gas settings',
        bestTime: null
      };
    }
    
    // Analyze recent history
    const recentHistory = this.gasHistory.slice(-20);
    const avgBaseFee = recentHistory.reduce((sum, entry) => 
      sum.add(ethers.BigNumber.from(entry.baseFee)), 
      ethers.BigNumber.from(0)
    ).div(recentHistory.length);
    
    const currentBaseFee = ethers.BigNumber.from(
      this.gasHistory[this.gasHistory.length - 1].baseFee
    );
    
    // Determine trend
    const change = currentBaseFee.sub(avgBaseFee).mul(100).div(avgBaseFee);
    let trend, recommendation;
    
    if (change.gt(10)) {
      trend = 'rising';
      recommendation = 'Consider waiting for lower gas prices';
    } else if (change.lt(-10)) {
      trend = 'falling';
      recommendation = 'Good time to submit transactions';
    } else {
      trend = 'stable';
      recommendation = 'Gas prices are stable';
    }
    
    // Find best time in recent history
    const bestEntry = recentHistory.reduce((best, entry) => 
      ethers.BigNumber.from(entry.baseFee).lt(ethers.BigNumber.from(best.baseFee)) 
        ? entry : best
    );
    
    return {
      trend,
      recommendation,
      bestTime: new Date(bestEntry.timestamp),
      currentBaseFee: ethers.utils.formatUnits(currentBaseFee, 'gwei'),
      avgBaseFee: ethers.utils.formatUnits(avgBaseFee, 'gwei')
    };
  }

  /**
   * Set gas optimization strategy
   */
  setStrategy(strategy) {
    if (Object.values(this.strategies).includes(strategy)) {
      this.currentStrategy = strategy;
      console.log(`Gas strategy set to: ${strategy}`);
    }
  }

  /**
   * Add entry to gas history
   */
  addToHistory(entry) {
    this.gasHistory.push(entry);
    if (this.gasHistory.length > this.maxHistorySize) {
      this.gasHistory.shift();
    }
  }

  /**
   * Get fallback gas prices
   */
  getFallbackPrices() {
    return {
      economy: {
        maxFeePerGas: ethers.utils.parseUnits('20', 'gwei'),
        maxPriorityFeePerGas: ethers.utils.parseUnits('1', 'gwei')
      },
      standard: {
        maxFeePerGas: ethers.utils.parseUnits('30', 'gwei'),
        maxPriorityFeePerGas: ethers.utils.parseUnits('2', 'gwei')
      },
      priority: {
        maxFeePerGas: ethers.utils.parseUnits('50', 'gwei'),
        maxPriorityFeePerGas: ethers.utils.parseUnits('3', 'gwei')
      }
    };
  }

  /**
   * Monitor gas prices
   */
  startGasMonitoring(provider, interval = 30000) {
    this.stopGasMonitoring();
    
    this.monitoringInterval = setInterval(async () => {
      await this.getCurrentGasPrices(provider);
      const recommendations = this.getGasRecommendations();
      
      if (recommendations.trend === 'falling') {
        console.log('⚡ Gas prices are falling - good time for transactions');
      }
    }, interval);
    
    console.log('Gas price monitoring started');
  }

  /**
   * Stop gas monitoring
   */
  stopGasMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Gas price monitoring stopped');
    }
  }

  /**
   * Clear gas history
   */
  clearHistory() {
    this.gasHistory = [];
  }
}

// Export singleton instance
export const gasOptimizationService = new GasOptimizationService();
export default gasOptimizationService;