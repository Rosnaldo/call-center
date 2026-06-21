import { CallState } from '@repo/shared-types';

export interface ICallController {
    ICreate: {
        IInput: CallState;
        IOutput: CallState;
    };
    IDelete: {
        IInput: { id: string };
    };
}
