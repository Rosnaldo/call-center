import { useCallStore, useCallViewStore, useCurrentUserStore, useIncomingCallStore } from '../states/stores.ts';
import { deriveCallViewState } from '../states/call-view/derive.ts';
import type { ViewState } from '../states/call-view/state.ts';

// Single source of truth for callView's state — purely derived from the raw
// data every render, instead of being pushed into a store from a dozen
// scattered setViewState calls across call/incoming-call/meeting actions.
// That made it easy for some code path to forget to flip it (or to leave it
// stuck) whenever call/incomingCall state changed underneath it. The actual
// none/lobby/awaiting-*/in-call*/call-closing rules live in
// deriveCallViewState — this just subscribes to the stores it reads so
// components re-render when any of them change.
export function useCallViewState(): ViewState {
  const call = useCallStore((s) => s.call);
  const incomingCall = useIncomingCallStore((s) => s.incomingCall);
  const isLeader = useCallViewStore((s) => s.isLeader);
  const selectedAttendantId = useCallViewStore((s) => s.selectedAttendantId);
  const role = useCurrentUserStore((s) => s.currentUser?.role);

  return deriveCallViewState({ call, incomingCall, isLeader, selectedAttendantId, role });
}
