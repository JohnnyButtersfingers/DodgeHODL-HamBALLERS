const { db } = require('../config/database');

class RetryQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  add(badge, user, xp) {
    this.queue.push({ badge, user, xp, attempts: 0 });
    this.process();
  }

  async process() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length) {
      const item = this.queue[0];
      try {
        const tx = await item.badge.mintBadge(item.user, item.xp, 1);
        if (tx.wait) await tx.wait();
        console.log(`Retry mint succeeded for ${item.user}`);
        this.queue.shift();
      } catch (err) {
        item.attempts += 1;
        console.error('Retry mint failed:', err.message);
        if (item.attempts >= 3) {
          await db.logMintFailure(item.user, item.xp.toString(), err.message);
          this.queue.shift();
        } else {
          await new Promise((res) => setTimeout(res, 5000));
        }
      }
    }

    this.processing = false;
  }
}

const retryQueue = new RetryQueue();
module.exports = { addToQueue: (badge, user, xp) => retryQueue.add(badge, user, xp) };

