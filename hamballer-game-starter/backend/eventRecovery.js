const { ethers } = require('ethers');
const { db } = require('./config/database');
const { handleRunCompletion } = require('./controllers/runLogger');
const { retryQueue } = require('./retryQueue');

// Contract ABI for event recovery
const HODL_MANAGER_ABI = [
  'event RunCompleted(address indexed user, uint256 xpEarned, uint256 cpEarned, uint256 dbpMinted, uint256 duration, bool bonusThrowUsed, uint256[] boostsUsed)'
];

class EventRecovery {
  constructor() {
    this.provider = null;
    this.hodlManagerContract = null;
    this.isInitialized = false;
    this.recoveryInProgress = false;
  }

  /**
   * Initialize event recovery system
   */
  async initialize() {
    try {
      const rpcUrl = process.env.ABSTRACT_RPC_URL;
      const hodlManagerAddress = process.env.HODL_MANAGER_ADDRESS;

      if (!rpcUrl || !hodlManagerAddress) {
        console.warn('⚠️ EventRecovery: Missing configuration - event recovery disabled');
        return false;
      }

      // Initialize provider and contract
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.hodlManagerContract = new ethers.Contract(hodlManagerAddress, HODL_MANAGER_ABI, this.provider);

      this.isInitialized = true;
      console.log('✅ EventRecovery initialized');
      console.log(`📍 HODL Manager: ${hodlManagerAddress}`);

      return true;
    } catch (error) {
      console.error('❌ EventRecovery initialization failed:', error.message);
      if (error.cause) {
        console.error('   Cause:', error.cause.message);
      }
      if (error.stack) {
        console.error('   Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
      }
      return false;
    }
  }

  /**
   * Recover missed events since last server restart
   */
  async recoverMissedEvents() {
    if (!this.isInitialized || this.recoveryInProgress) {
      return;
    }

    this.recoveryInProgress = true;
    console.log('🔍 EventRecovery: Starting missed event recovery...');

    try {
      // Get the last processed block number from database
      const lastProcessedBlock = await this.getLastProcessedBlock();
      const currentBlock = await this.provider.getBlockNumber();

      if (currentBlock <= lastProcessedBlock) {
        console.log('✅ EventRecovery: No missed events to recover');
        return;
      }

      const blocksToScan = currentBlock - lastProcessedBlock;
      console.log(`🔍 EventRecovery: Scanning ${blocksToScan} blocks (${lastProcessedBlock + 1} to ${currentBlock})`);

      // Scan for missed RunCompleted events with error handling
      let missedEvents = [];
      try {
        missedEvents = await this.scanForMissedEvents(lastProcessedBlock + 1, currentBlock);
      } catch (error) {
        console.error('❌ EventRecovery: Failed to scan for missed events:', error.message);
        if (error.code === 'UNKNOWN_ERROR' && error.error?.code === -32602) {
          console.log('⚠️ RPC filter error - skipping event recovery');
          await this.updateLastProcessedBlock(currentBlock);
          return;
        }
        throw error;
      }
      
      if (missedEvents.length === 0) {
        console.log('✅ EventRecovery: No missed RunCompleted events found');
        await this.updateLastProcessedBlock(currentBlock);
        return;
      }

      console.log(`🔍 EventRecovery: Found ${missedEvents.length} missed RunCompleted events`);

      // Store missed events in database for processing
      await this.storeMissedEvents(missedEvents);

      // Process missed events
      await this.processMissedEvents();

      // Update last processed block
      await this.updateLastProcessedBlock(currentBlock);

      console.log('✅ EventRecovery: Missed event recovery completed');

    } catch (error) {
      console.error('❌ EventRecovery: Failed to recover missed events:', error.message);
      if (error.cause) {
        console.error('   Cause:', error.cause.message);
      }
      console.error('   Stack:', error.stack);
      console.error('   Fetch error details:', {
        message: error.message,
        cause: error.cause?.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      });
    } finally {
      this.recoveryInProgress = false;
    }
  }

  /**
   * Get the last processed block number from database
   */
  async getLastProcessedBlock() {
    if (!db) {
      // If no database, default to scanning last 1000 blocks
      const currentBlock = await this.provider.getBlockNumber();
      return Math.max(0, currentBlock - 1000);
    }

    try {
      // Check if we have any run logs with block numbers
      const { data: lastRun, error } = await db
        .from('run_logs')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }

      if (!lastRun) {
        // No previous runs, start from recent blocks
        const currentBlock = await this.provider.getBlockNumber();
        return Math.max(0, currentBlock - 1000);
      }

      // Calculate approximate block number based on timestamp
      // Abstract Network: ~2 second block time
      const lastRunTime = new Date(lastRun.created_at);
      const currentTime = new Date();
      const timeDiff = Math.floor((currentTime - lastRunTime) / 1000); // seconds
      const estimatedBlocksDiff = Math.floor(timeDiff / 2); // 2 second blocks
      
      const currentBlock = await this.provider.getBlockNumber();
      const estimatedLastBlock = Math.max(0, currentBlock - estimatedBlocksDiff - 100); // Add buffer

      console.log(`🔍 EventRecovery: Estimated last processed block: ${estimatedLastBlock} (current: ${currentBlock})`);
      return estimatedLastBlock;

    } catch (error) {
      console.error('❌ EventRecovery: Failed to get last processed block:', error.message);
      if (error.cause) {
        console.error('   Cause:', error.cause.message);
      }
      console.error('   Stack:', error.stack);
      // Default to scanning last 1000 blocks
      const currentBlock = await this.provider.getBlockNumber();
      return Math.max(0, currentBlock - 1000);
    }
  }

