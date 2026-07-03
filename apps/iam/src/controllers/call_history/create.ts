import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { mapString } from '#utils/mapper/string';
import { getCallHistoryModel } from '#models/singleton';
import { validateInput } from 'src/validations/call_history/create';
import { ICallHistoryController, ICallHistoryParams } from './params';

type IInput = ICallHistoryController['ICreate']['IInput'];
type IOutput = ICallHistoryController['ICreate']['IOutput'];

interface Props {
    mapped: IInput;
}

export class Create {
    public static readonly classId = Symbol.for('Controller > CallHistory > Create');

    private constructor() {}

    static construir(classId: symbol): Create {
        if (classId !== Symbol.for('Controller > CallHistory')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new Create();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const params = this.transform(props.mapped);
            logger.info({ callId: params.callId, customerId: params.customerId, attendantId: params.attendantId }, 'call history create');

            const model = getCallHistoryModel();
            const doc = await model.create(params);

            const output: ICallHistoryParams = {
                _id: doc._id.toString(),
                callId: doc.callId,
                customerId: doc.customerId,
                customerName: doc.customerName,
                attendantId: doc.attendantId,
                attendantName: doc.attendantName,
                roomName: doc.roomName,
                meetingId: doc.meetingId,
                accumulatedMs: doc.accumulatedMs,
                startedAt: doc.startedAt,
                endedAt: doc.endedAt,
                tokensToBeCharged: doc.tokensToBeCharged,
            };

            return successData(output);
        } catch (error: unknown) {
            return logError(error, '/call-history/create');
        }
    };

    public readonly mapper = (body: Request['body']): IInput => ({
        callId: mapString(body.callId),
        customerId: mapString(body.customerId),
        customerName: mapString(body.customerName),
        attendantId: mapString(body.attendantId),
        attendantName: mapString(body.attendantName),
        roomName: mapString(body.roomName),
        meetingId: mapString(body.meetingId),
        accumulatedMs: typeof body.accumulatedMs === 'number' ? body.accumulatedMs : 0,
        startedAt: body.startedAt ?? null,
        endedAt: body.endedAt ?? null,
        tokensToBeCharged: typeof body.tokensToBeCharged === 'number' ? body.tokensToBeCharged : 0,
    });

    private readonly transform = (mapped: IInput): IInput => {
        const zodResult = validateInput(mapped);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);
        return zodResult.data as unknown as IInput;
    };
}
