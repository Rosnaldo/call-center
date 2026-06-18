import { logError } from '#utils/log_error';
import { IDailyRoomController, IDailyRoom } from './params';
import { Either, successData } from '#utils/either';
import { dailyApi } from '#apis/daily';

type IOutput = IDailyRoomController['IFindOrCreate']['IOutput'];

interface Props {
    mapped: IDailyRoomController['IFindOrCreate']['IInput'];
}

interface IDailyRoomListResponse {
    total_count: number;
    data: IDailyRoom[];
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

    public readonly exec = async (_props: Props): Promise<Either<IOutput>> => {
        try {
            const room = await this.findOrCreate();
            return successData(room);
        } catch (error: unknown) {
            return logError(error, '/daily/rooms/find-or-create');
        }
    };

    public readonly mapper = (): IDailyRoomController['IFindOrCreate']['IInput'] => ({});

    private readonly findOrCreate = async (): Promise<IDailyRoom> => {
        const { data: list } = await dailyApi.get<IDailyRoomListResponse>('/rooms');
        if (list.total_count > 0) return list.data[0];
        const { data: created } = await dailyApi.post<IDailyRoom>('/rooms');
        return created;
    };
}
