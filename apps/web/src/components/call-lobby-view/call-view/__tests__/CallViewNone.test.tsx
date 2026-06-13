import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CallView, CallViewState } from '../CallView.tsx';
import { useCurrentUserStore } from '../../../../states/current-user/store.ts';

const makeProps = (extra = {}) => ({
  state: CallViewState.None,
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

describe('CallView Component - none (Idle / No Call Chosen)', () => {
  beforeEach(() => {
    useCurrentUserStore.setState({ currentUser: null });
  });

  it('renders placeholder screen indicating no call is selected', () => {
    const { container } = render(<CallView {...makeProps()} />);

    const noneMessage = screen.getByText(/Nenhum Atendimento Selecionado/i);
    expect(noneMessage).toBeDefined();

    const viewportNone = container.querySelector('#viewport-none');
    expect(viewportNone).not.toBeNull();

    const startButton = container.querySelector('#lobby-start-call');
    const endButton = container.querySelector('#lobby-end-call');
    expect(startButton).toBeNull();
    expect(endButton).toBeNull();
  });

  it('calls setIsMuted when mic toggle is clicked', () => {
    const setIsMuted = vi.fn();
    const { container } = render(<CallView {...makeProps({ setIsMuted })} />);

    const micButton = container.querySelector('#lobby-mic-toggle');
    expect(micButton).not.toBeNull();
    if (micButton) {
      fireEvent.click(micButton);
      expect(setIsMuted).toHaveBeenCalled();
    }
  });

  it('calls setIsVideoOff when camera toggle is clicked', () => {
    const setIsVideoOff = vi.fn();
    const { container } = render(<CallView {...makeProps({ setIsVideoOff })} />);

    const camButton = container.querySelector('#lobby-cam-toggle');
    expect(camButton).not.toBeNull();
    if (camButton) {
      fireEvent.click(camButton);
      expect(setIsVideoOff).toHaveBeenCalled();
    }
  });
});
