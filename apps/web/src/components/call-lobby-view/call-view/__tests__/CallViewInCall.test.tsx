import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CallView, CallViewState } from '../CallView.tsx';
import { buildCall } from '../../../../__tests__/builders.ts';
import { useCurrentUserStore, useCallViewStore } from '../../../../states/stores.ts';

vi.mock('../../../../providers/devices.tsx', () => ({
  useDevicesContext: () => ({
    detectedCameras: [], detectedMicrophones: [], detectedSpeakers: [],
    camera: '', microphone: '', speaker: '',
    setCamera: vi.fn(), setMicrophone: vi.fn(), setSpeaker: vi.fn(),
    cameraPermission: 'prompt' as const, micPermission: 'prompt' as const,
    requestCamera: vi.fn(), requestMicrophone: vi.fn(),
    cameraOn: false, microphoneOn: false,
    toggleCameraDailyco: vi.fn(), toggleMicrophoneDailyco: vi.fn(),
  }),
  DevicesProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('../../../../hooks/useMediaTest.ts', () => ({
  useMediaTest: () => ({ videoRef: { current: null }, micLevel: 0, startTest: vi.fn(), stopTest: vi.fn() }),
}));
vi.mock('../../../../hooks/useSyncEnabledDevices.ts', () => ({ useSyncEnabledDevices: vi.fn() }));
vi.mock('@daily-co/daily-react', () => ({
  useScreenShare: () => ({ isSharingScreen: false, screens: [], startScreenShare: vi.fn(), stopScreenShare: vi.fn() }),
  useParticipantIds: () => ['remote-1'],
  useVideoTrack: () => ({ track: null, isOff: true }),
  useAudioTrack: () => ({ track: null, isOff: true }),
  useMediaTrack: () => ({ track: null, isOff: true, persistentTrack: null }),
  useDailyEvent: vi.fn(),
}));

const defaultProps = (overrides = {}) => ({
  state: CallViewState.InCall,
  isScreenSharing: false,
  isVideoOff: false,
  isMuted: false,
  partnerName: 'John Doe',
  partnerInitials: 'JD',
  setIsMuted: vi.fn(),
  setIsVideoOff: vi.fn(),
  onToggleScreenShare: vi.fn(),
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
    // CallViewState.InCall only ever renders in the tab holding the real
    // socket now (see actions.ts's syncActiveCall/updateCall) —
    // CallFooter's buttons are disabled otherwise.
    useCallViewStore.setState({ isLeader: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders active video viewport in-call', () => {
    const { container } = render(<CallView {...defaultProps()} />);
    expect(container.querySelector('#viewport-active-video')).not.toBeNull();
  });

  it('calls onToggleScreenShare when screen share button is clicked', () => {
    const onToggleScreenShare = vi.fn();
    const { container } = render(
      <CallView {...defaultProps({ onToggleScreenShare })} />
    );

    const screenToggle = container.querySelector('#lobby-screenshare-toggle');
    expect(screenToggle).not.toBeNull();
    if (screenToggle) {
      fireEvent.click(screenToggle);
      expect(onToggleScreenShare).toHaveBeenCalled();
    }
  });

  it('renders timer text when provided', () => {
    render(<CallView {...defaultProps({ timerText: '03:45' })} />);

    const timerSpan = screen.getByText('03:45');
    expect(timerSpan).not.toBeNull();
  });

  // The call (and its timer) is shared across every open tab via update_call,
  // but only the tab actually showing CallViewState.InCall should display
  // it — the others just show "active in another tab" (see CallViewport.tsx).
  it('does not render timer text in in-call-in-another', () => {
    render(<CallView {...defaultProps({ state: CallViewState.InCallInAnother, timerText: '03:45' })} />);

    expect(screen.queryByText('03:45')).toBeNull();
  });
});
