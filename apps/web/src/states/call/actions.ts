import type { DailyCall } from '@daily-co/daily-js';
import { useIncomingCallStore, useCallViewStore, useDevicesStore, useOnlineUsersStore } from '../stores.ts';
import { CallState } from './state.ts';
import { dailyService } from '../../services/daily.ts';
import {
  simulateAnswerIncomingCall,
  simulateCompleteCall,
  simulateUpdateCall,
  simulateResetCall,
} from './simulation.ts';

const isSimulation = (import.meta as any).env?.VITE_ENV === 'simulation';

export interface CallActions {
  answerIncomingCall: (daily: DailyCall | null) => void;
  completeCall: () => void;
  updateCall: (callId: string, updates: Partial<CallState>) => void;
  resetSimulation: () => void;
}

export const createCallActions = (
  set: (fn: (state: any) => any) => void
): CallActions => {
  return {
    answerIncomingCall: (daily) => {
      if (isSimulation) {
        simulateAnswerIncomingCall(set, daily);
        return;
      }

      const incomingCall = useIncomingCallStore.getState().incomingCall;
      if (!incomingCall) return;

      const { users } = useOnlineUsersStore.getState();
      const customer = users.find(u => u.id === incomingCall.customerId);
      const attendant = users.find(u => u.id === incomingCall.attendantId);
      if (!customer || !attendant) return;

      if (daily) {
        const { cameraOn, microphoneOn } = useDevicesStore.getState();
        dailyService.join(daily, {
          room: `${customer.slug}--${attendant.slug}`,
          userName: attendant.name,
          userData: { id: attendant.id, role: attendant.role },
          startAudioOff: !microphoneOn,
          startVideoOff: !cameraOn,
        });
      }

      useCallViewStore.getState().setViewState('in-call');
    },

    completeCall: () => {
      if (isSimulation) {
        simulateCompleteCall(set);
        return;
      }

      useCallViewStore.getState().setViewState('none');
      useCallViewStore.getState().setSelectedAttendantId(null);
    },

    updateCall: (callId, updates) => {
      if (isSimulation) {
        simulateUpdateCall(set, callId, updates);
        return;
      }
    },

    resetSimulation: () => {
      if (isSimulation) {
        simulateResetCall(set);
      }
    },
  };
};
