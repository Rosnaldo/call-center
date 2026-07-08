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
    IUpdateParticipant: {
        IInput: { customerId: string; attendantId: string; userId: string; joined: boolean };
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
}
