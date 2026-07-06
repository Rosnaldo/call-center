import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { ChatAttendantment, Message } from '@repo/shared-types';
import { notifyChatMessageSent } from 'src/services/realtime';
import { ICreateSendMessageInput, IChatController } from './params';

type IOutput = IChatController['ISendMessage']['IOutput'];

const CHAT_KEY = 'chat';

interface Props {
    traceId: string;
    mapped: ICreateSendMessageInput;
}

export class SendMessage {
    public static readonly classId = Symbol.for('Controller > Chat > SendMessage');

    private constructor() {}

    static construir(classId: symbol): SendMessage {
        if (classId !== Symbol.for('Controller > Chat')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new SendMessage();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const { traceId } = props;
            const { customerId, attendantId, sender, text } = props.mapped;
            logger.info({ customerId, attendantId, sender }, 'chat send message');

            if (!customerId || !attendantId) throw new BadRequestException('customerId e attendantId são obrigatórios');
            if (sender !== 'attendant' && sender !== 'customer') throw new BadRequestException('sender inválido');
            if (!text) throw new BadRequestException('text é obrigatório');

            const redis = getRedisClient();
            const key = `${CHAT_KEY}:${customerId}--${attendantId}`;
            const existing = await redis.get(key);
            const chat: ChatAttendantment = existing
                ? (JSON.parse(existing) as ChatAttendantment)
                : { id: `${customerId}--${attendantId}`, attendatId: attendantId, customerId, messages: [] };

            const message: Message = {
                id: uuidv4(),
                sender,
                text,
                timestamp: new Date().toISOString(),
            };

            chat.messages.push(message);
            await redis.set(key, JSON.stringify(chat));

            notifyChatMessageSent(traceId, customerId, attendantId, message).catch(() => {});

            return successData(message);
        } catch (error: unknown) {
            return logError(error, '/chat/send-message');
        }
    };

    public readonly mapper = (body: Request['body']): ICreateSendMessageInput => ({
        customerId: mapString(body.customerId),
        attendantId: mapString(body.attendantId),
        sender: body.sender,
        text: mapString(body.text),
    });
}
