import { Request } from 'express';

import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { IIncomingCallController } from './params';
import { IncomingCallState, CallState, IOnlineUser } from '@repo/shared-types';
import { notifyCallAccepted } from 'src/services/realtime';
import { validateInput } from 'src/validations/incoming_call/accept';

type IInput = IIncomingCallController['IAccept']['IInput'];
type IOutput = IIncomingCallController['IAccept']['IOutput'];

const INCOMING_CALL_PREFIX = 'incoming_call:';
const CALLS_KEY = 'calls';
const ONLINE_USERS_KEY = 'online_users';

interface Props {
    mapped: IInput;
}

export class Accept {
    public static readonly classId = Symbol.for('Controller > IncomingCall > Accept');

    private constructor() {}

    static construir(classId: symbol): Accept {
        if (classId !== Symbol.for('Controller > IncomingCall')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new Accept();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const { attendantId, userId } = this.transform(props.mapped);
            const redis = getRedisClient();

            const existing = await redis.get(`${INCOMING_CALL_PREFIX}${attendantId}`);
            if (!existing) throw new BadRequestException('Incomingcall não existe');

            const incomingCall = JSON.parse(existing) as IncomingCallState;

            if (userId === incomingCall.customerId) {
                throw new BadRequestException('Customer não deve atender ligação');
            }

            const callKey = `${CALLS_KEY}:${incomingCall.customerId}--${incomingCall.attendantId}`;
            const existingCall = await redis.get(callKey);

            const customerJson = await redis.hget(ONLINE_USERS_KEY, incomingCall.customerId);
            const attendantJson = await redis.hget(ONLINE_USERS_KEY, incomingCall.attendantId);
            const customerName = customerJson ? (JSON.parse(customerJson) as IOnlineUser).name : '';
            const attendantName = attendantJson ? (JSON.parse(attendantJson) as IOnlineUser).name : '';
            const customerSlug = customerJson ? (JSON.parse(customerJson) as IOnlineUser).slug : '';
            const attendantSlug = attendantJson ? (JSON.parse(attendantJson) as IOnlineUser).slug : '';

            if (existingCall) {
                const call = JSON.parse(existingCall) as CallState;
                await redis.set(callKey, JSON.stringify({ ...call, customerInCall: true, attendantInCall: true }));
            } else {
                const newCall: CallState = {
                    id: `${incomingCall.customerId}--${incomingCall.attendantId}`,
                    customerId: incomingCall.customerId,
                    customerName,
                    attendantId: incomingCall.attendantId,
                    attendantName,
                    roomName: `${customerSlug}--${attendantSlug}`,
                    meetingId: '',
                    customerInCall: true,
                    attendantInCall: true,
                };
                await redis.set(callKey, JSON.stringify(newCall));
            }

            await redis.del(`${INCOMING_CALL_PREFIX}${attendantId}`);

            if (customerJson) {
                const customer = JSON.parse(customerJson) as IOnlineUser;
                await redis.hset(ONLINE_USERS_KEY, customer.id, JSON.stringify({ ...customer, status: 'in-call' }));
            }

            if (attendantJson) {
                const attendant = JSON.parse(attendantJson) as IOnlineUser;
                await redis.hset(ONLINE_USERS_KEY, attendant.id, JSON.stringify({ ...attendant, status: 'in-call' }));
            }

            notifyCallAccepted(incomingCall.customerId, incomingCall.attendantId, incomingCall.calledBy, incomingCall).catch(() => {});

            return successData(incomingCall);
        } catch (error: unknown) {
            return logError(error, '/incoming-calls/accept');
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
