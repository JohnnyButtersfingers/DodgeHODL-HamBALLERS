import { render, screen, waitFor } from '@testing-library/react';
import Leaderboard from '../src/pages/Leaderboard';
import { vi } from 'vitest';

vi.mock('../src/services/useApiService', () => ({
  getLeaderboard: vi.fn(() => Promise.resolve([
    { address: '0xabc123456789', xp: 1000 },
    { address: '0xdef987654321', xp: 900 }
  ]))
}));

vi.mock('../src/contexts/WalletContext', () => ({
  useWallet: () => ({ address: '0xabc123456789' })
}));

test('renders leaderboard entries', async () => {
  render(<Leaderboard />);

  expect(screen.getByText(/Loading leaderboard/i)).toBeInTheDocument();

  await waitFor(() => screen.getByText(/0xabc12/i));

  expect(screen.getByText(/0xabc12/i)).toBeInTheDocument();
  expect(screen.getByText('1000')).toBeInTheDocument();
});
