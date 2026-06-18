import { ICall } from '#schemas/call/types';

interface ICreateInput {
    customerId: ICall['IParams']['customerId'];
    customerName: ICall['IParams']['customerName'];
    attendantId: ICall['IParams']['attendantId'];
    attendantName: ICall['IParams']['attendantName'];
    roomUrl: ICall['IParams']['roomUrl'];
}

type ICreateOutput = ICall['IParams'];

export interface ICallController {
    ICreate: {
        IInput: ICreateInput;
        IOutput: ICreateOutput;
    };
}
