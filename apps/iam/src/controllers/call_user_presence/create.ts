import { Request } from 'express';
import { logError } from '#utils/log_error';
import { ICallUserPresenceController } from './params';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { validateInput } from 'src/validations/call_user_presence/create';
import { mapString } from '#utils/mapper/string';
import { getCallUserPresenceDao } from '#daos/singleton';
import { CallUserPresenceUtils } from '#schemas/call_user_presence/utils';
import { PresenceEventType } from '@repo/shared-types';

type IInput = ICallUserPresenceController['ICreate']['IInput'];
type IOutput = ICallUserPresenceController['ICreate']['IOutput'];

interface Props {
    mapped: IInput;
}

export class Create {
    public static readonly classId = Symbol.for('Controller > CallUserPresence > Create');

    private constructor() {}

    static construir(classId: symbol): Create {
        if (classId !== Symbol.for('Controller > CallUserPresence')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new Create();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const params = this.transform(props.mapped);
            const doc = await getCallUserPresenceDao().inserir(params);
            const utils = new CallUserPresenceUtils();
            return successData(utils.toObject(doc));
        } catch (error: unknown) {
            return logError(error, '/iam/call-user-presences/create');
        }
    };

    public readonly mapper = (body: Request['body']): IInput => ({
        roomName: mapString(body.roomName),
        sessionId: mapString(body.sessionId),
        userId: mapString(body.userId),
        type: mapString(body.type) as PresenceEventType,
        occurredAt: new Date(body.occurredAt),
    });

    public readonly transform = (mapped: IInput): IInput => {
        const zodResult = validateInput(mapped);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);
        return zodResult.data as unknown as IInput;
    };
}
