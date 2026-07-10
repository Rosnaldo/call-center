import type { CallState, IncomingCallState } from '@repo/shared-types';
import type { CallStoreInstance, CallViewStoreInstance, CurrentUserStoreInstance, IncomingCallStoreInstance } from '../stores.ts';
import type { ViewState } from './state.ts';

export interface CallViewStateInputs {
  call: CallState | null;
  incomingCall: IncomingCallState | null;
  isLeader: boolean;
  selectedAttendantId: string | null;
  role: string | undefined;
}

// The one place the actual none/lobby/awaiting-*/in-call*/call-closing
// rules live — see useCallViewState (reactive, for components) and
// getCallViewState (a plain snapshot read, for anything outside React,
// e.g. tests driving the real websocket/actions instead of rendering).
export function deriveCallViewState({ call, incomingCall, isLeader, selectedAttendantId, role }: CallViewStateInputs): ViewState {
  if (call) {
    if (call.isClosed) return 'call-closing';
    if (!isLeader) return 'in-call-in-another';
    return 'in-call';
  }

  if (incomingCall) {
    return role === 'customer' ? 'awaiting-answer' : 'awaiting-to-answer';
  }

  return selectedAttendantId ? 'lobby' : 'none';
}

export interface CallViewStateStores {
  call: CallStoreInstance;
  incomingCall: IncomingCallStoreInstance;
  callView: CallViewStoreInstance;
  currentUser: CurrentUserStoreInstance;
}

export function getCallViewState(stores: CallViewStateStores): ViewState {
  const { call } = stores.call.getState();
  const { incomingCall } = stores.incomingCall.getState();
  const { isLeader, selectedAttendantId } = stores.callView.getState();
  const role = stores.currentUser.getState().currentUser?.role;

  return deriveCallViewState({ call, incomingCall, isLeader, selectedAttendantId, role });
}