  /**
   * Scan blockchain for missed RunCompleted events
   */
  async scanForMissedEvents(fromBlock, toBlock) {
    const missedEvents = [];
    
    try {
      // Scan in chunks to avoid RPC limits
      const chunkSize = 1000;
      
      for (let start = fromBlock; start <= toBlock; start += chunkSize) {
        const end = Math.min(start + chunkSize - 1, toBlock);
        
        console.log(`🔍 EventRecovery: Scanning blocks ${start} to ${end}`);
        
                try {
          const events = await this.hodlManagerContract.queryFilter(
            'RunCompleted',
            start,
            end
          );

          for (const event of events) {
            // Check if this event was already processed
            const isProcessed = await this.isEventProcessed(event.transactionHash, event.blockNumber);
            
            if (!isProcessed) {
              missedEvents.push({
                user: event.args.user,
                xpEarned: event.args.xpEarned,
                cpEarned: event.args.cpEarned,
                dbpMinted: event.args.dbpMinted,
                duration: event.args.duration,
                bonusThrowUsed: event.args.bonusThrowUsed,
                boostsUsed: event.args.boostsUsed,
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash,
                logIndex: event.logIndex
              });
            }
          }

          // Small delay to avoid overwhelming the RPC
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          if (error.code === 'UNKNOWN_ERROR' && error.error?.code === -32602) {
            console.warn(`⚠️ EventRecovery: RPC filter error for blocks ${start}-${end}, skipping`);
          } else {
            console.warn(`⚠️ EventRecovery: Failed to scan blocks ${start}-${end}:`, error.message);
          }
          // Continue with next chunk
        }
      }

    } catch (error) {
      console.error('❌ EventRecovery: Failed to scan for missed events:', error.message);
    }

    return missedEvents;
  }

  /**
   * Check if an event was already processed
   */
  async isEventProcessed(txHash, blockNumber) {
    if (!db) return false;

    try {
      // Check if we have a run log with this transaction hash
      const { data: existingRun, error } = await db
        .from('run_logs')
        .select('id')
        .or(`seed.eq.${txHash},seed.like.%${txHash.slice(-8)}`) // Check full hash or last 8 chars
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!existingRun;

    } catch (error) {
      console.warn('⚠️ EventRecovery: Error checking if event processed:', error.message);
      return false; // Assume not processed to be safe
    }
  }

  /**
   * Store missed events in database for processing
   */
  async storeMissedEvents(events) {
    if (!db || events.length === 0) return;

    try {
      const missedEventRecords = events.map(event => ({
        player_address: event.user.toLowerCase(),
        xp_earned: Number(event.xpEarned.toString()),
        cp_earned: Number(event.cpEarned.toString()),
        dbp_minted: parseFloat(ethers.formatEther(event.dbpMinted)),
        duration: Number(event.duration.toString()),
        bonus_throw_used: event.bonusThrowUsed,
        boosts_used: event.boostsUsed.map(b => Number(b.toString())),
        block_number: event.blockNumber,
        tx_hash: event.transactionHash,
        processed: false
      }));

      const { error } = await db
        .from('missed_run_events')
        .insert(missedEventRecords);

      if (error) throw error;

      console.log(`📝 EventRecovery: Stored ${events.length} missed events for processing`);

    } catch (error) {
      console.error('❌ EventRecovery: Failed to store missed events:', error.message);
    }
  }

