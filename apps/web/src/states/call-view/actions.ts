/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CallViewStateData, ViewState, initialCallViewState } from './state.ts';

export interface CallViewStateActions {
  setViewState: (viewState: ViewState) => void;
  setSelectedAttendantId: (id: string | null) => void;
  resetCallViewState: () => void;
}

export const createCallViewStateActions = (
  set: (arg: Partial<CallViewStateData> | ((state: CallViewStateData) => Partial<CallViewStateData>)) => void
): CallViewStateActions => ({
  setViewState: (viewState) => set({ viewState }),
  setSelectedAttendantId: (selectedAttendantId) => set({ selectedAttendantId }),
  resetCallViewState: () => set(initialCallViewState),
});
