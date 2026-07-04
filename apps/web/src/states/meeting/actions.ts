/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CallState } from '@repo/shared-types';
import type { StoresRef } from '../stores.ts';

export interface MeetingActions {
  meetingStarted: (call: CallState) => void;
  updateJoinedView: (call: CallState) => void;
  updateLeftView: (call: CallState) => void;
  meetingEnded: (call: CallState) => void;
}

export const createMeetingActions = (
  ref: StoresRef,
): MeetingActions => {
  const syncCall = (newCall: CallState) => {
    ref.call.setState({ call: newCall });
    ref.timer.getState().syncFromCall(newCall);
    ref.billing.getState().setInitialTokens(newCall.tokensToBeCharged);
  };

  return {
    meetingStarted: syncCall,
    updateJoinedView: syncCall,
    updateLeftView: syncCall,
    meetingEnded: () => {},
  };
};
