import type { IOnlineUser } from '@repo/shared-types';
import type { OnlineUsersStoreInstance } from '../../states/stores';
import type { ISseSource, SseSourceFactory } from './init-call-events';
import properties from '../../properties';

// What realtime's public stream sends of an attendant (see
// apps/realtime/src/routes/public_attendants.ts): no email, phone or tokens.
type PublicAttendant = Pick<IOnlineUser, 'id' | 'name' | 'avatarUrl' | 'role' | 'status'>;

type PublicAttendantsMessage = { event: 'update_online_attendants'; data: { attendants: PublicAttendant[] } };

const createSseSource: SseSourceFactory = (url) => new EventSource(url) as unknown as ISseSource;

// The attendants online, for visitors who aren't logged in (the home page).
// Logged-in users get the full list from init-realtime-events.ts instead.
// Returns a function that closes the stream.
export function openPublicAttendants(
    store: OnlineUsersStoreInstance,
    factory: SseSourceFactory = createSseSource,
): () => void {
    const base = properties.realtimeWsUrl.replace(/^ws/, 'http').replace(/\/+$/, '');
    const source = factory(`${base}/public/attendants/stream`);

    source.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data) as PublicAttendantsMessage;
            if (msg.event !== 'update_online_attendants') return;
            // The store holds full online users; the public stream has no slug.
            store.getState().setUsers(msg.data.attendants.map((attendant) => ({ ...attendant, slug: '' })));
        } catch {
            // malformed message — ignore
        }
    };

    return () => {
        source.close();
        store.getState().setUsers([]);
    };
}
