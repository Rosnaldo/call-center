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
        IInput: { id: string; updates: Partial<CallState> };
        IOutput: CallState;
    };
    IDelete: {
        IInput: { id: string };
    };
}
