import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { mapString } from '#utils/mapper/string';
import { validateInput, IUpdateStatusInput } from 'src/validations/online_user/update_status';
import { patchOnlineUserIfPresent } from 'src/interactors/online_user';

interface Props {
    mapped: IUpdateStatusInput;
}

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

            // no cached presence entry (not currently connected) — nothing to
            // patch, the fresh value will be picked up whenever they reconnect
            await patchOnlineUserIfPresent(id, { status });

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
