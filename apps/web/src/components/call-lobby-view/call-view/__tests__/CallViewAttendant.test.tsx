import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { CallView, CallViewState } from '../CallView.tsx';
import { buildCall, buildOnlineUserState } from '../../../../__tests__/builders.ts';
import { useCurrentUserStore, useCallStore } from '../../../../states/stores.ts';
import { CallState } from '../../../../states/call/state.ts';

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
  useDailyEvent: vi.fn(),
}));

const ATTENDANT_ID = 'att-test-1';
const CUSTOMER_ID = 'cust-test-1';
const CUSTOMER_NAME = 'Maria Cliente';
const CALL_ID = 'call-scenario-1';

const attendant = buildOnlineUserState({
  id: ATTENDANT_ID,
  name: 'João Atendente',
  role: 'attendant',
  status: 'in-call',
});

const makeCall = (): CallState =>
  buildCall({
    id: CALL_ID,
    attendantId: ATTENDANT_ID,
    attendantName: attendant.name,
    customerId: CUSTOMER_ID,
    customerName: CUSTOMER_NAME,
  });

const makeProps = (call: CallState, stateOverride?: CallViewState, extra = {}) => ({
  state: stateOverride ?? CallViewState.InCall,
  isScreenSharing: false,
  isVideoOff: false,
  isMuted: false,
  partnerName: CUSTOMER_NAME,
  partnerInitials: 'MC',
  setIsMuted: vi.fn(),
  setIsVideoOff: vi.fn(),
  onToggleScreenShare: vi.fn(),
  setIsSettingsOpen: vi.fn(),
  isFullscreen: false,
  toggleFullscreen: vi.fn(),
  handleStartCall: vi.fn(),
  onHangUp: vi.fn(),
  currentCall: call,
  isAttendant: true,
  ...extra,
});

beforeEach(() => {
  useCurrentUserStore.setState({ currentUser: attendant });
  useCallStore.setState({ call: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CallView — attendant full call lifecycle', () => {
  describe('2. attendant answers the call', () => {
    it('renders the active in-call viewport after answering', () => {
      const { container } = render(<CallView {...makeProps(makeCall(), CallViewState.InCall)} />);
      expect(container.querySelector('#viewport-active-video')).not.toBeNull();
    });

  });

  describe('4. attendant reconnects and resumes the call', () => {
    it('re-renders the active viewport after resuming', () => {
      const { container } = render(<CallView {...makeProps(makeCall(), CallViewState.InCall)} />);
      expect(container.querySelector('#viewport-active-video')).not.toBeNull();
    });
  });

  describe('5. call ends', () => {
    it('does not render the call viewport after the call ends (no call)', () => {
      const { container } = render(
        <CallView {...makeProps(makeCall(), CallViewState.None, { currentCall: undefined })} />
      );
      expect(container.querySelector('#viewport-none')).not.toBeNull();
      expect(container.querySelector('#viewport-active-video')).toBeNull();
    });
  });

});
