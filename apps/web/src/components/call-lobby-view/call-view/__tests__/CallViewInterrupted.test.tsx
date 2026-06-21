import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { CallView, CallViewState } from '../CallView.tsx';
import { useCurrentUserStore } from '../../../../states/stores.ts';

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

  it('renders lobby state when no active call', () => {
    useCurrentUserStore.setState({
      currentUser: { id: 'cust-1', name: 'Customer', slug: 'customer', email: 'customer@example.com', role: 'customer', avatarUrl: '', status: 'idle', },
    });

    const { container } = render(
      <CallView {...makeProps({ currentCall: undefined, isAttendant: false })} />
    );

    expect(container.querySelector('#viewport-none')).not.toBeNull();
  });
});
