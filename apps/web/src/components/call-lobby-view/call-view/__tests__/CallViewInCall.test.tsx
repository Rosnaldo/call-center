import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CallView, CallViewState } from '../CallView.tsx';
import { buildCall } from '../../../../__tests__/builders.ts';
import { useCurrentUserStore } from '../../../../states/current-user/store.ts';

const defaultProps = (overrides = {}) => ({
  state: CallViewState.InCall,
  isScreenSharing: false,
  isVideoOff: false,
  isMuted: false,
  partnerName: 'John Doe',
  partnerInitials: 'JD',
  setIsMuted: vi.fn(),
  setIsVideoOff: vi.fn(),
  setIsScreenSharing: vi.fn(),
  setIsSettingsOpen: vi.fn(),
  isFullscreen: false,
  toggleFullscreen: vi.fn(),
  handleStartCall: vi.fn(),
  onHangUp: vi.fn(),
  currentCall: buildCall({ attendantName: 'John Doe' }),
  isAttendant: false,
  ...overrides,
});

describe('CallView Component - in-call Unit Tests', () => {
  beforeEach(() => {
    useCurrentUserStore.setState({ currentUser: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders call session active with partner information badge', () => {
    render(<CallView {...defaultProps()} />);

    const partnerBadge = screen.getByText(/John Doe/i);
    expect(partnerBadge).toBeDefined();

    const screenBtn = screen.getByTitle(/Compartilhar Tela/i);
    expect(screenBtn).toBeDefined();
  });

  it('renders muted indicator correctly when mic is muted during call', () => {
    const { container } = render(<CallView {...defaultProps({ isMuted: true })} />);

    const mutedIndicator = screen.getByText('Mudo');
    expect(mutedIndicator).toBeDefined();

    const micIconOff = container.querySelector('.bg-red-600\\/90');
    expect(micIconOff).not.toBeNull();
  });

  it('renders clean visual state on screen sharing mode', () => {
    render(<CallView {...defaultProps({ isScreenSharing: true })} />);

    const shareAlert = screen.getByText(/Sua Tela está Sendo Compartilhada/i);
    expect(shareAlert).toBeDefined();
  });

  it('renders initials badge when video camera is functioning normally', () => {
    render(<CallView {...defaultProps()} />);

    const initialsElement = screen.getByText('JD');
    expect(initialsElement).toBeDefined();
  });

  it('triggers onHangUp callback with proper ids when click end call button', () => {
    const onHangUp = vi.fn();
    const { container } = render(
      <CallView {...defaultProps({
        onHangUp,
        currentCall: buildCall({ attendantId: 'att-123', id: 'call-abc' }),
      })} />
    );

    const hangUpBtn = container.querySelector('#lobby-end-call');
    expect(hangUpBtn).not.toBeNull();
    if (hangUpBtn) {
      fireEvent.click(hangUpBtn);
      expect(onHangUp).toHaveBeenCalledWith('att-123', 'call-abc');
    }
  });

  it('calls setIsScreenSharing when screen share button is clicked', () => {
    const setIsScreenSharing = vi.fn();
    const { container } = render(
      <CallView {...defaultProps({ setIsScreenSharing })} />
    );

    const screenToggle = container.querySelector('#lobby-screenshare-toggle');
    expect(screenToggle).not.toBeNull();
    if (screenToggle) {
      fireEvent.click(screenToggle);
      expect(setIsScreenSharing).toHaveBeenCalled();
    }
  });

  it('renders timer text when provided', () => {
    render(<CallView {...defaultProps({ timerText: '03:45' })} />);

    const timerSpan = screen.getByText('03:45');
    expect(timerSpan).not.toBeNull();
  });
});
