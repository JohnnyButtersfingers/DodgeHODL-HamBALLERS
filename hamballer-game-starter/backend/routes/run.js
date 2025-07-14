const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { db, contracts } = require('../config/database');
const { logRunEvent, broadcastRunUpdate } = require('../controllers/runLogger');

// Validation schemas
const startRunSchema = Joi.object({
  playerAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  seed: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  signature: Joi.string().optional()
});

const completeRunSchema = Joi.object({
  playerAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  cpEarned: Joi.number().integer().min(0).max(10000).required(),
  duration: Joi.number().integer().min(30).max(300).required(),
  bonusThrowUsed: Joi.boolean().default(false),
  boostsUsed: Joi.array().items(Joi.number().integer().min(1).max(5)).default([]),
  replayData: Joi.object().optional(),
  signature: Joi.string().optional()
});

// POST /api/run/start - Start a new game run
router.post('/start', async (req, res) => {
  try {
    // Validate request
    const { error, value } = startRunSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { playerAddress, seed } = value;

    // Check if player already has an active run
    const currentRun = await contracts.getCurrentRun(playerAddress);
    if (currentRun && currentRun.status === 1) { // IN_PROGRESS
      return res.status(409).json({
        success: false,
        error: 'Player already has an active run',
        currentRun
      });
    }

    // Log run start event
    const runStartData = {
      playerAddress,
      startTime: new Date().toISOString(),
      seed,
      status: 'started'
    };

    // Save to database
    await db.createRunLog({
      playerAddress,
      startTime: runStartData.startTime,
      endTime: null,
      cpEarned: 0,
      dbpMinted: 0,
      status: 'in_progress',
      bonusThrowUsed: false,
      boostsUsed: [],
      seed,
      duration: 0
    });

    // Log the event and broadcast
    await logRunEvent('run_started', runStartData);
    broadcastRunUpdate('run_started', {
      playerAddress,
      startTime: runStartData.startTime,
      seed
    });

    res.json({
      success: true,
      message: 'Run started successfully',
      data: {
        playerAddress,
        startTime: runStartData.startTime,
        seed,
        status: 'in_progress'
      }
    });

  } catch (error) {
    console.error('❌ Error starting run:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start run',
      message: error.message
    });
  }
});

// POST /api/run/complete - Complete a game run
router.post('/complete', async (req, res) => {
  try {
    // Validate request
    const { error, value } = completeRunSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { 
      playerAddress, 
      cpEarned, 
      duration, 
      bonusThrowUsed, 
      boostsUsed, 
      replayData 
    } = value;

    // Calculate DBP based on CP (10 CP = 1 DBP)
    const dbpMinted = Math.floor(cpEarned / 10);
    
    // Apply bonus throw multiplier if used
    const finalCP = bonusThrowUsed ? cpEarned * 2 : cpEarned;
    const finalDBP = Math.floor(finalCP / 10);

    const completionTime = new Date().toISOString();

    // Create run completion data
    const runData = {
      playerAddress,
      startTime: new Date(Date.now() - duration * 1000).toISOString(),
      endTime: completionTime,
      cpEarned: finalCP,
      dbpMinted: finalDBP,
      status: 'completed',
      bonusThrowUsed,
      boostsUsed,
      seed: req.body.seed || '0x' + '0'.repeat(64),
      duration
    };

    // Save run log to database
    const savedRun = await db.createRunLog(runData);

    // Save replay data if provided
    if (replayData) {
      await db.saveReplayData({
        runId: savedRun.id,
        playerAddress,
        replayData,
        duration,
        cpEarned: finalCP,
        status: 'completed'
      });
    }

    // Log the event and broadcast
    await logRunEvent('run_completed', runData);
    broadcastRunUpdate('run_completed', {
      playerAddress,
      cpEarned: finalCP,
      dbpMinted: finalDBP,
      duration,
      bonusThrowUsed,
      boostsUsed
    });

    res.json({
      success: true,
      message: 'Run completed successfully',
      data: {
        playerAddress,
        cpEarned: finalCP,
        dbpMinted: finalDBP,
        duration,
        bonusThrowUsed,
        boostsUsed,
        runId: savedRun.id,
        completedAt: completionTime
      }
    });

  } catch (error) {
    console.error('❌ Error completing run:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete run',
      message: error.message
    });
  }
});

// POST /api/run/fail - Mark a run as failed
router.post('/fail', async (req, res) => {
  try {
    const { playerAddress, duration, reason } = req.body;

    if (!playerAddress || !duration) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: playerAddress, duration'
      });
    }

    const failureTime = new Date().toISOString();

    const runData = {
      playerAddress,
      startTime: new Date(Date.now() - duration * 1000).toISOString(),
      endTime: failureTime,
      cpEarned: 0,
      dbpMinted: 0,
      status: 'failed',
      bonusThrowUsed: false,
      boostsUsed: [],
      seed: req.body.seed || '0x' + '0'.repeat(64),
      duration
    };

    // Save failed run to database
    await db.createRunLog(runData);

    // Log the event and broadcast
    await logRunEvent('run_failed', { ...runData, reason });
    broadcastRunUpdate('run_failed', {
      playerAddress,
      duration,
      reason: reason || 'Game over',
      failedAt: failureTime
    });

    res.json({
      success: true,
      message: 'Run failure recorded',
      data: {
        playerAddress,
        duration,
        status: 'failed',
        failedAt: failureTime
      }
    });

  } catch (error) {
    console.error('❌ Error recording run failure:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record run failure',
      message: error.message
    });
  }
});

// GET /api/run/history/:address - Get player's run history
router.get('/history/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format'
      });
    }

    // Get run history from database
    const runs = await db.getRunLogs(address, limit);

    // Get current blockchain stats for context
    const playerStats = await contracts.getPlayerStats(address);
    const currentRun = await contracts.getCurrentRun(address);

    res.json({
      success: true,
      data: {
        playerAddress: address,
        runs,
        stats: playerStats,
        currentRun,
        total: runs.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching run history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch run history',
      message: error.message
    });
  }
});

// GET /api/run/current/:address - Get player's current run status
router.get('/current/:address', async (req, res) => {
  try {
    const { address } = req.params;

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format'
      });
    }

    // Get current run from blockchain
    const currentRun = await contracts.getCurrentRun(address);
    
    // Get player stats
    const playerStats = await contracts.getPlayerStats(address);

    res.json({
      success: true,
      data: {
        playerAddress: address,
        currentRun,
        stats: playerStats
      }
    });

  } catch (error) {
    console.error('❌ Error fetching current run:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch current run',
      message: error.message
    });
  }
});

// GET /api/run/leaderboard - Get global leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const type = req.query.type || 'cp_earned'; // cp_earned, dbp_minted, duration
    const limit = parseInt(req.query.limit) || 100;

    // Get leaderboard data
    const leaderboard = await db.getLeaderboard(type, limit);

    // Get global stats for context
    const globalStats = await contracts.getGlobalStats();

    res.json({
      success: true,
      data: {
        leaderboard,
        globalStats,
        type,
        limit
      }
    });

  } catch (error) {
    console.error('❌ Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard',
      message: error.message
    });
  }
});

module.exports = router;
