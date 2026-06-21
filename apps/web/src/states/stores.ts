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

export function createStores(): Stores {
    return {
        auth: createAuthStore(),
        billing: createBillingStore(),
        call: createCallStore(),
        callView: createCallViewStore(),
        currentUser: createCurrentUserStore(),
        devices: createDevicesStore(),
        incomingCall: createIncomingCallStore(),
        onlineUsers: createOnlineUsersStore(),
        timer: createTimerStore(),
    };
}

export const stores = createStores();

export const useAuthStore = stores.auth;
export const useBillingStore = stores.billing;
export const useCallStore = stores.call;
export const useCallViewStore = stores.callView;
export const useCurrentUserStore = stores.currentUser;
export const useDevicesStore = stores.devices;
export const useIncomingCallStore = stores.incomingCall;
export const useOnlineUsersStore = stores.onlineUsers;
export const useTimerStore = stores.timer;
