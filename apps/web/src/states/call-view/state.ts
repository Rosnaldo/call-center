/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ViewState =
  | 'none'
  | 'lobby'
  | 'awaiting-answer'
  | 'in-call'
  | 'call-interrupteded';

export interface CallViewStateData {
  viewState: ViewState;
  selectedAttendantId: string | null;
}

export const initialCallViewState: CallViewStateData = {
  viewState: 'none',
  selectedAttendantId: null,
};
