import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
  rainbowWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets';

// Custom Abstract Global Wallet configuration
const abstractGlobalWallet = ({ chains }) => ({
  id: 'abstract-global-wallet',
  name: 'Abstract Global Wallet',
  iconUrl: 'https://abs.xyz/favicon.ico',
  iconBackground: '#000000',
  downloadUrls: {
    browserExtension: 'https://abs.xyz/wallet',
  },
  createConnector: () => {
    const connector = injectedWallet({ chains });
    return {
      connector,
      mobile: {
        getUri: async () => {
          return 'https://abs.xyz/mobile';
        },
      },
      qrCode: {
        getUri: async () => {
          return 'https://abs.xyz/wallet';
        },
        instructions: {
          learnMoreUrl: 'https://abs.xyz/learn',
          steps: [
            {
              description: 'Log in or create your Abstract Global Wallet to get started with Web3 gaming.',
              step: 'install',
              title: 'Open Abstract Global Wallet',
            },
            {
              description: 'After you create a wallet, click connect to link it to HamBaller.xyz.',
              step: 'create',
              title: 'Create or Import a Wallet',
            },
            {
              description: 'Once connected, you can start playing and earning rewards!',
              step: 'connect',
              title: 'Connect to HamBaller',
            },
          ],
        },
      },
    };
  },
});

// Configure wallet groups
export const getWalletConnectors = (chains, projectId) => {
  const connectors = connectorsForWallets([
    {
      groupName: 'Recommended',
      wallets: [
        abstractGlobalWallet({ chains }),
        rainbowWallet({ projectId, chains }),
        metaMaskWallet({ projectId, chains }),
      ],
    },
    {
      groupName: 'Other Wallets',
      wallets: [
        walletConnectWallet({ projectId, chains }),
        coinbaseWallet({ appName: 'HamBaller.xyz', chains }),
      ],
    },
  ]);

  return connectors;
};