import { IOnlineUser, IncomingCallState, CallState } from '@repo/shared-types';

let seq = 0;
const nextId = () => `mock-${++seq}`;

export const buildOnlineUser = (d?: Partial<IOnlineUser>): IOnlineUser => ({
    id: d?.id ?? nextId(),
    name: d?.name ?? 'Test User',
    slug: d?.slug ?? 'test-user',
    email: d?.email ?? 'test@example.com',
    role: d?.role ?? 'customer',
    avatarUrl: d?.avatarUrl,
    status: d?.status ?? 'idle',
    tokens: d?.tokens,
    phone: d?.phone,
});

export const buildIncomingCall = (d?: Partial<IncomingCallState>): IncomingCallState => ({
    customerId: d?.customerId ?? nextId(),
    attendantId: d?.attendantId ?? nextId(),
    calledBy: d?.calledBy ?? 'customer',
});

export const buildCallState = (d?: Partial<CallState>): CallState => ({
    id: d?.id ?? nextId(),
    customerId: d?.customerId ?? nextId(),
    customerName: d?.customerName ?? 'Test Customer',
    attendantId: d?.attendantId ?? nextId(),
    attendantName: d?.attendantName ?? 'Test Attendant',
    roomName: d?.roomName ?? 'test-room',
    meetingId: d?.meetingId ?? nextId(),
    customerInCall: d?.customerInCall ?? false,
    attendantInCall: d?.attendantInCall ?? false,
    wasAccepted: d?.wasAccepted ?? false,
});
