import { IncomingCallState } from '@repo/shared-types';

export interface IIncomingCallController {
    ISend: {
        IInput: IncomingCallState;
        IOutput: IncomingCallState;
    };
    IAccept: {
        IInput: { attendantId: string; userId: string };
        IOutput: IncomingCallState;
    };
    ICancel: {
        IInput: { customerId: string; attendantId: string };
    };
}
