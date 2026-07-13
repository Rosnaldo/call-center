import { IncomingCallState } from '@repo/shared-types';

export interface IncomingCallStore {
  incomingCall: IncomingCallState | null;
}

export const initialIncomingCallStore: IncomingCallStore = {
  incomingCall: null,
};
