export interface ITransactionParams {
    id: string;
    message: string;
    date: string;
    type: 'charge' | 'reload';
    amount: number;
}

interface ICreateInput {
    userId: string;
    message: string;
    type: 'charge' | 'reload';
    amount: number;
}

type ICreateOutput = ITransactionParams;

interface IListInput {
    userId: string;
    page: number;
    limit: number;
    search?: string;
    type?: 'charge' | 'reload';
}

interface IListOutput {
    transactions: ITransactionParams[];
    total: number;
    totalPages: number;
    totalCredited: number;
    totalDebited: number;
}

export interface ITransactionController {
    ICreate: {
        IInput: ICreateInput;
        IOutput: ICreateOutput;
    };
    IList: {
        IInput: IListInput;
        IOutput: IListOutput;
    };
}
