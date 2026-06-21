import { Request } from 'express';

import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { validateInput } from 'src/validations/call/create';
import { ICallController } from './params';

type IInput = ICallController['ICreate']['IInput'];
type IOutput = ICallController['ICreate']['IOutput'];

const REDIS_KEY = 'calls';

interface Props {
    mapped: IInput;
}

export class Create {
    public static readonly classId = Symbol.for('Controller > Call > Create');

    private constructor() {}

    static construir(classId: symbol): Create {
        if (classId !== Symbol.for('Controller > Call')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new Create();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const params = this.transform(props.mapped);
            const redis = getRedisClient();
            await redis.hset(REDIS_KEY, params.id, JSON.stringify(params));
            return successData(params);
        } catch (error: unknown) {
            return logError(error, '/calls/create');
        }
    };

    public readonly mapper = (body: Request['body']): IInput => {
        const { id, customerId, customerName, attendantId, attendantName, roomName, meetingId, status, wasAnswered } = body;
        return {
            id: mapString(id),
            customerId: mapString(customerId),
            customerName: mapString(customerName),
            attendantId: mapString(attendantId),
            attendantName: mapString(attendantName),
            roomName: mapString(roomName),
            meetingId: mapString(meetingId),
            status: mapString(status) as IInput['status'],
            wasAnswered: wasAnswered === true,
        };
    };

    private readonly transform = (mapped: IInput): IInput => {
        const zodResult = validateInput(mapped);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);
        return zodResult.data as unknown as IInput;
    };
}
