import { describe, it, expect, beforeEach } from 'vitest';
import { openPublicAttendants } from './public-attendants';
import type { ISseSource } from './init-call-events';
import { useOnlineUsersStore } from '../../states/stores';

class FakeSource implements ISseSource {
  onmessage: ISseSource['onmessage'] = null;
  closed = false;
  url = '';
  close() { this.closed = true; }
  receive(msg: unknown) { this.onmessage?.({ data: JSON.stringify(msg) }); }
}

describe('openPublicAttendants', () => {
  let source: FakeSource;
  beforeEach(() => {
    useOnlineUsersStore.getState().setUsers([]);
    source = new FakeSource();
  });

  const open = () => openPublicAttendants(useOnlineUsersStore, (url) => {
    source.url = url;
    return source;
  });

  it('opens the public stream and stores the attendants', () => {
    open();
    expect(source.url).toMatch(/\/public\/attendants\/stream$/);

    source.receive({
      event: 'update_online_attendants',
      data: { attendants: [{ id: 'a1', name: 'Ana Lima', role: 'attendant', status: 'idle' }] },
    });

    expect(useOnlineUsersStore.getState().users).toEqual([
      { id: 'a1', name: 'Ana Lima', role: 'attendant', status: 'idle', slug: '' },
    ]);
  });

  it('ignores other events and malformed frames', () => {
    open();
    source.receive({ event: 'update_online_users', data: { users: [{ id: 'x' }] } });
    source.onmessage?.({ data: '{not json' });
    expect(useOnlineUsersStore.getState().users).toEqual([]);
  });

  it('closes the stream and clears the list', () => {
    const close = open();
    source.receive({ event: 'update_online_attendants', data: { attendants: [{ id: 'a1', name: 'Ana', role: 'attendant', status: 'idle' }] } });

    close();

    expect(source.closed).toBe(true);
    expect(useOnlineUsersStore.getState().users).toEqual([]);
  });
});
