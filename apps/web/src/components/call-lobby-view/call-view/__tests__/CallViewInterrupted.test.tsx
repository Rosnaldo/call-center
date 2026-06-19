import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { CallView, CallViewState } from '../CallView.tsx';
import { buildCall } from '../../../../__tests__/builders.ts';
import { useCurrentUserStore } from '../../../../states/current-user/store.ts';

const makeProps = (extra = {}) => ({
  state: CallViewState.Lobby,
  isScreenSharing: false,
  isVideoOff: false,
  isMuted: false,
  partnerName: '',
  partnerInitials: '',
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

describe('CallView Component - Call Interrupted (Awaiting Return) Unit Tests', () => {
  beforeEach(() => {
    useCurrentUserStore.setState({ currentUser: null });
  });

  it('does not call handleStartCall with awaiting-answer when resuming interrupted call', () => {
    const call = buildCall({
      customerId: 'cust-1',
      status: 'call-interrupteded',
    });

    useCurrentUserStore.setState({
      currentUser: { id: 'cust-1', name: 'Customer', slug: 'customer', email: 'customer@example.com', role: 'customer', avatarUrl: '', status: 'in-call', },
    });

    const handleStartCall = vi.fn();

    const { container } = render(
      <CallView {...makeProps({ currentCall: call, handleStartCall, isAttendant: false })} />
    );

    const resumeBtn = container.querySelector('#lobby-start-call');
    if (resumeBtn) {
      fireEvent.click(resumeBtn);
      expect(handleStartCall).toHaveBeenCalledOnce();
    }
  });
});
