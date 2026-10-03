import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SettingsPage } from '../dashboard/screens/SettingsPage';

describe('SettingsPage Component', () => {
  it('renders model selection options and privacy modes', () => {
    render(<SettingsPage />);
    expect(screen.getByText(/Agent Engine & Privacy Settings/i)).toBeInTheDocument();
    expect(screen.getByText(/Local MobileNet-V4 Vision \(Recommended\)/i)).toBeInTheDocument();
    expect(screen.getByText(/WebGPU Hardware Acceleration/i)).toBeInTheDocument();
    expect(screen.getByText(/Strict Zero-Leakage \(Recommended\)/i)).toBeInTheDocument();
  });

  it('allows user to save settings', () => {
    render(<SettingsPage />);
    const saveBtn = screen.getByRole('button', { name: /Save Configuration/i });
    expect(saveBtn).toBeInTheDocument();
    fireEvent.click(saveBtn);
  });
});
