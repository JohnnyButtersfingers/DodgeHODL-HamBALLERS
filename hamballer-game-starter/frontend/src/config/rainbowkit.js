import { getDefaultWallets } from '@rainbow-me/rainbowkit';
import { configureChains, createConfig } from 'wagmi';
import { mainnet, polygon, optimism, arbitrum } from 'wagmi/chains';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { publicProvider } from 'wagmi/providers/public';

// Configure chains and providers
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet, polygon, optimism, arbitrum],
  [
    alchemyProvider({ apiKey: import.meta.env.VITE_ALCHEMY_API_KEY || '' }),
    publicProvider()
  ]
);

// Get default wallets with app info
const { connectors } = getDefaultWallets({
  appName: 'HamBaller',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '',
  chains
});

// Create wagmi config
export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

// RainbowKit theme configuration
export const rainbowKitTheme = {
  colors: {
    accentColor: '#00ff88',
    accentColorForeground: '#000000',
    actionButtonBorder: 'transparent',
    actionButtonBorderMobile: 'transparent',
    actionButtonSecondaryBackground: 'rgba(255, 255, 255, 0.1)',
    closeButton: '#999999',
    closeButtonBackground: 'rgba(255, 255, 255, 0.1)',
    connectButtonBackground: '#1a1a2e',
    connectButtonBackgroundError: '#ff6b35',
    connectButtonInnerBackground: 'rgba(255, 255, 255, 0.1)',
    connectButtonText: '#ffffff',
    connectButtonTextError: '#ffffff',
    connectionIndicator: '#00ff88',
    downloadBottomCardBackground: 'rgba(255, 255, 255, 0.1)',
    downloadTopCardBackground: 'rgba(255, 255, 255, 0.2)',
    error: '#ff6b35',
    generalBorder: 'rgba(255, 255, 255, 0.1)',
    generalBorderDim: 'rgba(255, 255, 255, 0.05)',
    menuItemBackground: 'rgba(255, 255, 255, 0.1)',
    modalBackdrop: 'rgba(0, 0, 0, 0.8)',
    modalBackground: '#1a1a2e',
    modalBorder: 'rgba(255, 255, 255, 0.1)',
    modalText: '#ffffff',
    modalTextDim: 'rgba(255, 255, 255, 0.6)',
    modalTextSecondary: 'rgba(255, 255, 255, 0.8)',
    profileAction: 'rgba(255, 255, 255, 0.1)',
    profileActionHover: 'rgba(255, 255, 255, 0.2)',
    profileForeground: '#1a1a2e',
    selectedOptionBorder: '#00ff88',
    standby: '#ff6b35',
  },
  fonts: {
    body: 'Inter, system-ui, sans-serif',
  },
  radii: {
    actionButton: '12px',
    connectButton: '12px',
    menuButton: '12px',
    modal: '16px',
    modalMobile: '16px',
  },
  shadows: {
    connectButton: '0 4px 12px rgba(0, 255, 136, 0.2)',
    dialog: '0 8px 32px rgba(0, 0, 0, 0.5)',
    profileDetailsAction: '0 2px 6px rgba(0, 0, 0, 0.2)',
    selectedOption: '0 0 0 2px #00ff88',
    selectedWallet: '0 0 0 2px #00ff88',
    walletLogo: '0 2px 16px rgba(0, 0, 0, 0.2)',
  },
};

// Mobile wallet configuration
export const walletConnectOptions = {
  // Enable deep linking for mobile wallets
  qrcodeModalOptions: {
    desktopLinks: [
      'metamask',
      'trust',
      'argent',
      'rainbow',
      'crypto.com',
      'imtoken',
      'pillar',
    ],
    mobileLinks: [
      'metamask',
      'trust',
      'argent',
      'rainbow',
      'crypto.com',
      'imtoken',
      'pillar',
    ],
  },
  // Modal size configuration
  modalSize: 'compact',
  // Enable wallet connect v2
  version: '2',
};

export { chains };