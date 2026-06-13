import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CallView, CallViewState } from '../CallView.tsx';
import { buildCall } from '../../../../__tests__/builders.ts';
import { useCurrentUserStore } from '../../../../states/current-user/store.ts';

const makeProps = (extra = {}) => ({
  state: CallViewState.Lobby,
  isScreenSharing: false,
  isVideoOff: false,
  isMuted: false,
  partnerName: 'Dr. Smith',
  partnerInitials: 'DS',
  setIsMuted: vi.fn(),
  setIsVideoOff: vi.fn(),
  setIsScreenSharing: vi.fn(),
  setIsSettingsOpen: vi.fn(),
  isFullscreen: false,
  toggleFullscreen: vi.fn(),
  handleStartCall: vi.fn(),
  onHangUp: vi.fn(),
  isAttendant: false,
  ...extra,
});

describe('CallView Component - lobby Unit Tests', () => {
  beforeEach(() => {
    useCurrentUserStore.setState({ currentUser: null });
  });

  it('renders local preview lobby with partner details and call control option', () => {
    const { container } = render(
      <CallView
        {...makeProps({ currentCall: buildCall({ attendantName: 'Dr. Smith' }) })}
      />
    );

    const heading = screen.getByText('Dr. Smith');
    expect(heading).toBeDefined();

    const viewportLobby = container.querySelector('#viewport-lobby');
    expect(viewportLobby).not.toBeNull();

    const startButton = container.querySelector('#lobby-start-call');
    expect(startButton).not.toBeNull();
  });

  it('calls handleStartCall when Call button is pressed', () => {
    const handleStartCall = vi.fn();
    const call = buildCall({ attendantName: 'Dr. Smith' });

    const { container } = render(
      <CallView {...makeProps({ currentCall: call, handleStartCall })} />
    );

    const startButton = container.querySelector('#lobby-start-call');
    expect(startButton).not.toBeNull();
    if (startButton) {
      fireEvent.click(startButton);
      expect(handleStartCall).toHaveBeenCalledOnce();
    }
  });
});
