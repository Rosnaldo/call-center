import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../services/init-ws.ts', () => ({
  initWs: {
    notifyIncomingCall: vi.fn(),
    notifyCancelCall: vi.fn(),
  },
}));

vi.mock('../../../utils/helpers.ts', () => ({
  generateMeetUrl: vi.fn(() => 'https://meet.test/room'),
}));


import { useCallStore, useOnlineUsersStore } from '../../stores.ts';
import { buildCall } from '../../../__tests__/builders.ts';

beforeEach(() => {
  useCallStore.setState({ call: null });
  useOnlineUsersStore.setState({ users: [] });
  vi.clearAllMocks();
});

describe('updateCall', () => {
  it('updates call fields', () => {
    const call = buildCall();
    useCallStore.setState({ call });

    useCallStore.getState().updateCall(call.id, { roomName: 'new-room' });

    expect(useCallStore.getState().call?.roomName).toBe('new-room');
  });
});
