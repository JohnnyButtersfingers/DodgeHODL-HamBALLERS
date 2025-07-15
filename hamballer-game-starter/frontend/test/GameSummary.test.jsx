import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import GameSummary from '../src/components/GameSummary';

describe('GameSummary', () => {
  it('renders the welcome message correctly', () => {
    render(<GameSummary />);
    
    expect(screen.getByText('Welcome to HamBaller.xyz')).toBeInTheDocument();
    expect(screen.getByText('The ultimate Web3 DODGE & HODL game. Connect your wallet to start playing!')).toBeInTheDocument();
  });

  it('displays the basketball emoji', () => {
    render(<GameSummary />);
    
    expect(screen.getByText('🏀')).toBeInTheDocument();
  });

  it('renders all game instructions', () => {
    render(<GameSummary />);
    
    // Check for "How to Play" section
    expect(screen.getByText('How to Play')).toBeInTheDocument();
    
    // Check for all instruction steps
    expect(screen.getByText('Select your 10 moves (UP/DOWN) to navigate the slipnode')).toBeInTheDocument();
    expect(screen.getByText('Watch your run play out in real-time')).toBeInTheDocument();
    expect(screen.getByText('Decide to HODL or CLIMB when you reach the checkpoint')).toBeInTheDocument();
    expect(screen.getByText('Earn DBP tokens based on your performance!')).toBeInTheDocument();
  });

  it('has proper structure with numbered steps', () => {
    render(<GameSummary />);
    
    // Check for numbered steps
    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByText('2.')).toBeInTheDocument();
    expect(screen.getByText('3.')).toBeInTheDocument();
    expect(screen.getByText('4.')).toBeInTheDocument();
  });

  it('applies correct CSS classes for styling', () => {
    const { container } = render(<GameSummary />);
    
    // Check that the main container has the correct class
    const mainContainer = container.firstChild;
    expect(mainContainer).toHaveClass('text-center', 'py-12');
  });

  it('renders without crashing', () => {
    expect(() => render(<GameSummary />)).not.toThrow();
  });
});