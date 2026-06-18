import mongoose from 'mongoose';
import { ICallUserPresence } from './types';

const { Schema } = mongoose;

export const CallUserPresenceSchema = new Schema<ICallUserPresence['ISchema']>(
    {
        roomName: { type: String, required: true },
        sessionId: { type: String, required: true },
        userId: { type: String, required: true },
        type: { type: String, required: true },
        occurredAt: { type: Date, required: true },
    },
    {
        strict: false,
        timestamps: {
            createdAt: 'createdAt',
            updatedAt: 'updatedAt',
        },
    }
);
