import { IUser } from "#schemas/user/types";
import { PaginateResponse } from "src/types";


interface IPaginacaoInput {
    search?: string;
    page: number;
    pageSize: number;
    isPagination?: boolean;
}

type IPaginacaoOutput = PaginateResponse<IUser['IParams']>;

interface ICreateInput {
    firstName: IUser['IParams']['firstName'];
    lastName: IUser['IParams']['lastName'];
    email?: IUser['IParams']['email'];
    role: IUser['IParams']['role'];
}

type ICreateOutput = IUser['IParams'];

interface IExistsInput {
    email: NonNullable<IUser['IParams']['email']>;
}

type IExistsOutput = IUser['IParams'];

interface IDeleteInput {
    _id: IUser['IParams']['_id'];
}

type IDeleteOutput = {};

interface IEditInput {
    _id: IUser['IParams']['_id'];
    firstName?: IUser['IParams']['firstName'];
    lastName?: IUser['IParams']['lastName'];
    email?: IUser['IParams']['email'];
    role?: IUser['IParams']['role'];
}

type IEditOutput = IUser['IParams'];

interface ICountOutput {
    attendants: number;
    customers: number;
    admins: number;
}

interface IFindBySlugInput {
    slug: string;
}

type IFindBySlugOutput = IUser['IParams'];

interface IChargeTokenInput {
    customerId: string;
    tokens: number;
}

type IChargeTokenOutput = IUser['IParams'];

export interface IUserController {
    IPaginacao: {
        IInput: IPaginacaoInput;
        IOutput: IPaginacaoOutput;
    };
    ICreate: {
        IInput: ICreateInput;
        IOutput: ICreateOutput;
    };
    IExists: {
        IInput: IExistsInput;
        IOutput: IExistsOutput;
    };
    IFindBySlug: {
        IInput: IFindBySlugInput;
        IOutput: IFindBySlugOutput;
    };
    IDelete: {
        IInput: IDeleteInput;
        IOutput: IDeleteOutput;
    };
    IEdit: {
        IInput: IEditInput;
        IOutput: IEditOutput;
    };
    ICount: {
        IOutput: ICountOutput
    };
    IChargeToken: {
        IInput: IChargeTokenInput;
        IOutput: IChargeTokenOutput;
    };
}
