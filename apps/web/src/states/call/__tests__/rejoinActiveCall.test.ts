import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildOnlineUserState, buildCall } from '../../../__tests__/builders.ts';
import { useCurrentUserStore, useCallStore, useCallViewStore } from '../../stores.ts';
import * as callsService from '../../../services/api/calls.ts';

const currentUser = buildOnlineUserState({ id: 'user-rejoin-1', name: 'Rejoin User', role: 'customer' });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('rejoinActiveCall action', () => {
  beforeEach(() => {
    useCurrentUserStore.setState({ currentUser });
    useCallStore.setState({ call: null });
    useCallViewStore.setState({ viewState: 'lobby', selectedAttendantId: null });
  });

  it('does nothing when there is no logged-in user', async () => {
    useCurrentUserStore.setState({ currentUser: null });
    vi.spyOn(callsService, 'fetchCallByUser');

    await useCallStore.getState().rejoinActiveCall();

    expect(callsService.fetchCallByUser).not.toHaveBeenCalled();
    expect(useCallStore.getState().call).toBeNull();
  });

  it('does nothing when the user has no active call', async () => {
    vi.spyOn(callsService, 'fetchCallByUser').mockResolvedValue(null);

    await useCallStore.getState().rejoinActiveCall();

    expect(callsService.fetchCallByUser).toHaveBeenCalledWith(currentUser.id);
    expect(useCallStore.getState().call).toBeNull();
    expect(useCallViewStore.getState().viewState).toBe('lobby');
  });

  it('restores the call and switches the view to in-call when an active call exists', async () => {
    const call = buildCall({ customerId: currentUser.id, roomName: 'customer-slug--attendant-slug' });
    vi.spyOn(callsService, 'fetchCallByUser').mockResolvedValue(call);

    await useCallStore.getState().rejoinActiveCall();

    expect(useCallStore.getState().call).toEqual(call);
    expect(useCallViewStore.getState().viewState).toBe('in-call');
  });
});
