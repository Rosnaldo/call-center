export type ViewState =
  | 'none'
  | 'lobby'
  | 'awaiting-answer'
  | 'awaiting-to-answer'
  | 'in-call'
  | 'in-call-in-another'
  | 'call-closing'
  | 'call-interrupted';

export interface CallViewStateData {
  viewState: ViewState;
  selectedAttendantId: string | null;
  // Whether this tab holds the real websocket (see InitWs) — not reset by
  // resetCallViewState, since that fires on routine reconnects/logout and
  // isn't about losing tab leadership.
  isLeader: boolean;
}

export const initialCallViewState: CallViewStateData = {
  viewState: 'none',
  selectedAttendantId: null,
  isLeader: false,
};
