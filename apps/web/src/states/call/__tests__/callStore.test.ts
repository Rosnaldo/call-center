import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../services/online-users-ws.ts', () => ({
  notifyWsIncomingCall: vi.fn(),
  notifyWsCancelCall: vi.fn(),
}));

vi.mock('../../../utils/helpers.ts', () => ({
  generateMeetUrl: vi.fn(() => 'https://meet.test/room'),
  playNotificationChime: vi.fn(),
}));

vi.mock('../../../services/call.ts', () => ({
  createIamCall: vi.fn().mockResolvedValue({}),
}));

import { useCallStore } from '../store.ts';
import { useOnlineUsersStore } from '../../online-users/store.ts';
import { buildCall, buildOnlineUserState } from '../../../__tests__/builders.ts';
import { notifyWsIncomingCall, notifyWsCancelCall } from '../../../services/online-users-ws.ts';
import { playNotificationChime } from '../../../utils/helpers.ts';
import { createIamCall } from '../../../services/call.ts';

const notifyIncoming = vi.mocked(notifyWsIncomingCall);
const notifyCancel = vi.mocked(notifyWsCancelCall);
const chime = vi.mocked(playNotificationChime);
const iamCreate = vi.mocked(createIamCall);

beforeEach(() => {
  useCallStore.setState({ call: null });
  useOnlineUsersStore.setState({ users: [] });
  vi.clearAllMocks();
});

// ─── initiateCall ────────────────────────────────────────────────────────────

describe('initiateCall', () => {
  it('creates a call with status awaiting-answer and wasAnswered false', () => {
    const customer = buildOnlineUserState({ role: 'customer', tokens: 5 });
    const attendant = buildOnlineUserState({ role: 'attendant' });
    useOnlineUsersStore.setState({ users: [customer, attendant] });

    useCallStore.getState().initiateCall(customer.id, attendant.id);

    const call = useCallStore.getState().call;
    expect(call).not.toBeNull();
    expect(call?.status).toBe('awaiting-answer');
    expect(call?.wasAnswered).toBe(false);
  });

  it('sets customerId and attendantId correctly', () => {
    const customer = buildOnlineUserState({ role: 'customer', tokens: 5 });
    const attendant = buildOnlineUserState({ role: 'attendant' });
    useOnlineUsersStore.setState({ users: [customer, attendant] });

    useCallStore.getState().initiateCall(customer.id, attendant.id);

    const call = useCallStore.getState().call;
    expect(call?.customerId).toBe(customer.id);
    expect(call?.attendantId).toBe(attendant.id);
  });

  it('notifies the attendant via websocket', () => {
    const customer = buildOnlineUserState({ role: 'customer', tokens: 5 });
    const attendant = buildOnlineUserState({ role: 'attendant' });
    useOnlineUsersStore.setState({ users: [customer, attendant] });

    useCallStore.getState().initiateCall(customer.id, attendant.id);

    const call = useCallStore.getState().call!;
    expect(notifyIncoming).toHaveBeenCalledOnce();
    expect(notifyIncoming).toHaveBeenCalledWith(attendant.id, call);
  });

  it('does nothing when customer has no tokens', () => {
    const customer = buildOnlineUserState({ role: 'customer', tokens: 0 });
    const attendant = buildOnlineUserState({ role: 'attendant' });
    useOnlineUsersStore.setState({ users: [customer, attendant] });

    useCallStore.getState().initiateCall(customer.id, attendant.id);

    expect(useCallStore.getState().call).toBeNull();
    expect(notifyIncoming).not.toHaveBeenCalled();
  });

  it('does nothing when the attendant is already in a call', () => {
    const customer = buildOnlineUserState({ role: 'customer', tokens: 5 });
    const attendant = buildOnlineUserState({ role: 'attendant' });
    const existingCall = buildCall({ attendantId: attendant.id, status: 'active' });
    useOnlineUsersStore.setState({ users: [customer, attendant] });
    useCallStore.setState({ call: existingCall });

    useCallStore.getState().initiateCall(customer.id, attendant.id);

    expect(useCallStore.getState().call).toBe(existingCall);
    expect(notifyIncoming).not.toHaveBeenCalled();
  });
});

