import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import GameSummary from '../src/components/GameSummary';

describe('GameSummary', () => {
  it('renders the welcome message correctly', () => {
    render(<GameSummary />);
    
    // The text is now split with a gradient span, so we need to search for partial text
    expect(screen.getByText('Welcome to')).toBeInTheDocument();
    expect(screen.getByText('HamBaller.xyz')).toBeInTheDocument();
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
    
    // Check for instruction text content
    expect(screen.getByText('Select your 10 moves (UP/DOWN) to navigate the slipnode')).toBeInTheDocument();
    expect(screen.getByText('Watch your run play out in real-time')).toBeInTheDocument();
    expect(screen.getByText('Decide to HODL or CLIMB when you reach the checkpoint')).toBeInTheDocument();
    expect(screen.getByText('Earn DBP tokens based on your performance!')).toBeInTheDocument();
  });

  it('has proper structure with numbered steps', () => {
    render(<GameSummary />);
    
    // Check for numbered steps - now they are in circles without dots
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('applies correct CSS classes for styling', () => {
    const { container } = render(<GameSummary />);
    
    // Check that the main container has the correct class - now it's a main element with different classes
    const mainContainer = container.firstChild;
    expect(mainContainer).toHaveClass('min-h-screen', 'bg-gradient-to-br');
  });

  it('renders without crashing', () => {
    expect(() => render(<GameSummary />)).not.toThrow();
  });
});