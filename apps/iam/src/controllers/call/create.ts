import { Request } from 'express';
import { logError } from '#utils/log_error';
import { ICallController } from './params';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { validateInput } from 'src/validations/call/create';
import { mapString } from '#utils/mapper/string';
import { getCallDao } from '#daos/singleton';
import { CallUtils } from '#schemas/call/utils';
import { dailyApi } from '#apis/daily';
import { IDailyRoom } from '#controllers/daily_room/params';

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
            const params = this.transform(props.mapped);
            const { data: room } = await dailyApi.post<IDailyRoom>('/rooms');
            const doc = await getCallDao().inserir({ ...params, roomName: room.name });
            const utils = new CallUtils();
            return successData(utils.toObject(doc));
        } catch (error: unknown) {
            return logError(error, '/iam/calls/create');
        }
    };

    public readonly mapper = (body: Request['body']): IInput => ({
        customerId: mapString(body.customerId),
        customerName: mapString(body.customerName),
        attendantId: mapString(body.attendantId),
        attendantName: mapString(body.attendantName),
    });

    public readonly transform = (mapped: IInput): IInput => {
        const zodResult = validateInput(mapped);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);
        return zodResult.data as unknown as IInput;
    };
}
