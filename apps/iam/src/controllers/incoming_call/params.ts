import { IncomingCallState } from '@repo/shared-types';

export interface IIncomingCallController {
    ICreate: {
        IInput: IncomingCallState;
        IOutput: IncomingCallState;
    };
    IDelete: {
        IInput: { customerId: string };
    };
}
