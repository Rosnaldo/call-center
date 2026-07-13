import { CallState } from '@repo/shared-types';

export interface ICallController {
    ICreate: {
        IInput: CallState;
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
    ISyncActiveCall: {
        IOutput: { call: CallState | null };
    };
}
