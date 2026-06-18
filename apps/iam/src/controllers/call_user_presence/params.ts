import { ICallUserPresence } from '#schemas/call_user_presence/types';

interface ICreateInput {
    roomName: ICallUserPresence['IParams']['roomName'];
    sessionId: ICallUserPresence['IParams']['sessionId'];
    userId: ICallUserPresence['IParams']['userId'];
    type: ICallUserPresence['IParams']['type'];
    occurredAt: ICallUserPresence['IParams']['occurredAt'];
}

type ICreateOutput = ICallUserPresence['IParams'];

export interface ICallUserPresenceController {
    ICreate: {
        IInput: ICreateInput;
        IOutput: ICreateOutput;
    };
}
