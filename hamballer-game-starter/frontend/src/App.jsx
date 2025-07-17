import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WagmiConfig, createConfig, configureChains } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';
import { getDefaultWallets, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

// Components
import Layout from './components/Layout';
import GameView from './components/GameView';
import Dashboard from './components/Dashboard';
import ReplayViewer from './components/ReplayViewer';
import Leaderboard from './components/Leaderboard';
import LaunchDashboard from './components/LaunchDashboard';
import XPProgressGraph from './components/XPProgressGraph';
import ZKFailureMonitor from './components/ZKFailureMonitor';
import HowToPlay from './components/HowToPlay';

// Hooks
import { WebSocketProvider } from './services/useWebSocketService.jsx';
import { GameStateProvider } from './hooks/useGameState';
import { WalletProvider } from './contexts/WalletContext';
import { XpProvider } from './contexts/XpContext';

// Network configuration
import { abstractTestnet } from './config/networks';

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

// Configure wallets
const { connectors } = getDefaultWallets({
  appName: 'HamBaller.xyz',
  projectId: 'hamballer-dodge-hodl', // In production, use your WalletConnect project ID
  chains,
});

// Create wagmi config
const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

function App() {
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider 
        chains={chains} 
        theme={{
          blurs: {
            modalOverlay: 'blur(4px)',
          },
          colors: {
            accentColor: '#00ff88',
            accentColorForeground: '#1a1a2e',
            actionButtonBorder: 'rgba(255, 255, 255, 0.04)',
            actionButtonBorderMobile: 'rgba(255, 255, 255, 0.08)',
            actionButtonSecondaryBackground: 'rgba(255, 255, 255, 0.08)',
            closeButton: 'rgba(224, 232, 255, 0.6)',
            closeButtonBackground: 'rgba(255, 255, 255, 0.08)',
            connectButtonBackground: '#00ff88',
            connectButtonBackgroundError: '#ff6b35',
            connectButtonInnerBackground: 'linear-gradient(0deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.15))',
            connectButtonText: '#1a1a2e',
            connectButtonTextError: '#ffffff',
            connectionIndicator: '#00ff88',
            downloadBottomCardBackground: 'linear-gradient(126deg, rgba(255, 255, 255, 0) 9.49%, rgba(171, 171, 171, 0.04) 71.04%), #1a1a2e',
            downloadTopCardBackground: 'linear-gradient(126deg, rgba(171, 171, 171, 0.2) 9.49%, rgba(255, 255, 255, 0) 71.04%), #1a1a2e',
            error: '#ff6b35',
            generalBorder: 'rgba(255, 255, 255, 0.08)',
            generalBorderDim: 'rgba(255, 255, 255, 0.04)',
            menuItemBackground: 'rgba(224, 232, 255, 0.1)',
            modalBackdrop: 'rgba(0, 0, 0, 0.5)',
            modalBackground: '#16213e',
            modalBorder: 'rgba(255, 255, 255, 0.08)',
            modalText: '#ffffff',
            modalTextDim: 'rgba(224, 232, 255, 0.3)',
            modalTextSecondary: 'rgba(255, 255, 255, 0.6)',
            profileAction: 'rgba(224, 232, 255, 0.1)',
            profileActionHover: 'rgba(224, 232, 255, 0.2)',
            profileForeground: '#16213e',
            selectedOptionBorder: 'rgba(224, 232, 255, 0.1)',
            standby: '#ff6b35',
          },
          fonts: {
            body: 'Inter, system-ui, sans-serif',
          },
          radii: {
            actionButton: '12px',
            connectButton: '12px',
            menuButton: '12px',
            modal: '24px',
            modalMobile: '28px',
          },
        }}
      >
        <WebSocketProvider>
          <WalletProvider>
            <XpProvider>
              <GameStateProvider>
                <Router>
                  <div className="min-h-screen bg-game-dark text-white">
                    <Routes>
                      <Route path="/" element={<Layout />}>
                        <Route index element={<GameView />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="leaderboard" element={<Leaderboard />} />
                        <Route path="replay/:runId?" element={<ReplayViewer />} />
                        <Route path="launch-dashboard" element={<LaunchDashboard />} />
                        <Route path="how-to-play" element={<HowToPlay />} />
                        <Route path="xp-progress" element={<XPProgressGraph />} />
                        <Route path="dev/recent-claims" element={<ZKFailureMonitor />} />
                      </Route>
                    </Routes>
                  </div>
                </Router>
              </GameStateProvider>
            </XpProvider>
          </WalletProvider>
        </WebSocketProvider>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default App;