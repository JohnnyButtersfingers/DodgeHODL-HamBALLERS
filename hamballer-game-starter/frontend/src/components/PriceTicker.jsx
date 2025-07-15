import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../services/useWebSocketService';

const PriceTicker = () => {
  const { dbpPrice } = useWebSocket();
  const [previousPrice, setPreviousPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(0);

  useEffect(() => {
    if (dbpPrice && previousPrice) {
      const change = ((dbpPrice.price - previousPrice) / previousPrice) * 100;
      setPriceChange(change);
    }
    if (dbpPrice) {
      setPreviousPrice(dbpPrice.price);
    }
  }, [dbpPrice]);

  if (!dbpPrice) {
    return (
      <div className="bg-gray-800/50 rounded-lg px-3 py-2">
        <div className="text-xs text-gray-400">DBP Price</div>
        <div className="text-sm font-mono text-gray-500">Loading...</div>
      </div>
    );
  }

  const isPositive = priceChange >= 0;

  return (
    <div className="bg-gray-800/50 rounded-lg px-3 py-2">
      <div className="text-xs text-gray-400">DBP Price</div>
      <div className="flex items-center space-x-2">
        <span className="text-sm font-mono text-white">
          ${dbpPrice.price.toFixed(4)}
        </span>
        {priceChange !== 0 && (
          <span className={`text-xs font-mono ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
          </span>
        )}
        <span className={`text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? '📈' : '📉'}
        </span>
      </div>
    </div>
  );
};

export default PriceTicker;
