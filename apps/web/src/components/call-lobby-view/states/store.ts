/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { CallViewStateData, initialCallViewState, ViewState } from './state.ts';
import { CallViewStateActions, createCallViewStateActions } from './actions.ts';
import { useCallStore } from '../../../states/call/store.ts';
import { useIncomingCallStore } from '../../../states/incoming-call/store.ts';

export const useCallViewStore = create<CallViewStateData & CallViewStateActions>((set) => ({
  ...initialCallViewState,
  ...createCallViewStateActions(set),
}));

const toViewState = (status: string | undefined, selectedAttendantId: string | null): ViewState => {
  if (!status) return selectedAttendantId ? 'lobby' : 'none';
  if (status === 'active') return 'in-call';
  if (status === 'call-interrupteded') return 'call-interrupteded';
  return 'lobby';
};

// Sync viewState when call.status changes
useCallStore.subscribe((state, prev) => {
  const status = state.call?.status as string | undefined;
  if (status === (prev.call?.status as string | undefined)) return;

  const { selectedAttendantId, viewState } = useCallViewStore.getState();
  const next = toViewState(status, selectedAttendantId);
  if (viewState !== next) useCallViewStore.setState({ viewState: next });
});

// Sync viewState when selectedAttendantId changes (only when no active call and no incoming)
useCallViewStore.subscribe((state, prev) => {
  if (state.selectedAttendantId === prev.selectedAttendantId) return;
  const activeStatus = useCallStore.getState().call?.status as string | undefined;
  const hasIncoming = !!useIncomingCallStore.getState().incomingCall;
  if (!activeStatus && !hasIncoming) {
    const next = toViewState(undefined, state.selectedAttendantId);
    if (state.viewState !== next) useCallViewStore.setState({ viewState: next });
  }
});
