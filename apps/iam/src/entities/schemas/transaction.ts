import { Schema, Types, Document, Model } from 'mongoose';

export interface ITransactionSchema {
    _id: Types.ObjectId;
    userId: string;
    message: string;
    type: 'charge' | 'reload';
    amount: number;
    createdAt: Date;
    updatedAt: Date;
}

export const TransactionSchema = new Schema<ITransactionSchema>(
    {
        userId: { type: String, required: true, index: true },
        message: { type: String, required: true },
        type: { type: String, required: true, enum: ['charge', 'reload'] },
        amount: { type: Number, required: true },
    },
    {
        timestamps: {
            createdAt: 'createdAt',
            updatedAt: 'updatedAt',
        },
    }
);

type ITransactionDocument = Document<Types.ObjectId, any, ITransactionSchema> & ITransactionSchema;
type ITransactionModel = Model<ITransactionSchema>;

export interface ITransaction {
    ISchema: ITransactionSchema;
    IDocument: ITransactionDocument;
    IModel: ITransactionModel;
}
