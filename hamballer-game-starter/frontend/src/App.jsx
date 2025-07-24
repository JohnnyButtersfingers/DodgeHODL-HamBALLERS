import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WagmiConfig, createConfig, configureChains } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

// Components
import Layout from './components/Layout';
import LandingPage from './components/LandingPage';
import GameView from './components/GameView';
import Dashboard from './components/Dashboard';
import ReplayViewer from './components/ReplayViewer';
import Leaderboard from './components/Leaderboard';
import ClaimBadge from './components/ClaimBadge';
import ClaimPanel from './components/ClaimPanel';
import LaunchDashboard from './components/LaunchDashboard';
import RecentClaims from './components/RecentClaims';
import QASummaryModal from './components/QASummaryModal';
import { useZKToasts } from './components/ZKErrorToast';

// Hooks
import { WebSocketProvider } from './services/useWebSocketService';
import { GameStateProvider } from './hooks/useGameState';
import { WalletProvider } from './contexts/WalletContext';
import { XpProvider } from './contexts/XpContext';
import { AudioProvider } from './contexts/AudioContext';

// Network and wallet configuration
import { abstractTestnet } from './config/networks';
import { getWalletConnectors } from './config/wallets';

// Configure chains and providers
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [abstractTestnet],
  [
    jsonRpcProvider({
      rpc: (chain) => ({
        http: chain.rpcUrls.default.http[0],
        webSocket: chain.rpcUrls.default.webSocket?.[0],
      }),
    }),
    publicProvider(),
  ]
);

// Configure wallets with proper project ID and Abstract Global Wallet support
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'hamballer-game-xyz-2024';
const connectors = getWalletConnectors(chains, projectId);

// Create wagmi config
const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

function App() {
  const { ToastContainer } = useZKToasts();

  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider 
        chains={chains} 
        theme={{
          blurs: {
            modalOverlay: 'blur(4px)',
          },
          colors: {
            accentColor: '#22C55E', // Fresh Green
            accentColorForeground: '#18181B', // Retro Black
            actionButtonBorder: 'rgba(255, 255, 255, 0.04)',
            actionButtonBorderMobile: 'rgba(255, 255, 255, 0.08)',
            actionButtonSecondaryBackground: 'rgba(255, 255, 255, 0.08)',
            closeButton: 'rgba(224, 232, 255, 0.6)',
            closeButtonBackground: 'rgba(255, 255, 255, 0.08)',
            connectButtonBackground: '#3B82F6', // Arcade Blue
            connectButtonBackgroundError: '#FF4B4B', // Retro Red
            connectButtonInnerBackground: 'linear-gradient(0deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.15))',
            connectButtonText: '#FFFFFF', // Cloud White
            connectButtonTextError: '#FFFFFF',
            connectionIndicator: '#22C55E', // Fresh Green
            downloadBottomCardBackground: 'linear-gradient(126deg, rgba(255, 255, 255, 0) 9.49%, rgba(171, 171, 171, 0.04) 71.04%), #18181B',
            downloadTopCardBackground: 'linear-gradient(126deg, rgba(171, 171, 171, 0.2) 9.49%, rgba(255, 255, 255, 0) 71.04%), #18181B',
            error: '#FF4B4B', // Retro Red
            generalBorder: 'rgba(228, 228, 231, 0.08)', // Soft Grey
            generalBorderDim: 'rgba(228, 228, 231, 0.04)',
            menuItemBackground: 'rgba(59, 130, 246, 0.1)', // Arcade Blue
            modalBackdrop: 'rgba(24, 24, 27, 0.8)', // Retro Black
            modalBackground: '#18181B', // Retro Black
            modalBorder: 'rgba(228, 228, 231, 0.08)', // Soft Grey
            modalText: '#FFFFFF', // Cloud White
            modalTextDim: 'rgba(228, 228, 231, 0.6)',
            modalTextSecondary: 'rgba(255, 255, 255, 0.6)',
            profileAction: 'rgba(59, 130, 246, 0.1)', // Arcade Blue
            profileActionHover: 'rgba(59, 130, 246, 0.2)',
            profileForeground: '#18181B', // Retro Black
            selectedOptionBorder: 'rgba(59, 130, 246, 0.2)', // Arcade Blue
            standby: '#FB923C', // Cheese Orange
          },
          fonts: {
            body: 'Inter, system-ui, sans-serif',
          },
          radii: {
            actionButton: '16px', // Rounded-2xl equivalent
            connectButton: '16px',
            menuButton: '16px',
            modal: '24px',
            modalMobile: '28px',
          },
        }}
      >
        <AudioProvider>
          <WebSocketProvider>
            <WalletProvider>
              <XpProvider>
                <GameStateProvider>
                <Router>
                  <div className="min-h-screen bg-retro-black text-cloud-white">
                    <Routes>
                      {/* Public Routes */}
                      <Route path="/landing" element={<LandingPage />} />
                      
                      {/* App Routes with Layout */}
                      <Route path="/" element={<Layout />}>
                        <Route index element={<GameView />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="leaderboard" element={<Leaderboard />} />
                        <Route path="badges" element={<ClaimBadge />} />
                        <Route path="claim" element={<ClaimPanel />} />
                        <Route path="replay/:runId?" element={<ReplayViewer />} />
                        
                        {/* Internal QA & Launch Tools */}
                        <Route path="launch-dashboard" element={<LaunchDashboard />} />
                        <Route path="dev/recent-claims" element={<RecentClaims />} />
                      </Route>
                    </Routes>
                    
                    {/* Global Toast Container */}
                    <ToastContainer position="top-right" />
                  </div>
                </Router>
              </GameStateProvider>
            </XpProvider>
          </WalletProvider>
        </WebSocketProvider>
        </AudioProvider>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default App;