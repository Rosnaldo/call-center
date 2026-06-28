import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CallView, CallViewState } from '../CallView.tsx';
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

const makeProps = (extra = {}) => ({
  state: CallViewState.None,
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
});
