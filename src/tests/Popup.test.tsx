import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Popup } from '../popup/Popup';

describe('Popup Component', () => {
  it('renders SecureVision AI branding and status badge', () => {
    render(<Popup />);
    expect(screen.getByText('SecureVision')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getByText('Zero-Leakage Visual Agent')).toBeInTheDocument();
    expect(screen.getByText('Agent Idle (Shield Ready)')).toBeInTheDocument();
  });

  it('allows user to enter a task prompt and start the agent', async () => {
    render(<Popup />);
    const textarea = screen.getByPlaceholderText(/Summarize checkout items/i);
    fireEvent.change(textarea, { target: { value: 'Summarize total price safely' } });
    expect(textarea).toHaveValue('Summarize total price safely');

    const startButton = screen.getByRole('button', { name: /Start Privacy-Safe Agent/i });
    expect(startButton).toBeInTheDocument();
    fireEvent.click(startButton);
  });

  it('renders current page status and sensitive fields count', () => {
    render(<Popup />);
    expect(screen.getByText(/Active Webpage/i)).toBeInTheDocument();
    expect(screen.getByText(/Protected Tab/i)).toBeInTheDocument();
    expect(screen.getByText(/fields auto-masked/i)).toBeInTheDocument();
  });

  it('renders navigation shortcut buttons', () => {
    render(<Popup />);
    expect(screen.getByRole('button', { name: /Privacy Preview/i })).toBeInTheDocument();
    const dashboardButtons = screen.getAllByRole('button', { name: /Full Dashboard/i });
    expect(dashboardButtons.length).toBeGreaterThanOrEqual(1);
  });
});
