import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CallView, CallViewState } from '../CallView.tsx';
import { buildCall, buildOnlineUserState } from '../../../../__tests__/builders.ts';
import { useCurrentUserStore, useOnlineUsersStore, useCallStore, useCallViewStore, useIncomingCallStore } from '../../../../states/stores.ts';
import { initialCallViewState } from '../../../../states/call-view/state.ts';

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
}));

const ATTENDANT_ID = 'att-attendant-test-1';
const CUSTOMER_ID = 'cust-attendant-test-1';

const attendant = buildOnlineUserState({
  id: ATTENDANT_ID,
  name: 'Maria Atendente',
  role: 'attendant',
  status: 'idle',
});

const customer = buildOnlineUserState({
  id: CUSTOMER_ID,
  name: 'Carlos Cliente',
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
  useCurrentUserStore.setState({ currentUser: attendant });
  useOnlineUsersStore.setState({ users: [customer, attendant] });
  useCallStore.setState({ call: null });
  useCallViewStore.setState({ ...initialCallViewState });
  useIncomingCallStore.setState({ incomingCall: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Attendant - CallView state machine', () => {
  describe('none — sem chamada', () => {
    beforeEach(() => {
      useCallViewStore.setState({ viewState: 'none', selectedAttendantId: null });
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

    it('footer não exibe botões de chamada', () => {
      const { container } = render(<CallView {...makeProps(CallViewState.None)} />);
      expect(container.querySelector('#lobby-accept-call')).toBeNull();
      expect(container.querySelector('#lobby-end-call')).toBeNull();
    });
  });

  describe('lobby — renderiza igual a none para atendente', () => {
    beforeEach(() => {
      useCallViewStore.setState({ viewState: 'lobby', selectedAttendantId: null });
    });

    it('viewport exibe nenhum atendimento selecionado', () => {
      const { container } = render(<CallView {...makeProps(CallViewState.None)} />);
      expect(container.querySelector('#viewport-none')).not.toBeNull();
    });

    it('footer exibe microfone, câmera e configurações', () => {
      const { container } = render(<CallView {...makeProps(CallViewState.None)} />);
      expect(container.querySelector('#lobby-mic-toggle')).not.toBeNull();
      expect(container.querySelector('#lobby-cam-toggle')).not.toBeNull();
      expect(container.querySelector('#lobby-settings-toggle')).not.toBeNull();
    });
  });

  describe('awaiting-answer — recebendo chamada de cliente', () => {
    beforeEach(() => {
      useCallViewStore.setState({ viewState: 'awaiting-to-answer', selectedAttendantId: null });
      useIncomingCallStore.setState({ incomingCall: { customerId: CUSTOMER_ID, attendantId: ATTENDANT_ID, calledBy: 'customer' } });
    });

    it('viewport exibe nome do cliente e mensagem tentando ligar', () => {
      const { container } = render(<CallView {...makeProps(CallViewState.AwaitingToAnswer)} />);
      expect(container.querySelector('#viewport-awaiting-attendant')).not.toBeNull();
      expect(screen.getByText(new RegExp(`${customer.name}.*está ligando`, 'i'))).toBeDefined();
    });

    it('viewport exibe instrução para clicar em atender chamada', () => {
      const { container } = render(<CallView {...makeProps(CallViewState.AwaitingToAnswer)} />);
      const viewport = container.querySelector('#viewport-awaiting-attendant');
      expect(viewport?.textContent).toMatch(/Atender Chamada/i);
    });

    it('footer exibe botão atender chamada', () => {
      const { container } = render(<CallView {...makeProps(CallViewState.AwaitingToAnswer)} />);
      expect(container.querySelector('#lobby-accept-call')).not.toBeNull();
    });

    it('footer exibe botão cancel', () => {
      const { container } = render(<CallView {...makeProps(CallViewState.Lobby)} />);
      expect(container.querySelector('#lobby-cancel-call')).not.toBeNull();
    });

    it('footer exibe microfone e câmera', () => {
      const { container } = render(<CallView {...makeProps(CallViewState.Lobby)} />);
      expect(container.querySelector('#lobby-mic-toggle')).not.toBeNull();
      expect(container.querySelector('#lobby-cam-toggle')).not.toBeNull();
    });
  });

  describe('in-call — ligação atendida', () => {
    const call = buildCall({
      customerId: CUSTOMER_ID,
      customerName: customer.name,
      attendantId: ATTENDANT_ID,
    });

    beforeEach(() => {
      useCallViewStore.setState({ viewState: 'in-call', selectedAttendantId: null });
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
