export class ExponentialBackoff {
  constructor(baseDelay = 1000, maxDelay = 30000, factor = 2) {
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
    this.factor = factor;
    this.attempt = 0;
  }

  nextDelay() {
    const delay = Math.min(
      this.baseDelay * Math.pow(this.factor, this.attempt),
      this.maxDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = delay * 0.1 * Math.random();
    this.attempt++;
    
    return Math.floor(delay + jitter);
  }

  reset() {
    this.attempt = 0;
  }

  getAttempt() {
    return this.attempt;
  }
}