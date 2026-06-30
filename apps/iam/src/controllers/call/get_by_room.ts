import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { CallState } from '@repo/shared-types';
import { ICallController } from './params';

type IOutput = ICallController['IGet']['IOutput'];

const CALLS_KEY = 'calls';

interface Props {
    roomName: string;
}

export class GetByRoom {
    public static readonly classId = Symbol.for('Controller > Call > GetByRoom');

    private constructor() {}

    static construir(classId: symbol): GetByRoom {
        if (classId !== Symbol.for('Controller > Call')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new GetByRoom();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const { roomName } = props;
            logger.info({ roomName }, 'call get by room');
            if (!roomName) throw new BadRequestException('roomName é obrigatório');

            const redis = getRedisClient();
            const keys = await redis.keys(`${CALLS_KEY}:*`);
            if (keys.length === 0) throw new BadRequestException('Call não encontrada');
            const values = await redis.mget(keys);
            const call = values
                .filter((v): v is string => v !== null)
                .map((v) => JSON.parse(v) as CallState)
                .find((c) => c.roomName === roomName);

            if (!call) throw new BadRequestException('Call não encontrada');

            return successData(call);
        } catch (error: unknown) {
            return logError(error, '/calls/get-by-room');
        }
    };

    public readonly mapper = (query: Request['query']): Props => ({
        roomName: mapString(query.roomName as string),
    });
}
