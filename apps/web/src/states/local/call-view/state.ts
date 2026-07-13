// Purely derived now — see useCallViewState — not written to the store
// directly anywhere. Kept here since it's the vocabulary every consumer
// (CallView, CallFooter, tests) still shares.
export type ViewState =
  | 'none'
  | 'lobby'
  | 'awaiting-answer'
  | 'awaiting-to-answer'
  | 'in-call'
  | 'in-call-in-another'
  | 'call-closing';

export interface CallViewStateData {
  selectedAttendantId: string | null;
  // Whether this tab holds the real websocket (see InitWs) — not reset by
  // resetCallViewState, since that fires on routine reconnects/logout and
  // isn't about losing tab leadership.
  isLeader: boolean;
}

export const initialCallViewState: CallViewStateData = {
  selectedAttendantId: null,
  isLeader: false,
};
