import { v4 as uuidv4 } from 'uuid';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { uploadToS3 } from '#helpers/s3';
import { joinUrl } from '#utils/join_url';
import properties from '#properties';
import { ChatAttendantment, Message } from '@repo/shared-types';
import { notifyChatMessageSent } from 'src/services/realtime';
import { IUploadFileInput, IChatController } from './params';

type IOutput = IChatController['IUploadFile']['IOutput'];

const CHAT_KEY = 'chat';

interface Props {
    traceId: string;
    mapped: IUploadFileInput;
}

function formatSize(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export class UploadFile {
    public static readonly classId = Symbol.for('Controller > Chat > UploadFile');

    private constructor() {}

    static construir(classId: symbol): UploadFile {
        if (classId !== Symbol.for('Controller > Chat')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new UploadFile();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const { traceId } = props;
            const { customerId, attendantId, sender, buffer, originalName, mimetype, size } = props.mapped;
            logger.info({ customerId, attendantId, sender, originalName }, 'chat upload file');

            if (!customerId || !attendantId) throw new BadRequestException('customerId e attendantId são obrigatórios');
            if (sender !== 'attendant' && sender !== 'customer') throw new BadRequestException('sender inválido');
            if (!buffer || !originalName) throw new BadRequestException('arquivo é obrigatório');

            const bucket = properties.awsS3Bucket!;
            const s3Path = `chat/${properties.nodeEnv}/${customerId}--${attendantId}/${uuidv4()}-${originalName}`;
            await uploadToS3({
                bucket,
                key: s3Path,
                body: buffer,
                contentType: mimetype,
            });

            const message: Message = {
                id: uuidv4(),
                sender,
                timestamp: new Date().toISOString(),
                file: {
                    name: originalName,
                    size: formatSize(size),
                    type: mimetype.startsWith('image/') ? 'image' : 'document',
                    url: joinUrl(properties.s3Host, s3Path),
                },
            };

            const redis = getRedisClient();
            const key = `${CHAT_KEY}:${customerId}--${attendantId}`;
            const existing = await redis.get(key);
            const chat: ChatAttendantment = existing
                ? (JSON.parse(existing) as ChatAttendantment)
                : { id: `${customerId}--${attendantId}`, attendatId: attendantId, customerId, messages: [] };

            chat.messages.push(message);
            await redis.set(key, JSON.stringify(chat));

            notifyChatMessageSent(traceId, customerId, attendantId, message).catch(() => {});

            return successData(message);
        } catch (error: unknown) {
            return logError(error, '/chat/upload-file');
        }
    };
}
