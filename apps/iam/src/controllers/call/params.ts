import { CallState } from '@repo/shared-types';

export interface ICallController {
    ICreate: {
        IInput: CallState;
        IOutput: CallState;
    };
    IGet: {
        IOutput: CallState;
    };
    IUpdate: {
        IInput: { customerId: string; attendantId: string; updates: Partial<CallState> };
        IOutput: CallState;
    };
    IAddParticipant: {
        IInput: { customerId: string; attendantId: string; userId: string };
        IOutput: CallState;
    };
    IRemoveParticipant: {
        IInput: { customerId: string; attendantId: string; userId: string };
        IOutput: CallState;
    };
    IDelete: {
        IInput: { customerId: string; attendantId: string };
    };
    IComplete: {
        IOutput: {};
    };
    ITouch: {
        IInput: { customerId: string; attendantId: string };
        IOutput: {};
    };
    ISyncActiveCall: {
        IOutput: { call: CallState | null; shouldJoin: boolean };
    };
    INotifyPartnerReconnected: {
        IInput: { userId: string };
        IOutput: {};
    };
}
