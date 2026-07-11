import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { mapString } from '#utils/mapper/string';
import { findCallByUser } from 'src/interactors/find_call_by_user';
import { notifyPartnerReconnected } from 'src/services/call_events';
import { ICallController } from './params';

type IInput = ICallController['INotifyPartnerReconnected']['IInput'];
type IOutput = ICallController['INotifyPartnerReconnected']['IOutput'];

interface Props {
    traceId: string;
    mapped: IInput;
}

// Only ever called server-to-server by realtime, right after its own
// grace-timer bookkeeping (connection-lifecycle state that can't live in a
// stateless IAM handler) detects a genuine reconnect — this just carries the
// resulting notification to the other participant, same targeting as the
// old sendToUser(otherParticipantId, 'partner_reconnected', ...).
export class NotifyPartnerReconnected {
    public static readonly classId = Symbol.for('Controller > Call > NotifyPartnerReconnected');

    private constructor() {}

    static construir(classId: symbol): NotifyPartnerReconnected {
        if (classId !== Symbol.for('Controller > Call')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new NotifyPartnerReconnected();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const { traceId } = props;
            const { userId } = props.mapped;
            logger.info({ userId }, 'call notify partner reconnected');
            if (!userId) throw new BadRequestException('userId é obrigatório');

            const call = await findCallByUser(userId);
            if (!call) return successData({});

            const otherUserId = call.customerId === userId ? call.attendantId : call.customerId;
            notifyPartnerReconnected(traceId, otherUserId, call);

            return successData({});
        } catch (error: unknown) {
            return logError(error, '/calls/notify-partner-reconnected');
        }
    };

    public readonly mapper = (body: Request['body']): IInput => ({
        userId: mapString(body.userId),
    });
}
