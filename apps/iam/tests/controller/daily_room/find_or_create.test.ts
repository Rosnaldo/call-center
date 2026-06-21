import { dailyApi } from 'src/apis/daily';
import { DailyRoomController } from 'src/controllers/daily_room';
import { isSuccess } from 'src/utils/either';
import { AxiosError } from 'axios';

jest.mock('src/apis/daily', () => ({
    dailyApi: {
        get: jest.fn(),
        post: jest.fn(),
    },
}));

const api = dailyApi as jest.Mocked<typeof dailyApi>;

const mockRoom = {
    id: 'room-id-1',
    name: 'my-room',
    api_created: true,
    privacy: 'public',
    url: 'https://meetcent.daily.co/my-room',
    created_at: '2024-01-01T00:00:00.000Z',
};

beforeEach(() => {
    jest.clearAllMocks();
});

describe('Controller > DailyRoom > FindOrCreate', () => {
    it('retorna a sala quando ela já existe no Daily', async () => {
        (api.get as jest.Mock).mockResolvedValue({ data: mockRoom });

        const controller = new DailyRoomController();
        const mapped = controller.findOrCreate.mapper({ roomName: 'my-room' });
        const either = await controller.findOrCreate.exec({ mapped });

        if (!isSuccess(either)) throw new Error(`Expected success, got: ${either.message}`);

        expect(api.get).toHaveBeenCalledWith('/rooms/my-room');
        expect(api.post).not.toHaveBeenCalled();
        expect(either.data.id).toBe(mockRoom.id);
        expect(either.data.name).toBe(mockRoom.name);
        expect(either.data.url).toBe(mockRoom.url);
    });

    it('cria uma sala nova quando não existe no Daily', async () => {
        const notFoundError = new AxiosError('Not Found', '404', undefined, undefined, {
            status: 404,
            data: {},
            statusText: 'Not Found',
            headers: {},
            config: {} as any,
        });
        (api.get as jest.Mock).mockRejectedValue(notFoundError);
        (api.post as jest.Mock).mockResolvedValue({ data: mockRoom });

        const controller = new DailyRoomController();
        const mapped = controller.findOrCreate.mapper({ roomName: 'my-room' });
        const either = await controller.findOrCreate.exec({ mapped });

        if (!isSuccess(either)) throw new Error(`Expected success, got: ${either.message}`);

        expect(api.get).toHaveBeenCalledWith('/rooms/my-room');
        expect(api.post).toHaveBeenCalledWith('/rooms', { name: 'my-room' });
        expect(either.data.id).toBe(mockRoom.id);
        expect(either.data.url).toBe(mockRoom.url);
    });

    it('retorna isError false e status 200 em caso de sucesso', async () => {
        (api.get as jest.Mock).mockResolvedValue({ data: mockRoom });

        const controller = new DailyRoomController();
        const mapped = controller.findOrCreate.mapper({ roomName: 'my-room' });
        const either = await controller.findOrCreate.exec({ mapped });

        expect(either.isError).toBe(false);
        expect(either.status).toBe(200);
    });

    it('retorna erro quando a API do Daily falha', async () => {
        (api.get as jest.Mock).mockRejectedValue(new Error('Daily API unavailable'));

        const controller = new DailyRoomController();
        const mapped = controller.findOrCreate.mapper({ roomName: 'my-room' });
        const either = await controller.findOrCreate.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(500);
    });
});
