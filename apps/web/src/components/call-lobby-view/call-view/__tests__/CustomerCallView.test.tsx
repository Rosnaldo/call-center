import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CallView, CallViewState } from '../CallView.tsx';
import { buildCall, buildOnlineUserState } from '../../../../__tests__/builders.ts';
import { renderHook } from '@testing-library/react';
import { useCurrentUserStore, useOnlineUsersStore, useCallStore, useCallViewStore, useIncomingCallStore } from '../../../../states/stores.ts';
import { initialCallViewState } from '../../../../states/call-view/state.ts';
import { useCallViewState } from '../../../../hooks/useCallViewState.ts';

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

const ATTENDANT_ID = 'att-customer-test-1';
const CUSTOMER_ID = 'cust-customer-test-1';

const attendant = buildOnlineUserState({
  id: ATTENDANT_ID,
  name: 'João Atendente',
  role: 'attendant',
  status: 'idle',
});

const customer = buildOnlineUserState({
  id: CUSTOMER_ID,
  role: 'customer',
  tokens: 5,
  status: 'idle',
});

const makeProps = (state: CallViewState, extra = {}) => ({
  state,
  isScreenSharing: false,
  isVideoOff: false,
  isMuted: false,
  setIsMuted: vi.fn(),
  setIsVideoOff: vi.fn(),
  onToggleScreenShare: vi.fn(),
  setIsSettingsOpen: vi.fn(),
  isFullscreen: false,
  toggleFullscreen: vi.fn(),
  ...extra,
});

beforeEach(() => {
  useCurrentUserStore.setState({ currentUser: customer });
  useOnlineUsersStore.setState({ users: [customer, attendant] });
  useCallStore.setState({ call: null });
  useCallViewStore.setState({ ...initialCallViewState });
  useIncomingCallStore.setState({ incomingCall: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Customer - CallView state machine', () => {
  describe('none — nenhum atendente selecionado', () => {
    beforeEach(() => {
      useCallViewStore.setState({ selectedAttendantId: null });
    });

    it('viewport exibe nenhum atendimento selecionado', () => {
      const { container } = render(<CallView {...makeProps(CallViewState.None)} />);
      expect(container.querySelector('#viewport-none')).not.toBeNull();
      expect(screen.getByText(/Nenhum Atendimento Selecionado/i)).toBeDefined();
    });

    it('footer exibe microfone, câmera e configurações', () => {
      const { container } = render(<CallView {...makeProps(CallViewState.None)} />);
      expect(container.querySelector('#lobby-mic-toggle')).not.toBeNull();
      expect(container.querySelector('#lobby-cam-toggle')).not.toBeNull();
      expect(container.querySelector('#lobby-settings-toggle')).not.toBeNull();
    });

    it('footer não exibe botão de chamada', () => {
      const { container } = render(<CallView {...makeProps(CallViewState.None)} />);
      expect(container.querySelector('#lobby-start-call')).toBeNull();
    });
  });

  describe('lobby — atendente selecionado', () => {
    beforeEach(() => {
      useCallViewStore.setState({ selectedAttendantId: ATTENDANT_ID });
    });

    it('selectAttendant muda viewState para lobby', () => {
      useCallViewStore.setState({ selectedAttendantId: null });
      useCallViewStore.getState().selectAttendant(ATTENDANT_ID);

      const { result } = renderHook(() => useCallViewState());
      expect(result.current).toBe('lobby');
      expect(useCallViewStore.getState().selectedAttendantId).toBe(ATTENDANT_ID);
    });

    it('viewport exibe avatar e nome do atendente selecionado', () => {
      const { container } = render(<CallView {...makeProps(CallViewState.Lobby)} />);
      expect(container.querySelector('#viewport-lobby')).not.toBeNull();
      expect(screen.getByText(attendant.name)).toBeDefined();
    });

    it('footer exibe botão call', () => {
      const { container } = render(<CallView {...makeProps(CallViewState.Lobby)} />);
      expect(container.querySelector('#lobby-start-call')).not.toBeNull();
    });

    it('footer exibe microfone e câmera', () => {
      const { container } = render(<CallView {...makeProps(CallViewState.Lobby)} />);
      expect(container.querySelector('#lobby-mic-toggle')).not.toBeNull();
      expect(container.querySelector('#lobby-cam-toggle')).not.toBeNull();
    });
  });

  describe('awaiting-answer — aguardando atendente atender', () => {
    beforeEach(() => {
      useCallViewStore.setState({ selectedAttendantId: ATTENDANT_ID });
      useIncomingCallStore.setState({ incomingCall: { customerId: CUSTOMER_ID, attendantId: ATTENDANT_ID, calledBy: 'customer' } });
    });

    it('viewport exibe mensagem aguardando com nome do atendente', () => {
      const { container } = render(<CallView {...makeProps(CallViewState.AwaitingAnswer)} />);
      expect(container.querySelector('#viewport-awaiting-answer')).not.toBeNull();
      expect(screen.getByText(new RegExp(`aguardando.*${attendant.name}`, 'i'))).toBeDefined();
    });

    it('footer exibe botão cancel', () => {
      const { container } = render(<CallView {...makeProps(CallViewState.AwaitingAnswer)} />);
      expect(container.querySelector('#lobby-cancel-call')).not.toBeNull();
    });

    it('footer não exibe botão call', () => {
      const { container } = render(<CallView {...makeProps(CallViewState.AwaitingAnswer)} />);
      expect(container.querySelector('#lobby-start-call')).toBeNull();
    });

    it('footer exibe microfone e câmera', () => {
      const { container } = render(<CallView {...makeProps(CallViewState.AwaitingAnswer)} />);
      expect(container.querySelector('#lobby-mic-toggle')).not.toBeNull();
      expect(container.querySelector('#lobby-cam-toggle')).not.toBeNull();
    });
  });

  describe('in-call — ligação atendida', () => {
    const call = buildCall({
      customerId: CUSTOMER_ID,
      attendantId: ATTENDANT_ID,
      attendantName: attendant.name,
    });

    beforeEach(() => {
      useCallViewStore.setState({ selectedAttendantId: ATTENDANT_ID, isLeader: true });
      useCallStore.setState({ call });
    });

    it('viewport exibe área de vídeo ativa', () => {
      const { container } = render(<CallView {...makeProps(CallViewState.InCall, { currentCall: call })} />);
      expect(container.querySelector('#viewport-active-video')).not.toBeNull();
    });

    it('footer exibe botão finish', () => {
      const { container } = render(<CallView {...makeProps(CallViewState.InCall, { currentCall: call })} />);
      expect(container.querySelector('#lobby-end-call')).not.toBeNull();
    });

    it('footer exibe microfone e câmera', () => {
      const { container } = render(<CallView {...makeProps(CallViewState.InCall, { currentCall: call })} />);
      expect(container.querySelector('#lobby-mic-toggle')).not.toBeNull();
      expect(container.querySelector('#lobby-cam-toggle')).not.toBeNull();
    });
  });

});
