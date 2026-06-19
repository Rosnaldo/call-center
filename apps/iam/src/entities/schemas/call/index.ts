import mongoose from 'mongoose';
import { ICall } from './types';

const { Schema } = mongoose;

export const CallSchema = new Schema<ICall['ISchema']>(
    {
        customerId: { type: String, required: true },
        customerName: { type: String, required: true },
        attendantId: { type: String, required: true },
        attendantName: { type: String, required: true },
        roomName: { type: String, required: true },
        sessionId: { type: String, required: true },
    },
    {
        strict: false,
        timestamps: {
            createdAt: 'createdAt',
            updatedAt: 'updatedAt',
        },
    }
);
