import { Types, HydratedDocument, Model, Query } from 'mongoose';
import { ICall as ICallParams } from '@repo/shared-types';

export interface ICallSchema {
    _id: Types.ObjectId;
    customerId: string;
    customerName: string;
    attendantId: string;
    attendantName: string;
    roomName: string;
    sessionId: string;
}

type ICallDocument = HydratedDocument<ICallSchema> & { _id: Types.ObjectId };
type ICallModel = Model<ICall['ISchema']>;
type ICallQuery = Query<any, any, any, ICall['ISchema']>;

export interface ICall {
    ISchema: ICallSchema;
    IDocument: ICallDocument;
    IParams: ICallParams;
    IModel: ICallModel;
    IQuery: ICallQuery;
}