  /**
   * Process all unprocessed missed events
   */
  async processMissedEvents() {
    if (!db) return;

    try {
      // Get all unprocessed missed events
      const { data: missedEvents, error } = await db
        .from('missed_run_events')
        .select('*')
        .eq('processed', false)
        .order('block_number', { ascending: true });

      if (error) throw error;

      if (!missedEvents || missedEvents.length === 0) {
        console.log('✅ EventRecovery: No missed events to process');
        return;
      }

      console.log(`🔄 EventRecovery: Processing ${missedEvents.length} missed events`);

      for (const event of missedEvents) {
        try {
          // Process the run completion
          const runData = {
            playerAddress: event.player_address,
            cpEarned: event.cp_earned,
            dbpMinted: event.dbp_minted,
            duration: event.duration,
            bonusThrowUsed: event.bonus_throw_used,
            boostsUsed: event.boosts_used,
            status: 'completed',
            blockNumber: event.block_number,
            txHash: event.tx_hash,
            timestamp: new Date().toISOString(),
            recovered: true // Mark as recovered event
          };

          // Handle run completion (this will create run log)
          await handleRunCompletion(runData);

          // Queue badge minting if XP was earned
          if (event.xp_earned > 0 && retryQueue.isInitialized) {
            // Get current season for badge minting
            const currentSeason = 1; // Default season, could be dynamic
            
            // Note: We don't have runId yet since handleRunCompletion creates it
            // We'll need to get the run ID from the created run log
            const { data: runLog, error: runError } = await db
              .from('run_logs')
              .select('id')
              .eq('player_address', event.player_address)
              .eq('status', 'completed')
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (!runError && runLog) {
              await retryQueue.addAttempt(
                event.player_address,
                runLog.id,
                event.xp_earned,
                currentSeason
              );
            }
          }

          // Mark event as processed
          await db
            .from('missed_run_events')
            .update({ 
              processed: true, 
              processed_at: new Date().toISOString() 
            })
            .eq('id', event.id);

          console.log(`✅ EventRecovery: Processed missed event for ${event.player_address} (${event.xp_earned} XP)`);

          // Small delay between processing
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`❌ EventRecovery: Failed to process missed event ${event.id}:`, error.message);
          // Continue with next event
        }
      }

      console.log('✅ EventRecovery: Finished processing missed events');

    } catch (error) {
      console.error('❌ EventRecovery: Failed to process missed events:', error.message);
    }
  }

  /**
   * Update the last processed block number
   */
  async updateLastProcessedBlock(blockNumber) {
    // For simplicity, we'll rely on the run logs timestamps
    // In a production system, you might want to store this separately
    console.log(`📝 EventRecovery: Updated last processed block to ${blockNumber}`);
  }

  /**
   * Manual recovery for specific block range
   */
  async manualRecovery(fromBlock, toBlock) {
    if (!this.isInitialized) {
      console.error('❌ EventRecovery: Not initialized');
      return;
    }

    console.log(`🔧 EventRecovery: Manual recovery for blocks ${fromBlock} to ${toBlock}`);
    
    try {
      const missedEvents = await this.scanForMissedEvents(fromBlock, toBlock);
      
      if (missedEvents.length > 0) {
        await this.storeMissedEvents(missedEvents);
        await this.processMissedEvents();
      }

      console.log(`✅ EventRecovery: Manual recovery completed - processed ${missedEvents.length} events`);
      return missedEvents.length;

    } catch (error) {
      console.error('❌ EventRecovery: Manual recovery failed:', error.message);
      throw error;
    }
  }

  /**
   * Get recovery statistics
   */
  async getStats() {
    if (!db) {
      return {
        totalMissedEvents: 0,
        processedEvents: 0,
        pendingEvents: 0
      };
    }

    try {
      const { data: stats, error } = await db
        .rpc('get_missed_events_stats')
        .single();

      if (error) throw error;

      return stats;

    } catch (error) {
      // Fallback to manual count if RPC function doesn't exist
      try {
        const { count: total } = await db
          .from('missed_run_events')
          .select('*', { count: 'exact', head: true });

        const { count: processed } = await db
          .from('missed_run_events')
          .select('*', { count: 'exact', head: true })
          .eq('processed', true);

        return {
          totalMissedEvents: total || 0,
          processedEvents: processed || 0,
          pendingEvents: (total || 0) - (processed || 0)
        };

      } catch (fallbackError) {
        console.warn('⚠️ EventRecovery: Failed to get stats:', fallbackError.message);
        return {
          totalMissedEvents: 0,
          processedEvents: 0,
          pendingEvents: 0
        };
      }
    }
  }
}

// Create singleton instance
const eventRecovery = new EventRecovery();

module.exports = {
  eventRecovery,
  EventRecovery
};