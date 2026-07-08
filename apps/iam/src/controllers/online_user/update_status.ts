import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { IOnlineUser } from '#schemas/online_user/types';
import { validateInput, IUpdateStatusInput } from 'src/validations/online_user/update_status';

const ONLINE_USERS_PREFIX = 'online_user:';
const TTL_SECONDS = 90;

interface Props {
    mapped: IUpdateStatusInput;
}

// Used to reset both participants to idle once onMeetingEnded really ends a
// call — distinct from /calls/complete, which is the explicit "hang up"
// button flow and also fires call_completed (the calculating-tokens modal).
export class UpdateStatus {
    public static readonly classId = Symbol.for('Controller > OnlineUser > UpdateStatus');

    private constructor() {}

    static construir(classId: symbol): UpdateStatus {
        if (classId !== Symbol.for('Controller > OnlineUser')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new UpdateStatus();
    }

    public readonly exec = async (props: Props): Promise<Either<{}>> => {
        try {
            const { id, status } = this.transform(props.mapped);
            logger.info({ id, status }, 'online user update status');

            const redis = getRedisClient();
            const key = `${ONLINE_USERS_PREFIX}${id}`;
            const raw = await redis.get(key);
            // no cached presence entry (not currently connected) — nothing to
            // patch, the fresh value will be picked up whenever they reconnect
            if (!raw) return successData({});

            const existing = JSON.parse(raw) as IOnlineUser['IParams'];
            const updated: IOnlineUser['IParams'] = { ...existing, status };
            await redis.set(key, JSON.stringify(updated), 'EX', TTL_SECONDS);

            return successData({});
        } catch (error: unknown) {
            return logError(error, '/online-users/update-status');
        }
    };

    public readonly mapper = (body: Request['body']): IUpdateStatusInput => ({
        id: mapString(body.id),
        status: body.status,
    });

    private readonly transform = (mapped: IUpdateStatusInput): IUpdateStatusInput => {
        const zodResult = validateInput(mapped);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);
        return zodResult.data as IUpdateStatusInput;
    };
}
