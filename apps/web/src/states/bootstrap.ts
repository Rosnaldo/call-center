import { createAuthStore, AuthStoreInstance } from './auth/store.ts';
import { createBillingStore, BillingStoreInstance } from './billing/store.ts';
import { createCallStore, CallStoreInstance } from './call/store.ts';
import { createCallViewStore, CallViewStoreInstance } from './call-view/store.ts';
import { createCurrentUserStore, CurrentUserStoreInstance } from './current-user/store.ts';
import { createDevicesStore, DevicesStoreInstance } from './devices/store.ts';
import { createIncomingCallStore, IncomingCallStoreInstance } from './incoming-call/store.ts';
import { createOnlineUsersStore, OnlineUsersStoreInstance } from './online-users/store.ts';
import { createTimerStore, TimerStoreInstance } from './timer/store.ts';

export interface AppStores {
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

export const createAppStores = (): AppStores => ({
  auth: createAuthStore(),
  billing: createBillingStore(),
  call: createCallStore(),
  callView: createCallViewStore(),
  currentUser: createCurrentUserStore(),
  devices: createDevicesStore(),
  incomingCall: createIncomingCallStore(),
  onlineUsers: createOnlineUsersStore(),
  timer: createTimerStore(),
});
