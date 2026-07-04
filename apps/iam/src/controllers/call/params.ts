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
    IDelete: {
        IInput: { customerId: string; attendantId: string };
    };
    IComplete: {
        IOutput: CallState;
    };
}
