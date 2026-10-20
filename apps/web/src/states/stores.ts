import type { IDailyService } from '../services/daily.ts';
import { createAuthStore } from './local/auth/store.ts';
import { createBillingStore } from './local/billing/store.ts';
import { createCallStore } from './shared/call/store.ts';
import { createCallViewStore } from './local/call-view/store.ts';
import { createChatStore } from './shared/chat/store.ts';
import { createCurrentUserStore } from './entities/current-user/store.ts';
import { createDevicesStore } from './local/devices/store.ts';
import { createIncomingCallStore } from './shared/incoming-call/store.ts';
import { createMeetingStore } from './shared/meeting/store.ts';
import { createOnlineUsersStore } from './shared/online-users/store.ts';
import { createTimerStore } from './local/timer/store.ts';

export type AuthStoreInstance = ReturnType<typeof createAuthStore>;
export type BillingStoreInstance = ReturnType<typeof createBillingStore>;
export type CallStoreInstance = ReturnType<typeof createCallStore>;
export type CallViewStoreInstance = ReturnType<typeof createCallViewStore>;
export type ChatStoreInstance = ReturnType<typeof createChatStore>;
export type CurrentUserStoreInstance = ReturnType<typeof createCurrentUserStore>;
export type DevicesStoreInstance = ReturnType<typeof createDevicesStore>;
export type IncomingCallStoreInstance = ReturnType<typeof createIncomingCallStore>;
export type MeetingStoreInstance = ReturnType<typeof createMeetingStore>;
export type OnlineUsersStoreInstance = ReturnType<typeof createOnlineUsersStore>;
export type TimerStoreInstance = ReturnType<typeof createTimerStore>;

export interface StoresRef {
    call: CallStoreInstance;
    callView: CallViewStoreInstance;
    chat: ChatStoreInstance;
    onlineUsers: OnlineUsersStoreInstance;
    incomingCall: IncomingCallStoreInstance;
    currentUser: CurrentUserStoreInstance;
    timer: TimerStoreInstance;
    billing: BillingStoreInstance;
}

export interface Stores {
    auth: AuthStoreInstance;
    billing: BillingStoreInstance;
    call: CallStoreInstance;
    callView: CallViewStoreInstance;
    chat: ChatStoreInstance;
    currentUser: CurrentUserStoreInstance;
    devices: DevicesStoreInstance;
    incomingCall: IncomingCallStoreInstance;
    meeting: MeetingStoreInstance;
    onlineUsers: OnlineUsersStoreInstance;
    timer: TimerStoreInstance;
}

export let useAuthStore: AuthStoreInstance;
export let useBillingStore: BillingStoreInstance;
export let useCallStore: CallStoreInstance;
export let useCallViewStore: CallViewStoreInstance;
export let useChatStore: ChatStoreInstance;
export let useCurrentUserStore: CurrentUserStoreInstance;
export let useDevicesStore: DevicesStoreInstance;
export let useIncomingCallStore: IncomingCallStoreInstance;
export let useMeetingStore: MeetingStoreInstance;
export let useOnlineUsersStore: OnlineUsersStoreInstance;
export let useTimerStore: TimerStoreInstance;

const noopDailyService: IDailyService = {
    join: async () => {},
    leave: async () => {},
    destroy: () => {},
    rebuild: async () => {},
};

export function createStores(dailyService: IDailyService = noopDailyService): Stores {
    const ref = {} as StoresRef;

    const s: Stores = {
        auth: createAuthStore(),
        billing: createBillingStore(),
        call: createCallStore(dailyService, ref),
        callView: createCallViewStore(),
        chat: createChatStore(ref),
        currentUser: createCurrentUserStore(),
        devices: createDevicesStore(),
        incomingCall: createIncomingCallStore(ref),
        meeting: createMeetingStore(ref),
        onlineUsers: createOnlineUsersStore(),
        timer: createTimerStore(),
    };

    ref.call = s.call;
    ref.callView = s.callView;
    ref.chat = s.chat;
    ref.onlineUsers = s.onlineUsers;
    ref.incomingCall = s.incomingCall;
    ref.currentUser = s.currentUser;
    ref.timer = s.timer;
    ref.billing = s.billing;

    useAuthStore = s.auth;
    useBillingStore = s.billing;
    useCallStore = s.call;
    useCallViewStore = s.callView;
    useChatStore = s.chat;
    useCurrentUserStore = s.currentUser;
    useDevicesStore = s.devices;
    useIncomingCallStore = s.incomingCall;
    useMeetingStore = s.meeting;
    useOnlineUsersStore = s.onlineUsers;
    useTimerStore = s.timer;

    return s;
}
