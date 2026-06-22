import { Request } from 'express';

import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { IIncomingCallController } from './params';
import { IncomingCallState, CallState, IOnlineUser } from '@repo/shared-types';
import { realtimeApi } from '#apis/realtime';
import { validateInput } from 'src/validations/incoming_call/answer_call';

type IInput = IIncomingCallController['IAnswerCall']['IInput'];
type IOutput = IIncomingCallController['IAnswerCall']['IOutput'];

const INCOMING_CALL_KEY = 'incoming_calls';
const CALLS_KEY = 'calls';
const ONLINE_USERS_KEY = 'online_users';

interface Props {
    mapped: IInput;
}

export class AnswerCall {
    public static readonly classId = Symbol.for('Controller > IncomingCall > AnswerCall');

    private constructor() {}

    static construir(classId: symbol): AnswerCall {
        if (classId !== Symbol.for('Controller > IncomingCall')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new AnswerCall();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const { attendantId, userId } = this.transform(props.mapped);
            const redis = getRedisClient();

            const existing = await redis.hget(INCOMING_CALL_KEY, attendantId);
            if (!existing) throw new BadRequestException('Incomingcall não existe');

            const incomingCall = JSON.parse(existing) as IncomingCallState;

            if (userId === incomingCall.customerId) {
                throw new BadRequestException('Customer não deve atender ligação');
            }

            const allCalls = await redis.hvals(CALLS_KEY);
            const call = allCalls
                .map((v) => JSON.parse(v) as CallState)
                .find((c) => c.customerId === incomingCall.customerId && c.attendantId === incomingCall.attendantId);

            if (call) {
                await redis.hset(CALLS_KEY, call.id, JSON.stringify({ ...call, customerInCall: true, attendantInCall: true, wasAnswered: true }));
            }

            await redis.hdel(INCOMING_CALL_KEY, attendantId);

            const customerJson = await redis.hget(ONLINE_USERS_KEY, incomingCall.customerId);
            if (customerJson) {
                const customer = JSON.parse(customerJson) as IOnlineUser;
                await redis.hset(ONLINE_USERS_KEY, customer.id, JSON.stringify({ ...customer, status: 'in-call' }));
            }

            const attendantJson = await redis.hget(ONLINE_USERS_KEY, incomingCall.attendantId);
            if (attendantJson) {
                const attendant = JSON.parse(attendantJson) as IOnlineUser;
                await redis.hset(ONLINE_USERS_KEY, attendant.id, JSON.stringify({ ...attendant, status: 'in-call' }));
            }

            realtimeApi.post('/webhooks/iam', {
                event: 'call_answered',
                payload: { customerId: incomingCall.customerId, attendantId: incomingCall.attendantId },
            }).catch((err) => console.error('[Realtime] answer_call failed:', err));

            return successData(incomingCall);
        } catch (error: unknown) {
            return logError(error, '/incoming-calls/answer-call');
        }
    };

    public readonly mapper = (body: Request['body']): IInput => ({
        attendantId: mapString(body.attendantId),
        userId: mapString(body.userId),
    });

    private readonly transform = (mapped: IInput): IInput => {
        const zodResult = validateInput(mapped);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);
        return zodResult.data as IInput;
    };
}
