import { mongooseBootstrap } from 'src/mongoose_bootstrap';
import { disconnectMain } from 'src/db/singleton';
import { CallHistoryController } from 'src/controllers/call_history';
import { isSuccess } from 'src/utils/either';
import { getCallHistoryModel } from 'src/entities/models/singleton';

beforeAll(async () => {
    await mongooseBootstrap();
}, 300_000);

afterAll(async () => {
    await disconnectMain();
});

const buildBody = (overrides: Record<string, unknown> = {}) => ({
    callId: 'cust-1--att-1',
    customerId: 'cust-1',
    customerName: 'Test Customer',
    attendantId: 'att-1',
    attendantName: 'Test Attendant',
    roomName: 'test-customer--test-attendant',
    meetingId: 'meeting-123',
    accumulatedMs: 65_000,
    startedAt: new Date('2026-01-01T10:00:00Z'),
    endedAt: new Date('2026-01-01T10:01:05Z'),
    tokensToBeCharged: 1,
    ...overrides,
});

describe('Controller > CallHistory > Create', () => {
    it('persists the call history record in mongo and returns it', async () => {
        const controller = new CallHistoryController();
        const body = buildBody();
        const mapped = controller.create.mapper(body);
        const either = await controller.create.exec({ mapped });

        if (!isSuccess(either)) throw new Error(`Expected success, got: ${either.message}`);

        expect(either.data.callId).toBe(body.callId);
        expect(either.data.customerId).toBe(body.customerId);
        expect(either.data.accumulatedMs).toBe(body.accumulatedMs);
        expect(either.data.tokensToBeCharged).toBe(body.tokensToBeCharged);
        expect(either.data._id).toBeTruthy();

        const saved = await getCallHistoryModel().findById(either.data._id).lean();
        expect(saved).not.toBeNull();
        expect(saved!.customerId).toBe(body.customerId);
        expect(saved!.attendantId).toBe(body.attendantId);
        expect(new Date(saved!.endedAt as unknown as string).toISOString()).toBe(body.endedAt.toISOString());
    });

    it('allows an empty meetingId (rooms that never received meeting.started)', async () => {
        const controller = new CallHistoryController();
        const mapped = controller.create.mapper(buildBody({ meetingId: '' }));
        const either = await controller.create.exec({ mapped });

        expect(isSuccess(either)).toBe(true);
    });

    it('allows null startedAt/endedAt', async () => {
        const controller = new CallHistoryController();
        const mapped = controller.create.mapper(buildBody({ startedAt: null, endedAt: null }));
        const either = await controller.create.exec({ mapped });

        if (!isSuccess(either)) throw new Error('Expected success');
        expect(either.data.startedAt).toBeNull();
        expect(either.data.endedAt).toBeNull();
    });

    it('returns 400 when a required field is missing', async () => {
        const controller = new CallHistoryController();
        const body = buildBody({ customerId: '' });
        const mapped = controller.create.mapper(body);
        const either = await controller.create.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns isError false and status 200 on success', async () => {
        const controller = new CallHistoryController();
        const mapped = controller.create.mapper(buildBody());
        const either = await controller.create.exec({ mapped });

        expect(either.isError).toBe(false);
        expect(either.status).toBe(200);
    });
});
