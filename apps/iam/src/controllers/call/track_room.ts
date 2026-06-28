import { Request } from 'express';

import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';

const ROOMS_KEY = 'daily_rooms';

interface TrackInput {
    roomName: string;
}

interface Props {
    mapped: TrackInput;
}

export class TrackRoom {
    public static readonly classId = Symbol.for('Controller > Call > TrackRoom');

    private constructor() {}

    static construir(classId: symbol): TrackRoom {
        if (classId !== Symbol.for('Controller > Call')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new TrackRoom();
    }

    public readonly exec = async (props: Props): Promise<Either<{ roomName: string }>> => {
        try {
            const { roomName } = props.mapped;
            if (!roomName) throw new BadRequestException('roomName é obrigatório');

            const redis = getRedisClient();
            await redis.sadd(ROOMS_KEY, roomName);
            return successData({ roomName });
        } catch (error: unknown) {
            return logError(error, '/calls/track-room');
        }
    };

    public readonly mapper = (body: Request['body']): TrackInput => ({
        roomName: mapString(body.roomName),
    });
}

export class DeleteRooms {
    public static readonly classId = Symbol.for('Controller > Call > DeleteRooms');

    private constructor() {}

    static construir(classId: symbol): DeleteRooms {
        if (classId !== Symbol.for('Controller > Call')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new DeleteRooms();
    }

    public readonly exec = async (): Promise<Either<{ rooms: string[] }>> => {
        try {
            const redis = getRedisClient();
            const rooms = await redis.smembers(ROOMS_KEY);
            if (rooms.length) await redis.del(ROOMS_KEY);
            return successData({ rooms });
        } catch (error: unknown) {
            return logError(error, '/calls/rooms');
        }
    };
}
