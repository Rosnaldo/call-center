import { Request } from 'express';
import { CallState } from '@repo/shared-types';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { getUserDao } from '#daos/singleton';
import { mapString } from '#utils/mapper/string';
import { getRoomPresenceUserIds, ejectBothParticipantsFromRoom } from 'src/services/daily';
import { AddParticipant } from './add_participant';
import { Create } from './create';
import { Delete } from './delete';
import { ICallController } from './params';

type IOutput = ICallController['ISyncActiveCall']['IOutput'];
type Redis = ReturnType<typeof getRedisClient>;

const CALLS_KEY = 'calls';
const ROOMS_KEY = 'daily_rooms';

interface Props {
    userId: string;
}

function parseRoomName(room: string): { customerSlug: string; attendantSlug: string } | null {
    const parts = room.split('--');
    if (parts.length !== 2) return null;
    return { customerSlug: parts[0], attendantSlug: parts[1] };
}

export class SyncActiveCall {
    public static readonly classId = Symbol.for('Controller > Call > SyncActiveCall');

    private readonly addParticipant: AddParticipant;
    private readonly create: Create;
    private readonly delete: Delete;

    private constructor(classId: symbol) {
        this.addParticipant = AddParticipant.construir(classId);
        this.create = Create.construir(classId);
        this.delete = Delete.construir(classId);
    }

    static construir(classId: symbol): SyncActiveCall {
        if (classId !== Symbol.for('Controller > Call')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new SyncActiveCall(classId);
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const { userId } = props;
            logger.info({ userId }, 'call sync active call');
            if (!userId) throw new BadRequestException('userId é obrigatório');

            const redis = getRedisClient();
            const call = await this.findCallByUser(redis, userId);

            if (call) {
                const presentUserIds = await getRoomPresenceUserIds(call.roomName);
                const hasOtherParticipant = presentUserIds.some((id) => id !== userId);

                // Nobody's actually in the Daily room, or the only one there
                // is this same connecting user — there's no real call
                // happening, so tear down the stale record and the meeting
                // itself instead of keeping either alive.
                if (!hasOtherParticipant) {
                    await this.delete.exec({ mapped: { customerId: call.customerId, attendantId: call.attendantId } });
                    await ejectBothParticipantsFromRoom(call.roomName);
                    return successData({ call: null, shouldJoin: false });
                }

                // Marks this user active on the call (instead of a plain TTL
                // touch) — same effect add-participant's own join path has,
                // refreshing the TTL as a side effect of the write.
                const updated = await this.addParticipant.exec({
                    mapped: { customerId: call.customerId, attendantId: call.attendantId, userId },
                });
                const currentCall = updated.isError ? call : updated.data;

                return successData({ call: currentCall, shouldJoin: true });
            }

            const created = await this.selfHealFromPresence(redis, userId);
            return successData({ call: created, shouldJoin: created !== null });
        } catch (error: unknown) {
            return logError(error, '/calls/sync-active-call');
        }
    };

    private readonly findCallByUser = async (redis: Redis, userId: string): Promise<CallState | null> => {
        const keys = await redis.keys(`${CALLS_KEY}:*`);
        if (keys.length === 0) return null;

        const values = await redis.mget(keys);
        return values
            .filter((v): v is string => v !== null)
            .map((v) => JSON.parse(v) as CallState)
            .find((c) => c.customerId === userId || c.attendantId === userId) ?? null;
    };

    private readonly selfHealFromPresence = async (redis: Redis, userId: string): Promise<CallState | null> => {
        const rooms = await redis.smembers(ROOMS_KEY);

        for (const room of rooms) {
            const presentUserIds = await getRoomPresenceUserIds(room);
            if (!presentUserIds.includes(userId)) continue;

            const parsed = parseRoomName(room);
            if (!parsed) continue;

            const [customer, attendant] = await Promise.all([
                getUserDao().findOne({ slug: parsed.customerSlug }),
                getUserDao().findOne({ slug: parsed.attendantSlug }),
            ]);
            if (!customer || !attendant) continue;

            const counterpartId = String(customer._id) === userId ? String(attendant._id) : String(customer._id);
            const activeUserIds = presentUserIds.includes(counterpartId) ? [userId, counterpartId] : [userId];

            const either = await this.create.exec({
                mapped: {
                    id: `${customer._id}--${attendant._id}`,
                    customerId: String(customer._id),
                    customerName: `${customer.firstName} ${customer.lastName}`,
                    attendantId: String(attendant._id),
                    attendantName: `${attendant.firstName} ${attendant.lastName}`,
                    roomName: room,
                    activeUserIds,
                    accumulatedMs: 0,
                    overlapStartedAt: null,
                    startedAt: new Date(),
                    endedAt: null,
                    isPlaying: false,
                    tokensToBeCharged: 0,
                },
            });
            if (either.isError) continue;
            return either.data;
        }

        return null;
    };

    public readonly mapper = (body: Request['body']): Props => ({
        userId: mapString(body.userId),
    });
}
