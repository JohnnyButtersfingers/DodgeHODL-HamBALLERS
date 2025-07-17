import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import GameSummary from '../src/components/GameSummary';

describe('GameSummary', () => {
  it('renders setup phase correctly', () => {
    render(<GameSummary gamePhase="setup" wsConnected={true} error={null} />);
    
    expect(screen.getByText('Select Your Moves')).toBeInTheDocument();
    expect(screen.getByText('🎯')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('renders running phase correctly', () => {
    render(<GameSummary gamePhase="running" wsConnected={true} error={null} />);
    
    expect(screen.getByText('Run in Progress...')).toBeInTheDocument();
    expect(screen.getByText('🏃')).toBeInTheDocument();
  });

  it('renders decision phase correctly', () => {
    render(<GameSummary gamePhase="decision" wsConnected={true} error={null} />);
    
    expect(screen.getByText('HODL or CLIMB?')).toBeInTheDocument();
    expect(screen.getByText('💎')).toBeInTheDocument();
  });

  it('renders complete phase correctly', () => {
    render(<GameSummary gamePhase="complete" wsConnected={true} error={null} />);
    
    expect(screen.getByText('Run Complete!')).toBeInTheDocument();
    expect(screen.getByText('🏆')).toBeInTheDocument();
  });

  it('shows offline status when wsConnected is false', () => {
    render(<GameSummary gamePhase="setup" wsConnected={false} error={null} />);
    
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('displays error message when error prop is provided', () => {
    const errorMessage = 'Failed to start run';
    render(<GameSummary gamePhase="setup" wsConnected={true} error={errorMessage} />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('does not display error when error prop is null', () => {
    render(<GameSummary gamePhase="setup" wsConnected={true} error={null} />);
    
    expect(screen.queryByText('Failed to start run')).not.toBeInTheDocument();
  });
}); 