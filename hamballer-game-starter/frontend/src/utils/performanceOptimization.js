import { useCallback, useRef, useEffect, useMemo, useState } from 'react';

// Debounce utility for rate limiting function calls
export const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null);
  
  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

// Throttle utility for limiting execution frequency
export const useThrottle = (callback, delay) => {
  const lastCallRef = useRef(0);
  const timeoutRef = useRef(null);
  
  return useCallback((...args) => {
    const now = Date.now();
    
    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now;
      callback(...args);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        lastCallRef.current = Date.now();
        callback(...args);
      }, delay - (now - lastCallRef.current));
    }
  }, [callback, delay]);
};

// Batch processing utility for handling multiple WebSocket messages
export class MessageBatcher {
  constructor(processFn, batchSize = 10, delay = 100) {
    this.processFn = processFn;
    this.batchSize = batchSize;
    this.delay = delay;
    this.queue = [];
    this.timeout = null;
  }
  
  add(message) {
    this.queue.push(message);
    
    if (this.queue.length >= this.batchSize) {
      this.flush();
    } else if (!this.timeout) {
      this.timeout = setTimeout(() => this.flush(), this.delay);
    }
  }
  
  flush() {
    if (this.queue.length === 0) return;
    
    const batch = [...this.queue];
    this.queue = [];
    
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    
    this.processFn(batch);
  }
  
  destroy() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    this.queue = [];
  }
}

// React hook for message batching
export const useMessageBatcher = (processFn, batchSize = 10, delay = 100) => {
  const batcherRef = useRef(null);
  
  useEffect(() => {
    batcherRef.current = new MessageBatcher(processFn, batchSize, delay);
    
    return () => {
      if (batcherRef.current) {
        batcherRef.current.destroy();
      }
    };
  }, [processFn, batchSize, delay]);
  
  return useCallback((message) => {
    if (batcherRef.current) {
      batcherRef.current.add(message);
    }
  }, []);
};

// Memory-efficient data structure for real-time updates
export class CircularBuffer {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.buffer = [];
    this.head = 0;
    this.size = 0;
  }
  
  push(item) {
    if (this.size < this.maxSize) {
      this.buffer[this.size] = item;
      this.size++;
    } else {
      this.buffer[this.head] = item;
      this.head = (this.head + 1) % this.maxSize;
    }
  }
  
  toArray() {
    if (this.size < this.maxSize) {
      return this.buffer.slice(0, this.size);
    } else {
      return [
        ...this.buffer.slice(this.head),
        ...this.buffer.slice(0, this.head)
      ];
    }
  }
  
  get length() {
    return this.size;
  }
  
  clear() {
    this.buffer = [];
    this.head = 0;
    this.size = 0;
  }
}

// React hook for circular buffer
export const useCircularBuffer = (maxSize = 100) => {
  const bufferRef = useRef(new CircularBuffer(maxSize));
  
  const push = useCallback((item) => {
    bufferRef.current.push(item);
  }, []);
  
  const toArray = useCallback(() => {
    return bufferRef.current.toArray();
  }, []);
  
  const clear = useCallback(() => {
    bufferRef.current.clear();
  }, []);
  
  return { push, toArray, clear, length: bufferRef.current.length };
};

// Virtualization helper for large lists
export const useVirtualization = (items, containerHeight, itemHeight) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );
    
    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    };
  }, [items, containerHeight, itemHeight, scrollTop]);
  
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);
  
  return {
    visibleItems,
    handleScroll,
    totalHeight: visibleItems.totalHeight,
    offsetY: visibleItems.offsetY
  };
};

