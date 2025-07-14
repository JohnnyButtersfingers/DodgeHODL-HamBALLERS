import React, { createContext, useContext, useState } from 'react';

const XpContext = createContext();

export const XpProvider = ({ children }) => {
  const [xp, setXp] = useState(0);
  return (
    <XpContext.Provider value={{ xp, setXp }}>
      {children}
    </XpContext.Provider>
  );
};

export const useXp = () => useContext(XpContext);