// ─── receiveIncomingCall ─────────────────────────────────────────────────────

describe('receiveIncomingCall', () => {
  it('stores the received call in state', () => {
    const { startedAt: _s, interruptedAt: _i, ...payload } = buildCall({
      status: 'awaiting-answer',
      wasAnswered: false,
    });
    const customer = buildOnlineUserState({ id: payload.customerId });
    useOnlineUsersStore.setState({ users: [customer] });

    useCallStore.getState().receiveIncomingCall(payload);

    expect(useCallStore.getState().call?.id).toBe(payload.id);
    expect(useCallStore.getState().call?.status).toBe('awaiting-answer');
  });

  it('sets the customer status to in-call', () => {
    const customer = buildOnlineUserState({ role: 'customer', status: 'idle' });
    const { startedAt: _s, interruptedAt: _i, ...payload } = buildCall({
      customerId: customer.id,
      status: 'awaiting-answer',
      wasAnswered: false,
    });
    useOnlineUsersStore.setState({ users: [customer] });

    useCallStore.getState().receiveIncomingCall(payload);

    const updated = useOnlineUsersStore.getState().users.find(u => u.id === customer.id);
    expect(updated?.status).toBe('in-call');
  });

  it('plays the notification chime', () => {
    const customer = buildOnlineUserState();
    const { startedAt: _s, interruptedAt: _i, ...payload } = buildCall({
      customerId: customer.id,
      status: 'awaiting-answer',
      wasAnswered: false,
    });
    useOnlineUsersStore.setState({ users: [customer] });

    useCallStore.getState().receiveIncomingCall(payload);

    expect(chime).toHaveBeenCalledOnce();
  });
});

// ─── cancelCall ──────────────────────────────────────────────────────────────

describe('cancelCall', () => {
  it('removes the call from state when not yet answered', () => {
    const customer = buildOnlineUserState({ status: 'in-call' });
    const call = buildCall({ customerId: customer.id, status: 'awaiting-answer', wasAnswered: false });
    useOnlineUsersStore.setState({ users: [customer] });
    useCallStore.setState({ call });

    useCallStore.getState().cancelCall(call.id);

    expect(useCallStore.getState().call).toBeNull();
  });

  it('resets the customer status to idle', () => {
    const customer = buildOnlineUserState({ status: 'in-call' });
    const call = buildCall({ customerId: customer.id, status: 'awaiting-answer', wasAnswered: false });
    useOnlineUsersStore.setState({ users: [customer] });
    useCallStore.setState({ call });

    useCallStore.getState().cancelCall(call.id);

    const updated = useOnlineUsersStore.getState().users.find(u => u.id === customer.id);
    expect(updated?.status).toBe('idle');
  });

  it('notifies the attendant via websocket', () => {
    const customer = buildOnlineUserState({ status: 'in-call' });
    const attendant = buildOnlineUserState({ role: 'attendant' });
    const call = buildCall({
      customerId: customer.id,
      attendantId: attendant.id,
      status: 'awaiting-answer',
      wasAnswered: false,
    });
    useOnlineUsersStore.setState({ users: [customer, attendant] });
    useCallStore.setState({ call });

    useCallStore.getState().cancelCall(call.id);

    expect(notifyCancel).toHaveBeenCalledOnce();
    expect(notifyCancel).toHaveBeenCalledWith(attendant.id, call.id);
  });

  it('is a no-op when the call was already answered', () => {
    const customer = buildOnlineUserState({ status: 'in-call' });
    const call = buildCall({ customerId: customer.id, status: 'active', wasAnswered: true });
    useOnlineUsersStore.setState({ users: [customer] });
    useCallStore.setState({ call });

    useCallStore.getState().cancelCall(call.id);

    expect(useCallStore.getState().call).toBe(call);
    expect(notifyCancel).not.toHaveBeenCalled();
  });

  it('is a no-op when the call id does not match', () => {
    const call = buildCall({ status: 'awaiting-answer', wasAnswered: false });
    useCallStore.setState({ call });

    useCallStore.getState().cancelCall('non-existent-id');

    expect(useCallStore.getState().call).toBe(call);
    expect(notifyCancel).not.toHaveBeenCalled();
  });
});

