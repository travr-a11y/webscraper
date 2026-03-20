/**
 * Simple in-process counting semaphore for limiting concurrent scrapes.
 */
class Semaphore {
  constructor(permits) {
    this.permits = permits;
    this.waitQueue = [];
  }

  /**
   * Acquire a slot, waiting if necessary.
   * @returns {Promise<void>}
   */
  acquire() {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.waitQueue.push(resolve);
      }
    });
  }

  /**
   * Try to acquire without waiting.
   * @returns {boolean}
   */
  tryAcquire() {
    if (this.permits > 0) {
      this.permits--;
      return true;
    }
    return false;
  }

  release() {
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift();
      resolve();
    } else {
      this.permits++;
    }
  }
}

module.exports = { Semaphore };
