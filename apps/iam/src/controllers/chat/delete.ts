import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { deleteFromS3 } from '#helpers/s3';
import properties from '#properties';
import { ChatAttendantment } from '@repo/shared-types';
import { IDeleteInput, IChatController } from './params';

type IOutput = IChatController['IDelete']['IOutput'];

const CHAT_KEY = 'chat';

interface Props {
    mapped: IDeleteInput;
}

export class Delete {
    public static readonly classId = Symbol.for('Controller > Chat > Delete');

    private constructor() {}

    static construir(classId: symbol): Delete {
        if (classId !== Symbol.for('Controller > Chat')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new Delete();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const { customerId, attendantId } = props.mapped;
            logger.info({ customerId, attendantId }, 'chat delete');
            if (!customerId || !attendantId) throw new BadRequestException('customerId e attendantId são obrigatórios');

            const redis = getRedisClient();
            const key = `${CHAT_KEY}:${customerId}--${attendantId}`;
            const existing = await redis.get(key);

            if (existing) {
                const chat = JSON.parse(existing) as ChatAttendantment;
                const bucket = properties.awsS3Bucket!;

                await Promise.all(chat.messages
                    .filter((message) => !!message.file)
                    .map((message) => {
                        const s3Key = message.file!.url.replace(properties.s3Host, '').replace(/^\/+/, '');
                        return deleteFromS3({ Bucket: bucket, Key: s3Key }).catch(() => {});
                    }));
            }

            await redis.del(key);

            return successData({});
        } catch (error: unknown) {
            return logError(error, '/chat/delete');
        }
    };

    public readonly mapper = (body: Request['body']): IDeleteInput => ({
        customerId: mapString(body.customerId),
        attendantId: mapString(body.attendantId),
    });
}
