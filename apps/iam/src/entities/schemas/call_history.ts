import { Schema, Types, Document, Model } from 'mongoose';

export interface ICallHistorySchema {
    _id: Types.ObjectId;
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

export const CallHistorySchema = new Schema<ICallHistorySchema>(
    {
        callId: { type: String, required: true },
        customerId: { type: String, required: true },
        customerName: { type: String, required: true },
        attendantId: { type: String, required: true },
        attendantName: { type: String, required: true },
        roomName: { type: String, required: true },
        meetingId: { type: String, required: false },
        accumulatedMs: { type: Number, required: true },
        startedAt: { type: Date, required: false, default: null },
        endedAt: { type: Date, required: false, default: null },
        tokensToBeCharged: { type: Number, required: true },
    },
    {
        timestamps: {
            createdAt: 'createdAt',
            updatedAt: 'updatedAt',
        },
    }
);

type ICallHistoryDocument = Document<Types.ObjectId, any, ICallHistorySchema> & ICallHistorySchema;
type ICallHistoryModel = Model<ICallHistorySchema>;

export interface ICallHistory {
    ISchema: ICallHistorySchema;
    IDocument: ICallHistoryDocument;
    IModel: ICallHistoryModel;
}
