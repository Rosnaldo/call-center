import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CallView, CallViewState } from '../CallView.tsx';
import { buildCall, buildOnlineUserState } from '../../../../__tests__/builders.ts';
import { useCurrentUserStore } from '../../../../states/current-user/store.ts';
import { useCallStore } from '../../../../states/call/store.ts';
import { CallState } from '../../../../states/call/state.ts';

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

const makeCall = (status: CallState['status']): CallState =>
  buildCall({
    id: CALL_ID,
    attendantId: ATTENDANT_ID,
    attendantName: attendant.name,
    customerId: CUSTOMER_ID,
    customerName: CUSTOMER_NAME,
    status,
  });

const makeProps = (call: CallState, stateOverride?: CallViewState, extra = {}) => ({
  state: stateOverride ?? (
    call.status === 'active' ? CallViewState.InCall :
    call.status === 'call-interrupteded' ? CallViewState.Lobby :
    CallViewState.Lobby
  ),
  isScreenSharing: false,
  isVideoOff: false,
  isMuted: false,
  partnerName: CUSTOMER_NAME,
  partnerInitials: 'MC',
  setIsMuted: vi.fn(),
  setIsVideoOff: vi.fn(),
  setIsScreenSharing: vi.fn(),
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
      const { container } = render(<CallView {...makeProps(makeCall('active'), CallViewState.InCall)} />);
      expect(container.querySelector('#viewport-active-video')).not.toBeNull();
    });

  });

  describe('3. attendant connection drops (call-interrupteded)', () => {
    it('shows "Conexão Interrompida" in the viewport', () => {
      render(<CallView {...makeProps(makeCall('call-interrupteded'))} />);
      expect(screen.getByText(/Conexão Interrompida/i)).toBeDefined();
    });

  });

  describe('4. attendant reconnects and resumes the call', () => {
    it('re-renders the active viewport after resuming', () => {
      const { container } = render(<CallView {...makeProps(makeCall('active'), CallViewState.InCall)} />);
      expect(container.querySelector('#viewport-active-video')).not.toBeNull();
    });
  });

  describe('5. call ends', () => {
    it('does not render the call viewport after the call ends (no call)', () => {
      const { container } = render(
        <CallView {...makeProps(makeCall('active'), CallViewState.None, { currentCall: undefined })} />
      );
      expect(container.querySelector('#viewport-none')).not.toBeNull();
      expect(container.querySelector('#viewport-active-video')).toBeNull();
    });
  });

});
