import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { mapBoolean } from '#utils/mapper/boolean';
import { CallState, computeTokensToBeCharged } from '@repo/shared-types';
import { ICallController } from './params';

type IInput = ICallController['IUpdateParticipant']['IInput'];
type IOutput = ICallController['IUpdateParticipant']['IOutput'];

const CALLS_KEY = 'calls';
const MAX_ATTEMPTS = 10;

interface Props {
    mapped: IInput;
}

const applyParticipantChange = (call: CallState, userId: string, joined: boolean): Partial<CallState> => {
    if (joined) {
        const activeUsers = new Set(call.activeUserIds);
        activeUsers.add(userId);

        const updates: Partial<CallState> = {
            activeUserIds: Array.from(activeUsers),
            tokensToBeCharged: computeTokensToBeCharged(call.accumulatedMs),
        };

        if (activeUsers.size === 2 && !call.overlapStartedAt) {
            updates.overlapStartedAt = Date.now();
            updates.isPlaying = true;
        }

        return updates;
    }

    const activeUsers = new Set(call.activeUserIds);
    const updates: Partial<CallState> = {};

    if (activeUsers.size === 2 && call.overlapStartedAt) {
        updates.accumulatedMs = call.accumulatedMs + (Date.now() - call.overlapStartedAt);
        updates.overlapStartedAt = null;
        updates.isPlaying = false;
    }

    activeUsers.delete(userId);
    updates.activeUserIds = Array.from(activeUsers);

    return updates;
};

export class UpdateParticipant {
    public static readonly classId = Symbol.for('Controller > Call > UpdateParticipant');

    private constructor() {}

    static construir(classId: symbol): UpdateParticipant {
        if (classId !== Symbol.for('Controller > Call')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new UpdateParticipant();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        const { customerId, attendantId, userId, joined } = props.mapped;
        const conn = getRedisClient().duplicate();

        try {
            logger.info({ customerId, attendantId, userId, joined }, 'call update-participant');
            if (!customerId || !attendantId || !userId) throw new BadRequestException('customerId, attendantId e userId são obrigatórios');

            const key = `${CALLS_KEY}:${customerId}--${attendantId}`;

            for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
                await conn.watch(key);

                const existing = await conn.get(key);
                if (!existing) {
                    await conn.unwatch();
                    throw new BadRequestException('Call não encontrada');
                }

                const call = JSON.parse(existing) as CallState;
                const updates = applyParticipantChange(call, userId, joined);
                const updated: CallState = { ...call, ...updates };

                const result = await conn.multi().set(key, JSON.stringify(updated)).exec();
                if (result) return successData(updated);
            }

            throw new Error('Falha ao atualizar participante da call após múltiplas tentativas (conflito de concorrência)');
        } catch (error: unknown) {
            return logError(error, '/calls/update-participant');
        } finally {
            conn.disconnect();
        }
    };

    public readonly mapper = (body: Request['body']): IInput => ({
        customerId: mapString(body.customerId),
        attendantId: mapString(body.attendantId),
        userId: mapString(body.userId),
        joined: mapBoolean({ v: body.joined, defaultV: false }),
    });
}
