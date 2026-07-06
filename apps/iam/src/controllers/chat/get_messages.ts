import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { ChatAttendantment } from '@repo/shared-types';
import { IGetMessagesInput, IChatController } from './params';

type IOutput = IChatController['IGetMessages']['IOutput'];

const CHAT_KEY = 'chat';

interface Props {
    mapped: IGetMessagesInput;
}

export class GetMessages {
    public static readonly classId = Symbol.for('Controller > Chat > GetMessages');

    private constructor() {}

    static construir(classId: symbol): GetMessages {
        if (classId !== Symbol.for('Controller > Chat')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new GetMessages();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const { customerId, attendantId } = props.mapped;
            logger.info({ customerId, attendantId }, 'chat get messages');
            if (!customerId || !attendantId) throw new BadRequestException('customerId e attendantId são obrigatórios');

            const redis = getRedisClient();
            const key = `${CHAT_KEY}:${customerId}--${attendantId}`;
            const existing = await redis.get(key);

            const chat: ChatAttendantment = existing
                ? (JSON.parse(existing) as ChatAttendantment)
                : { id: `${customerId}--${attendantId}`, attendatId: attendantId, customerId, messages: [] };

            return successData(chat);
        } catch (error: unknown) {
            return logError(error, '/chat/get-messages');
        }
    };

    public readonly mapper = (query: Request['query']): IGetMessagesInput => ({
        customerId: mapString(query.customerId as string),
        attendantId: mapString(query.attendantId as string),
    });
}
