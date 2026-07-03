export interface ICallHistoryParams {
    _id: string;
    callId: string;
    customerId: string;
    customerName: string;
    attendantId: string;
    attendantName: string;
    roomName: string;
    meetingId: string;
    accumulatedMs: number;
    startedAt: Date | null;
    endedAt: Date | null;
    tokensToBeCharged: number;
}

interface ICreateInput {
    callId: string;
    customerId: string;
    customerName: string;
    attendantId: string;
    attendantName: string;
    roomName: string;
    meetingId: string;
    accumulatedMs: number;
    startedAt: Date | null;
    endedAt: Date | null;
    tokensToBeCharged: number;
}

type ICreateOutput = ICallHistoryParams;

export interface ICallHistoryController {
    ICreate: {
        IInput: ICreateInput;
        IOutput: ICreateOutput;
    };
}
