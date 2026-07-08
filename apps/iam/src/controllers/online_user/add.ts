import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { toUndefined } from '#utils/mapper/to_undefined';
import { validateInput } from 'src/validations/online_user/add';
import { IOnlineUserController } from './params';

type IInput = IOnlineUserController['IAdd']['IInput'];
type IOutput = IOnlineUserController['IAdd']['IOutput'];

const ONLINE_USERS_PREFIX = 'online_user:';
const TTL_SECONDS = 90;

interface Props {
    mapped: IInput;
}

export class Add {
    public static readonly classId = Symbol.for('Controller > OnlineUser > Add');

    private constructor() {}

    static construir(classId: symbol): Add {
        if (classId !== Symbol.for('Controller > OnlineUser')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new Add();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            logger.info({ id: props.mapped.id }, 'online user add');
            const params = this.transform(props.mapped);
            const redis = getRedisClient();

            const key = `${ONLINE_USERS_PREFIX}${params.id}`;
            // A reconnect (page reload, network blip) always calls this with
            // whatever status the client had cached at connect time — which
            // defaults to 'idle', since the client has no way to know it's
            // mid-call at that point. This is a full upsert, so without this
            // check every reconnect would clobber a real 'in-call' status
            // back to idle. Anything else (idle/disconnecting/offline) still
            // gets overwritten by the incoming value as before, since only
            // 'in-call' reflects state the caller couldn't have known about.
            const existingRaw = await redis.get(key);
            const existingStatus = existingRaw ? (JSON.parse(existingRaw) as IOutput).status : undefined;
            const toStore: IOutput = { ...params, status: existingStatus === 'in-call' ? existingStatus : params.status };

            await redis.set(key, JSON.stringify(toStore), 'EX', TTL_SECONDS);
            return successData(toStore);
        } catch (error: unknown) {
            return logError(error, '/online-users/add');
        }
    };

    public readonly mapper = (body: Request['body']): IInput => {
        const { id, name, slug, email, phone, role, avatarUrl, status, tokens } = body;
        return {
            id: mapString(id),
            name: mapString(name),
            slug: mapString(slug),
            email: toUndefined('email', email),
            phone: toUndefined('phone', phone),
            role: mapString(role) as IInput['role'],
            avatarUrl: toUndefined('avatarUrl', avatarUrl),
            status: mapString(status) as IInput['status'],
            tokens: typeof tokens === 'number' ? tokens : undefined,
        };
    };

    public readonly transform = (mapped: IInput): IInput => {
        const zodResult = validateInput(mapped);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);
        return zodResult.data as unknown as IInput;
    };
}
