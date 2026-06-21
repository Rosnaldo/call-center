import { Request } from 'express';

import { logError } from '#utils/log_error';
import { IDailyRoomController, IDailyRoom } from './params';
import { Either, successData } from '#utils/either';
import { dailyApi } from '#apis/daily';
import { mapString } from '#utils/mapper/string';
import { AxiosError } from 'axios';

type IInput = IDailyRoomController['IFindOrCreate']['IInput'];
type IOutput = IDailyRoomController['IFindOrCreate']['IOutput'];

interface Props {
    mapped: IInput;
}

export class FindOrCreate {
    public static readonly classId = Symbol.for('Controller > DailyRoom > FindOrCreate');

    private constructor() {}

    static construir(classId: symbol): FindOrCreate {
        if (classId !== Symbol.for('Controller > DailyRoom')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new FindOrCreate();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const room = await this.findOrCreate(props.mapped.roomName);
            return successData(room);
        } catch (error: unknown) {
            return logError(error, '/daily/rooms/find-or-create');
        }
    };

    public readonly mapper = (body: Request['body']): IInput => ({
        roomName: mapString(body.roomName),
    });

    private readonly findOrCreate = async (roomName: string): Promise<IDailyRoom> => {
        try {
            const { data: room } = await dailyApi.get<IDailyRoom>(`/rooms/${roomName}`);
            return room;
        } catch (error: unknown) {
            if (error instanceof AxiosError && error.response?.status === 404) {
                const { data: created } = await dailyApi.post<IDailyRoom>('/rooms', { name: roomName });
                return created;
            }
            throw error;
        }
    };
}
