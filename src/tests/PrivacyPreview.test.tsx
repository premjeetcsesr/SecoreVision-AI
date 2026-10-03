import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PrivacyPreview } from '../dashboard/screens/PrivacyPreview';

describe('PrivacyPreview Component', () => {
  it('renders pre-transmission privacy preview header and status badge', () => {
    render(<PrivacyPreview />);
    expect(screen.getByText('Pre-Transmission Privacy Preview')).toBeInTheDocument();
    expect(screen.getByText('Client-Side Masking')).toBeInTheDocument();
  });

  it('renders visual canvas and detected items card', () => {
    render(<PrivacyPreview />);
    expect(screen.getByText('Visual Browser Canvas')).toBeInTheDocument();
    expect(screen.getByText('Detected Sensitive Items')).toBeInTheDocument();
  });

  it('renders approval button and triggers approval modal', () => {
    render(<PrivacyPreview />);
    const approveButtons = screen.getAllByRole('button', { name: /Approve Sanitized Frame/i });
    expect(approveButtons.length).toBeGreaterThan(0);
    fireEvent.click(approveButtons[0]);

    expect(screen.getByText(/Confirm Frame Sanitization Approval/i)).toBeInTheDocument();
  });

  it('renders rescan page button', () => {
    render(<PrivacyPreview />);
    const rescanBtn = screen.getByRole('button', { name: /Re-scan Page/i });
    expect(rescanBtn).toBeInTheDocument();
    fireEvent.click(rescanBtn);
  });
});
