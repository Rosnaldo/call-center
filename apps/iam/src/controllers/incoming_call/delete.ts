import { Request } from 'express';

import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { validateInput, IDeleteInput } from 'src/validations/incoming_call/delete';
import { realtimeApi } from '#apis/realtime';

const INCOMING_CALL_KEY = 'incoming_calls';

interface Props {
    mapped: IDeleteInput;
}

export class Delete {
    public static readonly classId = Symbol.for('Controller > IncomingCall > Delete');

    private constructor() {}

    static construir(classId: symbol): Delete {
        if (classId !== Symbol.for('Controller > IncomingCall')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new Delete();
    }

    public readonly exec = async (props: Props): Promise<Either<{}>> => {
        try {
            const { customerId, attendantId } = this.transform(props.mapped);
            const redis = getRedisClient();

            await redis.hdel(INCOMING_CALL_KEY, attendantId);

            realtimeApi.post('/webhooks/iam', {
                event: 'cancel_incoming_call',
                payload: { customerId, attendantId },
            }).catch((err) => console.error('[Realtime] cancel_incoming_call failed:', err));

            return successData({});
        } catch (error: unknown) {
            return logError(error, '/incoming-calls/delete');
        }
    };

    public readonly mapper = (body: Request['body']): IDeleteInput => ({
        customerId: mapString(body.customerId),
        attendantId: mapString(body.attendantId),
    });

    private readonly transform = (mapped: IDeleteInput): IDeleteInput => {
        const zodResult = validateInput(mapped);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);
        return zodResult.data as IDeleteInput;
    };
}
