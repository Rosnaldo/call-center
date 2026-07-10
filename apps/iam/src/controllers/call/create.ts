import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { mapString } from '#utils/mapper/string';
import { mapArray } from '#utils/mapper/array';
import { CallStateBuilder } from '#schemas/call/utils';
import { validateInput } from 'src/validations/call/create';
import { ICallController } from './params';

type IInput = ICallController['ICreate']['IInput'];
type IOutput = ICallController['ICreate']['IOutput'];

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
            logger.info({ customerId: props.mapped.customerId, attendantId: props.mapped.attendantId }, 'call create');
            const params = this.transform(props.mapped);
            const saved = await new CallStateBuilder().create(params).save();
            return successData(saved);
        } catch (error: unknown) {
            return logError(error, '/calls/create');
        }
    };

    public readonly mapper = (body: Request['body']): IInput => {
        const { id, customerId, customerName, attendantId, attendantName, roomName, activeUserIds, accumulatedMs, overlapStartedAt, startedAt, endedAt, isPlaying, tokensToBeCharged } = body;
        return {
            id: mapString(id),
            customerId: mapString(customerId),
            customerName: mapString(customerName),
            attendantId: mapString(attendantId),
            attendantName: mapString(attendantName),
            roomName: mapString(roomName),
            activeUserIds: mapArray(activeUserIds, []),
            accumulatedMs: typeof accumulatedMs === 'number' ? accumulatedMs : 0,
            overlapStartedAt: typeof overlapStartedAt === 'number' ? overlapStartedAt : null,
            startedAt: startedAt ?? null,
            endedAt: endedAt ?? null,
            isPlaying: isPlaying === true,
            tokensToBeCharged: typeof tokensToBeCharged === 'number' ? tokensToBeCharged : 0,
            // Never taken from the request body — only /calls/complete may close a call.
            isClosed: false,
        };
    };

    private readonly transform = (mapped: IInput): IInput => {
        const zodResult = validateInput(mapped);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);
        return zodResult.data as unknown as IInput;
    };
}
