import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CallView, CallViewState } from '../CallView.tsx';
import { buildCall } from '../../../../__tests__/builders.ts';
import { useCurrentUserStore } from '../../../../states/stores.ts';

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

  it('renders clean visual state on screen sharing mode', () => {
    render(<CallView {...defaultProps({ isScreenSharing: true })} />);

    const shareAlert = screen.getByText(/Sua Tela está Sendo Compartilhada/i);
    expect(shareAlert).toBeDefined();
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
