import { IncomingCallState } from '@repo/shared-types';

export interface IIncomingCallController {
    ISend: {
        IInput: IncomingCallState;
        IOutput: IncomingCallState;
    };
    IDelete: {
        IInput: { customerId: string };
    };
}
