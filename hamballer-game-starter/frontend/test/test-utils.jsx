import React from 'react';
import { render } from '@testing-library/react';
import { AudioProvider } from '../src/contexts/AudioContext';

// Custom render function that includes AudioProvider
const customRender = (ui, options = {}) => {
  const AllTheProviders = ({ children }) => {
    return (
      <AudioProvider>
        {children}
      </AudioProvider>
    );
  };

  return render(ui, { wrapper: AllTheProviders, ...options });
};

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render }; 