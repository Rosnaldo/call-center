import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { validateInput, IUpdateTokensInput } from 'src/validations/online_user/update_tokens';
import { IOnlineUser } from '#schemas/online_user/types';

const ONLINE_USERS_PREFIX = 'online_user:';
const TTL_SECONDS = 90;

interface Props {
    mapped: IUpdateTokensInput;
}

export class UpdateTokens {
    public static readonly classId = Symbol.for('Controller > OnlineUser > UpdateTokens');

    private constructor() {}

    static construir(classId: symbol): UpdateTokens {
        if (classId !== Symbol.for('Controller > OnlineUser')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new UpdateTokens();
    }

    public readonly exec = async (props: Props): Promise<Either<{}>> => {
        try {
            const { id, tokens } = this.transform(props.mapped);
            logger.info({ id, tokens }, 'online user update tokens');

            const redis = getRedisClient();
            const key = `${ONLINE_USERS_PREFIX}${id}`;
            const raw = await redis.get(key);
            // no cached presence entry for this user (e.g. not currently
            // connected) — nothing to patch, the fresh value will be picked
            // up whenever they reconnect
            if (!raw) return successData({});

            const existing = JSON.parse(raw) as IOnlineUser['IParams'];
            const updated: IOnlineUser['IParams'] = { ...existing, tokens };
            await redis.set(key, JSON.stringify(updated), 'EX', TTL_SECONDS);

            return successData({});
        } catch (error: unknown) {
            return logError(error, '/online-users/update-tokens');
        }
    };

    public readonly mapper = (body: Request['body']): IUpdateTokensInput => ({
        id: mapString(body.id),
        tokens: typeof body.tokens === 'number' ? body.tokens : Number(body.tokens),
    });

    private readonly transform = (mapped: IUpdateTokensInput): IUpdateTokensInput => {
        const zodResult = validateInput(mapped);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);
        return zodResult.data as IUpdateTokensInput;
    };
}
