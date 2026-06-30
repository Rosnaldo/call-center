import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildOnlineUserState } from '../../__tests__/builders.ts';
import { useCurrentUserStore, useOnlineUsersStore, useCallStore, useCallViewStore, useIncomingCallStore } from '../stores.ts';
import { Properties } from '../../properties.ts';
import * as incomingCallsService from '../../services/api/incoming-calls.ts';
import { mytoast } from '../../components/toast.tsx';

const ATTENDANT_ID = 'att-send-incoming-call-test-1';
const CUSTOMER_ID = 'cust-send-incoming-call-test-1';

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

afterEach(() => {
  vi.restoreAllMocks();
  Properties.reset();
});

describe('sendIncomingCall action', () => {
  beforeEach(() => {
    Properties.override({ isSimulation: false });
    vi.spyOn(incomingCallsService, 'sendIncomingCall').mockResolvedValue(undefined);
    vi.spyOn(mytoast, 'error').mockImplementation(() => '');

    useCurrentUserStore.setState({ currentUser: customer });
    useOnlineUsersStore.setState({ users: [attendant] });
    useCallStore.setState({ call: null });
    useCallViewStore.setState({ viewState: 'lobby', selectedAttendantId: ATTENDANT_ID });
    useIncomingCallStore.setState({ incomingCall: null });
  });

  it('POST /incoming-calls/send é chamado com customerId e attendantId corretos', () => {
    useIncomingCallStore.getState().sendIncomingCall(CUSTOMER_ID, ATTENDANT_ID);

    expect(incomingCallsService.sendIncomingCall).toHaveBeenCalledWith(CUSTOMER_ID, ATTENDANT_ID);
    expect(mytoast.error).not.toHaveBeenCalled();
  });

  it('bloqueia request e exibe toast se customer não tem tokens', () => {
    useCurrentUserStore.setState({ currentUser: { ...customer, tokens: 0 } });

    useIncomingCallStore.getState().sendIncomingCall(CUSTOMER_ID, ATTENDANT_ID);

    expect(incomingCallsService.sendIncomingCall).not.toHaveBeenCalled();
    expect(mytoast.error).toHaveBeenCalledOnce();
  });

  it('bloqueia request e exibe toast se o atendente não está idle', () => {
    useOnlineUsersStore.setState({ users: [{ ...attendant, status: 'occupied' }] });

    useIncomingCallStore.getState().sendIncomingCall(CUSTOMER_ID, ATTENDANT_ID);

    expect(incomingCallsService.sendIncomingCall).not.toHaveBeenCalled();
    expect(mytoast.error).toHaveBeenCalledOnce();
  });

  it('bloqueia request e exibe toast se currentUser não bate com customerId', () => {
    useCurrentUserStore.setState({ currentUser: { ...customer, id: 'outro-id' } });

    useIncomingCallStore.getState().sendIncomingCall(CUSTOMER_ID, ATTENDANT_ID);

    expect(incomingCallsService.sendIncomingCall).not.toHaveBeenCalled();
    expect(mytoast.error).toHaveBeenCalledOnce();
  });
});
