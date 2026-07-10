import { CallViewStateData, ViewState, initialCallViewState } from './state.ts';

export interface CallViewStateActions {
  setViewState: (viewState: ViewState) => void;
  setSelectedAttendantId: (id: string | null) => void;
  selectAttendant: (attendantId: string) => void;
  setIsLeader: (isLeader: boolean) => void;
  resetCallViewState: () => void;
}

export const createCallViewStateActions = (
  set: (arg: Partial<CallViewStateData> | ((state: CallViewStateData) => Partial<CallViewStateData>)) => void
): CallViewStateActions => ({
  setViewState: (viewState) => set({ viewState }),
  setSelectedAttendantId: (selectedAttendantId) => set({ selectedAttendantId }),
  selectAttendant: (attendantId) => set({ selectedAttendantId: attendantId, viewState: 'lobby' }),
  setIsLeader: (isLeader) => set({ isLeader }),
  resetCallViewState: () => set((state) => ({ ...initialCallViewState, isLeader: state.isLeader })),
});
