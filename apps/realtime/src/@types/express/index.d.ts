import { IUser } from '../../entitites/schemas/ususario';

declare global {
    interface IUserKc {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
    }
    namespace Express {
        interface Request {
            user: IUser['IDocument'];
            userKc: UserKc;
        }
    }
}

export {};
