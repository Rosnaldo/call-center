import { Types, HydratedDocument, Model, Query } from 'mongoose';
import { ICallUserPresenceEvent as ICallUserPresenceEventParams, PresenceEventType } from '@repo/shared-types';

export interface ICallUserPresenceSchema {
    _id: Types.ObjectId;
    roomName: string;
    sessionId: string;
    userId: string;
    type: PresenceEventType;
    occurredAt: Date;
}

type ICallUserPresenceDocument = HydratedDocument<ICallUserPresenceSchema> & { _id: Types.ObjectId };
type ICallUserPresenceModel = Model<ICallUserPresence['ISchema']>;
type ICallUserPresenceQuery = Query<any, any, any, ICallUserPresence['ISchema']>;

export interface ICallUserPresence {
    ISchema: ICallUserPresenceSchema;
    IDocument: ICallUserPresenceDocument;
    IParams: ICallUserPresenceEventParams;
    IModel: ICallUserPresenceModel;
    IQuery: ICallUserPresenceQuery;
}
