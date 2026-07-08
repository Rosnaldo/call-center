export type ViewState =
  | 'none'
  | 'lobby'
  | 'awaiting-answer'
  | 'awaiting-to-answer'
  | 'in-call'
  | 'call-interrupted';

export interface CallViewStateData {
  viewState: ViewState;
  selectedAttendantId: string | null;
}

export const initialCallViewState: CallViewStateData = {
  viewState: 'none',
  selectedAttendantId: null,
};
