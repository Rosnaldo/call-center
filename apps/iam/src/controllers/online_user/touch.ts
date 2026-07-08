import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { validateInput, ITouchInput } from 'src/validations/online_user/touch';

const ONLINE_USERS_PREFIX = 'online_user:';
const TTL_SECONDS = 90;

interface Props {
    mapped: ITouchInput;
}

// Refreshes presence TTL only — doesn't touch status/tokens/anything else.
// Heartbeats call this instead of /online-users/add so a periodic keep-alive
// can't clobber a status set elsewhere (e.g. 'in-call') back to whatever was
// snapshotted when this socket first connected.
export class Touch {
    public static readonly classId = Symbol.for('Controller > OnlineUser > Touch');

    private constructor() {}

    static construir(classId: symbol): Touch {
        if (classId !== Symbol.for('Controller > OnlineUser')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new Touch();
    }

    public readonly exec = async (props: Props): Promise<Either<{ existed: boolean }>> => {
        try {
            const { id } = this.transform(props.mapped);
            logger.info({ id }, 'online user touch');

            const redis = getRedisClient();
            const touched = await redis.expire(`${ONLINE_USERS_PREFIX}${id}`, TTL_SECONDS);

            return successData({ existed: touched === 1 });
        } catch (error: unknown) {
            return logError(error, '/online-users/touch');
        }
    };

    public readonly mapper = (body: Request['body']): ITouchInput => ({
        id: mapString(body.id),
    });

    private readonly transform = (mapped: ITouchInput): ITouchInput => {
        const zodResult = validateInput(mapped);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);
        return zodResult.data as ITouchInput;
    };
}
