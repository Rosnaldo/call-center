import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { CallView, CallViewState } from '../CallView.tsx';
import { useCurrentUserStore } from '../../../../states/stores.ts';
import { buildUser } from '../../../../__tests__/builders.ts';

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

const makeProps = (extra = {}) => ({
  state: CallViewState.Lobby,
  isScreenSharing: false,
  isVideoOff: false,
  isMuted: false,
  partnerName: '',
  partnerInitials: '',
  setIsMuted: vi.fn(),
  setIsVideoOff: vi.fn(),
  onToggleScreenShare: vi.fn(),
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
      currentUser: buildUser({ _id: 'cust-1', firstName: 'Customer', lastName: '', slug: 'customer', email: 'customer@example.com', role: 'customer' }),
    });

    const { container } = render(
      <CallView {...makeProps({ currentCall: undefined, isAttendant: false })} />
    );

    expect(container.querySelector('#viewport-none')).not.toBeNull();
  });
});
