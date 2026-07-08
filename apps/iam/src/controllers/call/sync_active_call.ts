import { Request } from 'express';
import { CallState } from '@repo/shared-types';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { getUserDao } from '#daos/singleton';
import { mapString } from '#utils/mapper/string';
import { isUserPresentInRoom } from 'src/services/daily';
import { Touch } from './touch';
import { Create } from './create';
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

// Called by realtime whenever a user's websocket connects — reconciles
// redis's call state against real Daily meeting presence, for the case
// where a page refresh, a redis restart, or any other gap left the two
// sides disagreeing about whether a call is still going on. Unlike the old
// client-driven version this replaces, there's no roomName hint from the
// browser (realtime only knows the user just connected, not what Daily room
// their page has open) — so "is this user in a meeting" is answered by
// checking presence across every currently-tracked room instead.
//
// - call exists -> refresh its TTL; if the user isn't present in its room,
//   shouldJoin: true so the client rejoins.
// - no call, but presence shows the user is in one of the tracked rooms ->
//   self-heal by creating the call record for that room, same recovery path
//   as onMeetingStarted.
export class SyncActiveCall {
    public static readonly classId = Symbol.for('Controller > Call > SyncActiveCall');

    private readonly touch: Touch;
    private readonly create: Create;

    private constructor(classId: symbol) {
        this.touch = Touch.construir(classId);
        this.create = Create.construir(classId);
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
                // One of the two designated TTL touchpoints (the other is
                // onMeetingStarted) — a call that's only ever being synced,
                // with no participant join/leave in between, would otherwise
                // never get its expiry pushed out.
                await this.touch.exec({ mapped: { customerId: call.customerId, attendantId: call.attendantId } });

                const present = await isUserPresentInRoom(call.roomName, userId);
                return successData({ call, shouldJoin: !present });
            }

            const created = await this.selfHealFromPresence(redis, userId);
            return successData({ call: created, shouldJoin: false });
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

    // `daily_rooms` is a redis SET of every currently-tracked (active) Daily
    // room — a non-destructive peek, unlike DeleteRooms's smembers+del sweep
    // used at server startup cleanup.
    private readonly selfHealFromPresence = async (redis: Redis, userId: string): Promise<CallState | null> => {
        const rooms = await redis.smembers(ROOMS_KEY);

        for (const room of rooms) {
            const present = await isUserPresentInRoom(room, userId);
            if (!present) continue;

            const parsed = parseRoomName(room);
            if (!parsed) continue;

            const [customer, attendant] = await Promise.all([
                getUserDao().findOne({ slug: parsed.customerSlug }),
                getUserDao().findOne({ slug: parsed.attendantSlug }),
            ]);
            if (!customer || !attendant) continue;

            const either = await this.create.exec({
                mapped: {
                    id: `${customer._id}--${attendant._id}`,
                    customerId: String(customer._id),
                    customerName: `${customer.firstName} ${customer.lastName}`,
                    attendantId: String(attendant._id),
                    attendantName: `${attendant.firstName} ${attendant.lastName}`,
                    roomName: room,
                    activeUserIds: [],
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

    // Called server-to-server by realtime (authenticated as a service
    // account, not the end user) on behalf of whichever user just connected
    // — so unlike routes that resolve GetUser off the caller's own token,
    // userId has to travel explicitly in the body.
    public readonly mapper = (body: Request['body']): Props => ({
        userId: mapString(body.userId),
    });
}
