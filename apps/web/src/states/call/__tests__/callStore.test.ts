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

// ─── updateCall — wasAnswered ─────────────────────────────────────────────────

describe('updateCall — wasAnswered', () => {
  it('cannot set wasAnswered back to false once it is true', () => {
    const call = buildCall({ status: 'active', wasAnswered: true });
    useCallStore.setState({ call });

    useCallStore.getState().updateCall(call.id, { wasAnswered: false } as any);

    expect(useCallStore.getState().call?.wasAnswered).toBe(true);
  });

  it('preserves wasAnswered true across unrelated updates', () => {
    const call = buildCall({ status: 'active', wasAnswered: true });
    useCallStore.setState({ call });

    useCallStore.getState().updateCall(call.id, { status: 'completed' });

    expect(useCallStore.getState().call?.wasAnswered).toBe(true);
  });
});
