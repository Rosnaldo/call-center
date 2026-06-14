import { IOnlineUser } from '#schemas/online_user/types';

type IAddInput = IOnlineUser['IParams'];
type IAddOutput = IOnlineUser['IParams'];

interface IListOutput {
    users: IOnlineUser['IParams'][];
}

export interface IOnlineUserController {
    IAdd: {
        IInput: IAddInput;
        IOutput: IAddOutput;
    };
    IList: {
        IOutput: IListOutput;
    };
    IRemove: {
        IInput: { id: string };
    };
}
