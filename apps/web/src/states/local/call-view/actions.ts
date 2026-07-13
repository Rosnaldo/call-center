import { CallViewStateData, initialCallViewState } from './state.ts';

export interface CallViewStateActions {
  setSelectedAttendantId: (id: string | null) => void;
  selectAttendant: (attendantId: string) => void;
  setIsLeader: (isLeader: boolean) => void;
  resetCallViewState: () => void;
}

export const createCallViewStateActions = (
  set: (arg: Partial<CallViewStateData> | ((state: CallViewStateData) => Partial<CallViewStateData>)) => void
): CallViewStateActions => ({
  setSelectedAttendantId: (selectedAttendantId) => set({ selectedAttendantId }),
  selectAttendant: (attendantId) => set({ selectedAttendantId: attendantId }),
  setIsLeader: (isLeader) => set({ isLeader }),
  resetCallViewState: () => set((state) => ({ ...initialCallViewState, isLeader: state.isLeader })),
});