// ─── updateCall — wasAnswered ─────────────────────────────────────────────────

describe('updateCall — wasAnswered', () => {
  it('sets wasAnswered to true when transitioning from awaiting-answer to active', () => {
    const attendant = buildOnlineUserState({ role: 'attendant' });
    const call = buildCall({
      attendantId: attendant.id,
      status: 'awaiting-answer',
      wasAnswered: false,
    });
    useOnlineUsersStore.setState({ users: [attendant] });
    useCallStore.setState({ call });

    useCallStore.getState().updateCall(call.id, { status: 'active' });

    expect(useCallStore.getState().call?.wasAnswered).toBe(true);
  });

  it('sets attendant status to in-call when the call is answered', () => {
    const attendant = buildOnlineUserState({ role: 'attendant', status: 'idle' });
    const call = buildCall({ attendantId: attendant.id, status: 'awaiting-answer', wasAnswered: false });
    useOnlineUsersStore.setState({ users: [attendant] });
    useCallStore.setState({ call });

    useCallStore.getState().updateCall(call.id, { status: 'active' });

    const updated = useOnlineUsersStore.getState().users.find(u => u.id === attendant.id);
    expect(updated?.status).toBe('in-call');
  });

  it('cannot set wasAnswered back to false once it is true', () => {
    const call = buildCall({ status: 'active', wasAnswered: true });
    useCallStore.setState({ call });

    useCallStore.getState().updateCall(call.id, { wasAnswered: false } as any);

    expect(useCallStore.getState().call?.wasAnswered).toBe(true);
  });

  it('preserves wasAnswered true across unrelated updates', () => {
    const call = buildCall({ status: 'active', wasAnswered: true });
    useCallStore.setState({ call });

    useCallStore.getState().updateCall(call.id, { status: 'call-interrupteded' });

    expect(useCallStore.getState().call?.wasAnswered).toBe(true);
  });
});

// ─── updateCall — IAM persistence ────────────────────────────────────────────

describe('updateCall — IAM persistence', () => {
  it('calls createIamCall when transitioning from awaiting-answer to active', () => {
    const attendant = buildOnlineUserState({ role: 'attendant' });
    const call = buildCall({ attendantId: attendant.id, status: 'awaiting-answer', wasAnswered: false });
    useOnlineUsersStore.setState({ users: [attendant] });
    useCallStore.setState({ call });

    useCallStore.getState().updateCall(call.id, { status: 'active' });

    expect(iamCreate).toHaveBeenCalledOnce();
    expect(iamCreate).toHaveBeenCalledWith(expect.objectContaining({
      customerId: call.customerId,
      attendantId: call.attendantId,
      roomUrl: call.roomUrl,
    }));
  });

  it('does not call createIamCall for unrelated status updates', () => {
    const call = buildCall({ status: 'active', wasAnswered: true });
    useCallStore.setState({ call });

    useCallStore.getState().updateCall(call.id, { status: 'call-interrupteded' });

    expect(iamCreate).not.toHaveBeenCalled();
  });

  it('does not call createIamCall when reconnecting from interrupted to active', () => {
    const call = buildCall({ status: 'call-interrupteded', wasAnswered: true });
    useCallStore.setState({ call });

    useCallStore.getState().updateCall(call.id, { status: 'active' });

    expect(iamCreate).not.toHaveBeenCalled();
  });
});
