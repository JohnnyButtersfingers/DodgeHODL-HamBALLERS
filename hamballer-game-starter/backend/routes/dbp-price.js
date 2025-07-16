const express = require('express');
const router = express.Router();
const { contracts, db } = require('../config/database');

// In-memory price tracking (in production, use Redis or database)
let priceHistory = [];
let currentPrice = 0.001; // Starting price in ETH
let lastUpdateTime = Date.now();

// Price calculation based on supply/demand
function calculateDBPPrice() {
  // Simplified price model - in production, integrate with DEX or oracle
  const basePrice = 0.001; // Base price in ETH
  const supplyFactor = 1.0; // Adjust based on total supply
  const demandFactor = 1.0; // Adjust based on trading volume
  
  // Add some volatility for realistic pricing
  const volatility = (Math.random() - 0.5) * 0.02; // ±1% random
  
  return basePrice * supplyFactor * demandFactor * (1 + volatility);
}

// Update price periodically
function updatePrice() {
  const newPrice = calculateDBPPrice();
  const timestamp = Date.now();
  
  priceHistory.push({
    price: newPrice,
    timestamp: timestamp,
    change: newPrice - currentPrice,
    changePercent: currentPrice > 0 ? ((newPrice - currentPrice) / currentPrice) * 100 : 0
  });
  
  currentPrice = newPrice;
  lastUpdateTime = timestamp;
  
  // Keep only last 24 hours of data
  const oneDayAgo = timestamp - (24 * 60 * 60 * 1000);
  priceHistory = priceHistory.filter(entry => entry.timestamp > oneDayAgo);
  
  // Broadcast price update to WebSocket clients
  if (global.wsClients) {
    const message = JSON.stringify({
      type: 'price_update',
      data: {
        price: newPrice,
        change: newPrice - currentPrice,
        changePercent: currentPrice > 0 ? ((newPrice - currentPrice) / currentPrice) * 100 : 0,
        timestamp: new Date(timestamp).toISOString()
      }
    });

    global.wsClients.forEach(client => {
      try {
        if (client.readyState === 1 && 
            (!client.subscriptions || 
             client.subscriptions.includes('price') || 
             client.subscriptions.includes('all'))) {
          client.send(message);
        }
      } catch (error) {
        console.error('❌ Price broadcast error:', error);
      }
    });
  }
}

// Update price every 30 seconds
setInterval(updatePrice, 30000);

// GET /api/dbp-price/current - Get current DBP price
router.get('/current', async (req, res) => {
  try {
    // Get current blockchain stats for context
    const globalStats = await contracts.getGlobalStats();
    
    // Calculate market metrics
    const totalSupply = globalStats ? parseFloat(globalStats.totalDBPMinted) : 0;
    const marketCap = totalSupply * currentPrice;
    
    // Get 24h stats
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const dayStartPrice = priceHistory.find(entry => entry.timestamp >= oneDayAgo)?.price || currentPrice;
    const change24h = currentPrice - dayStartPrice;
    const changePercent24h = dayStartPrice > 0 ? ((change24h / dayStartPrice) * 100) : 0;
    
    res.json({
      success: true,
      data: {
        price: currentPrice,
        currency: 'ETH',
        change24h: change24h,
        changePercent24h: changePercent24h,
        volume24h: 0, // Would integrate with DEX data
        marketCap: marketCap,
        totalSupply: totalSupply,
        lastUpdated: new Date(lastUpdateTime).toISOString(),
        priceHistory: priceHistory.slice(-100) // Last 100 data points
      }
    });

  } catch (error) {
    console.error('❌ Error fetching DBP price:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch DBP price',
      message: error.message
    });
  }
});

// GET /api/dbp-price/history - Get price history
router.get('/history', async (req, res) => {
  try {
    const timeframe = req.query.timeframe || '24h'; // 1h, 24h, 7d, 30d
    const limit = parseInt(req.query.limit) || 100;
    
    let filteredHistory = [...priceHistory];
    
    // Filter by timeframe
    const now = Date.now();
    let cutoffTime;
    
    switch (timeframe) {
      case '1h':
        cutoffTime = now - (60 * 60 * 1000);
        break;
      case '24h':
        cutoffTime = now - (24 * 60 * 60 * 1000);
        break;
      case '7d':
        cutoffTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        cutoffTime = now - (30 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffTime = now - (24 * 60 * 60 * 1000);
    }
    
    filteredHistory = filteredHistory
      .filter(entry => entry.timestamp >= cutoffTime)
      .slice(-limit);
    
    // Calculate statistics
    const prices = filteredHistory.map(entry => entry.price);
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    res.json({
      success: true,
      data: {
        timeframe,
        history: filteredHistory,
        stats: {
          high: high || 0,
          low: low || 0,
          average: avg || 0,
          current: currentPrice,
          dataPoints: filteredHistory.length
        },
        lastUpdated: new Date(lastUpdateTime).toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error fetching price history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch price history',
      message: error.message
    });
  }
});

// GET /api/dbp-price/stats - Get market statistics
router.get('/stats', async (req, res) => {
  try {
    // Get blockchain data
    const globalStats = await contracts.getGlobalStats();
    
    // Calculate market metrics
    const totalSupply = globalStats ? parseFloat(globalStats.totalDBPMinted) : 0;
    const totalRuns = globalStats ? parseInt(globalStats.totalRuns) : 0;
    const totalCP = globalStats ? parseInt(globalStats.totalCPGenerated) : 0;
    
    // Calculate price metrics
    const prices = priceHistory.map(entry => entry.price);
    const high24h = Math.max(...prices.slice(-48)); // Last 48 data points ≈ 24h
    const low24h = Math.min(...prices.slice(-48));
    
    // Calculate CP to DBP conversion rate effectiveness
    const avgCPPerRun = totalRuns > 0 ? totalCP / totalRuns : 0;
    const avgDBPPerRun = totalRuns > 0 ? totalSupply / totalRuns : 0;
    const conversionEfficiency = avgCPPerRun > 0 ? (avgDBPPerRun / (avgCPPerRun / 10)) * 100 : 100;
    
    res.json({
      success: true,
      data: {
        market: {
          currentPrice: currentPrice,
          marketCap: totalSupply * currentPrice,
          volume24h: 0, // Would integrate with DEX
          high24h: high24h || currentPrice,
          low24h: low24h || currentPrice
        },
        supply: {
          total: totalSupply,
          circulating: totalSupply, // All minted tokens are circulating
          holders: 0 // Would need to track unique addresses
        },
        game: {
          totalRuns,
          totalCPGenerated: totalCP,
          avgCPPerRun: avgCPPerRun,
          avgDBPPerRun: avgDBPPerRun,
          conversionEfficiency: conversionEfficiency
        },
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error fetching market stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market statistics',
      message: error.message
    });
  }
});

// Initialize with first price update
updatePrice();

module.exports = router;