// Performance monitor for real-time metrics
export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      wsMessages: 0,
      apiCalls: 0,
      renderTime: 0,
      memoryUsage: 0,
      lastUpdate: Date.now()
    };
    
    this.thresholds = {
      maxWSMessages: 100, // per second
      maxAPIcalls: 50,    // per second
      maxRenderTime: 16,  // ms (60 FPS)
      maxMemoryUsage: 100 // MB
    };
    
    this.callbacks = [];
    this.startTime = Date.now();
  }
  
  recordWSMessage() {
    this.metrics.wsMessages++;
    this.checkThresholds();
  }
  
  recordAPICall() {
    this.metrics.apiCalls++;
    this.checkThresholds();
  }
  
  recordRenderTime(time) {
    this.metrics.renderTime = time;
    this.checkThresholds();
  }
  
  recordMemoryUsage() {
    if (performance.memory) {
      this.metrics.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024;
      this.checkThresholds();
    }
  }
  
  checkThresholds() {
    const now = Date.now();
    const elapsed = (now - this.startTime) / 1000;
    
    const warnings = [];
    
    if (this.metrics.wsMessages / elapsed > this.thresholds.maxWSMessages) {
      warnings.push('High WebSocket message rate');
    }
    
    if (this.metrics.apiCalls / elapsed > this.thresholds.maxAPIcalls) {
      warnings.push('High API call rate');
    }
    
    if (this.metrics.renderTime > this.thresholds.maxRenderTime) {
      warnings.push('Slow render time');
    }
    
    if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      warnings.push('High memory usage');
    }
    
    if (warnings.length > 0) {
      this.callbacks.forEach(callback => callback(warnings, this.metrics));
    }
    
    this.metrics.lastUpdate = now;
  }
  
  onWarning(callback) {
    this.callbacks.push(callback);
  }
  
  getMetrics() {
    return { ...this.metrics };
  }
  
  reset() {
    this.metrics = {
      wsMessages: 0,
      apiCalls: 0,
      renderTime: 0,
      memoryUsage: 0,
      lastUpdate: Date.now()
    };
    this.startTime = Date.now();
  }
}

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  const monitorRef = useRef(new PerformanceMonitor());
  const [metrics, setMetrics] = useState(monitorRef.current.getMetrics());
  
  useEffect(() => {
    const monitor = monitorRef.current;
    
    const updateMetrics = () => {
      setMetrics(monitor.getMetrics());
    };
    
    const warningHandler = (warnings, currentMetrics) => {
      console.warn('Performance warnings:', warnings);
      console.log('Current metrics:', currentMetrics);
    };
    
    monitor.onWarning(warningHandler);
    
    // Update metrics every second
    const interval = setInterval(updateMetrics, 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);
  
  return {
    metrics,
    recordWSMessage: monitorRef.current.recordWSMessage.bind(monitorRef.current),
    recordAPICall: monitorRef.current.recordAPICall.bind(monitorRef.current),
    recordRenderTime: monitorRef.current.recordRenderTime.bind(monitorRef.current),
    recordMemoryUsage: monitorRef.current.recordMemoryUsage.bind(monitorRef.current),
    reset: monitorRef.current.reset.bind(monitorRef.current)
  };
};

// Optimized state updater for frequent updates
export const useOptimizedState = (initialValue) => {
  const [state, setState] = useState(initialValue);
  const pendingUpdateRef = useRef(null);
  
  const setOptimizedState = useCallback((newValue) => {
    if (pendingUpdateRef.current) {
      cancelAnimationFrame(pendingUpdateRef.current);
    }
    
    pendingUpdateRef.current = requestAnimationFrame(() => {
      setState(newValue);
      pendingUpdateRef.current = null;
    });
  }, []);
  
  useEffect(() => {
    return () => {
      if (pendingUpdateRef.current) {
        cancelAnimationFrame(pendingUpdateRef.current);
      }
    };
  }, []);
  
  return [state, setOptimizedState];
};

// WebSocket message deduplication
export class MessageDeduplicator {
  constructor(maxSize = 1000) {
    this.seen = new Set();
    this.maxSize = maxSize;
    this.queue = [];
  }
  
  isDuplicate(message) {
    const key = this.getMessageKey(message);
    
    if (this.seen.has(key)) {
      return true;
    }
    
    this.seen.add(key);
    this.queue.push(key);
    
    if (this.queue.length > this.maxSize) {
      const oldKey = this.queue.shift();
      this.seen.delete(oldKey);
    }
    
    return false;
  }
  
  getMessageKey(message) {
    // Create a unique key based on message content
    return `${message.type}-${message.timestamp || Date.now()}-${JSON.stringify(message.data)}`;
  }
  
  clear() {
    this.seen.clear();
    this.queue = [];
  }
}

// React hook for message deduplication
export const useMessageDeduplication = (maxSize = 1000) => {
  const deduplicatorRef = useRef(new MessageDeduplicator(maxSize));
  
  const checkDuplicate = useCallback((message) => {
    return deduplicatorRef.current.isDuplicate(message);
  }, []);
  
  const clear = useCallback(() => {
    deduplicatorRef.current.clear();
  }, []);
  
  return { checkDuplicate, clear };
};

// Efficient data merger for real-time updates
export const mergeRealtimeData = (existing, incoming, keyField = 'id') => {
  const existingMap = new Map(existing.map(item => [item[keyField], item]));
  
  incoming.forEach(item => {
    existingMap.set(item[keyField], {
      ...existingMap.get(item[keyField]),
      ...item
    });
  });
  
  return Array.from(existingMap.values());
};

// Utility for handling WebSocket reconnection with exponential backoff
export const createReconnectionManager = (connectFn, maxRetries = 5) => {
  let retryCount = 0;
  let retryTimeout = null;
  
  const reconnect = () => {
    if (retryCount >= maxRetries) {
      console.error('Max reconnection attempts reached');
      return;
    }
    
    const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
    console.log(`Reconnecting in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
    
    retryTimeout = setTimeout(() => {
      retryCount++;
      connectFn()
        .then(() => {
          retryCount = 0; // Reset on successful connection
        })
        .catch(() => {
          reconnect(); // Retry on failure
        });
    }, delay);
  };
  
  const reset = () => {
    retryCount = 0;
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeout = null;
    }
  };
  
  return { reconnect, reset };
};

export default {
  useDebounce,
  useThrottle,
  useMessageBatcher,
  useCircularBuffer,
  useVirtualization,
  usePerformanceMonitor,
  useOptimizedState,
  useMessageDeduplication,
  MessageBatcher,
  CircularBuffer,
  PerformanceMonitor,
  MessageDeduplicator,
  mergeRealtimeData,
  createReconnectionManager
};