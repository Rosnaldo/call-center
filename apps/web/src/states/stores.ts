import type { IDailyService } from '../services/daily.ts';
import { createAuthStore } from './auth/store.ts';
import { createBillingStore } from './billing/store.ts';
import { createCallStore } from './call/store.ts';
import { createCallViewStore } from './call-view/store.ts';
import { createCurrentUserStore } from './current-user/store.ts';
import { createDevicesStore } from './devices/store.ts';
import { createIncomingCallStore } from './incoming-call/store.ts';
import { createOnlineUsersStore } from './online-users/store.ts';
import { createTimerStore } from './timer/store.ts';

export type AuthStoreInstance = ReturnType<typeof createAuthStore>;
export type BillingStoreInstance = ReturnType<typeof createBillingStore>;
export type CallStoreInstance = ReturnType<typeof createCallStore>;
export type CallViewStoreInstance = ReturnType<typeof createCallViewStore>;
export type CurrentUserStoreInstance = ReturnType<typeof createCurrentUserStore>;
export type DevicesStoreInstance = ReturnType<typeof createDevicesStore>;
export type IncomingCallStoreInstance = ReturnType<typeof createIncomingCallStore>;
export type OnlineUsersStoreInstance = ReturnType<typeof createOnlineUsersStore>;
export type TimerStoreInstance = ReturnType<typeof createTimerStore>;

export interface StoresRef {
    callView: CallViewStoreInstance;
    onlineUsers: OnlineUsersStoreInstance;
    incomingCall: IncomingCallStoreInstance;
    currentUser: CurrentUserStoreInstance;
}

export interface Stores {
    auth: AuthStoreInstance;
    billing: BillingStoreInstance;
    call: CallStoreInstance;
    callView: CallViewStoreInstance;
    currentUser: CurrentUserStoreInstance;
    devices: DevicesStoreInstance;
    incomingCall: IncomingCallStoreInstance;
    onlineUsers: OnlineUsersStoreInstance;
    timer: TimerStoreInstance;
}

export let useAuthStore: AuthStoreInstance;
export let useBillingStore: BillingStoreInstance;
export let useCallStore: CallStoreInstance;
export let useCallViewStore: CallViewStoreInstance;
export let useCurrentUserStore: CurrentUserStoreInstance;
export let useDevicesStore: DevicesStoreInstance;
export let useIncomingCallStore: IncomingCallStoreInstance;
export let useOnlineUsersStore: OnlineUsersStoreInstance;
export let useTimerStore: TimerStoreInstance;

const noopDailyService: IDailyService = {
    join: async () => {},
    leave: async () => {},
    destroy: () => {},
    rebuild: () => {},
};

export function createStores(dailyService: IDailyService = noopDailyService): Stores {
    const ref = {} as StoresRef;

    const s: Stores = {
        auth: createAuthStore(),
        billing: createBillingStore(),
        call: createCallStore(dailyService, ref),
        callView: createCallViewStore(),
        currentUser: createCurrentUserStore(),
        devices: createDevicesStore(),
        incomingCall: createIncomingCallStore(ref),
        onlineUsers: createOnlineUsersStore(),
        timer: createTimerStore(),
    };

    ref.callView = s.callView;
    ref.onlineUsers = s.onlineUsers;
    ref.incomingCall = s.incomingCall;
    ref.currentUser = s.currentUser;

    useAuthStore = s.auth;
    useBillingStore = s.billing;
    useCallStore = s.call;
    useCallViewStore = s.callView;
    useCurrentUserStore = s.currentUser;
    useDevicesStore = s.devices;
    useIncomingCallStore = s.incomingCall;
    useOnlineUsersStore = s.onlineUsers;
    useTimerStore = s.timer;

    return s;
}
