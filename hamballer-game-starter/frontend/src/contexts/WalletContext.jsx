import React, { createContext, useContext, useState } from 'react';
import { useAccount } from 'wagmi';

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const { address, isConnected } = useAccount();
  const [session, setSession] = useState(null);

  return (
    <WalletContext.Provider value={{ address, isConnected, session, setSession }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
