import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { mapString } from '#utils/mapper/string';
import { getUserModel, getTransactionModel } from '#models/singleton';
import { UserUtils } from '#schemas/user/utils';
import { notifyUserTokenCharged } from 'src/services/realtime';
import { formatDatePtBr } from '#utils/format_date_ptbr';
import { formatDurationPtBr } from '#utils/format_duration_ptbr';
import { IUserController } from './params';
import { validateInput } from 'src/validations/user/charge_token';
import { patchOnlineUserIfPresent } from 'src/interactors/online_user';
import { broadcastOnlineUsers } from 'src/services/call_events';

type IInput = IUserController['IChargeToken']['IInput'];
type IOutput = IUserController['IChargeToken']['IOutput'];

interface Props {
    traceId: string;
    mapped: IInput;
}

export class ChargeToken {
    public static readonly classId = Symbol.for('Controller > User > ChargeToken');
    private readonly utils: UserUtils;

    private constructor() {
        this.utils = new UserUtils();
    }

    static construir(classId: symbol): ChargeToken {
        if (classId !== Symbol.for('Controller > User')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new ChargeToken();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const { traceId } = props;
            const params = this.transform(props.mapped);
            const { customerId, tokens, attendantName, durationMs, endedAt } = params;
            logger.info({ customerId, tokens }, 'user charge-token');

            const user = await getUserModel().findById(customerId);
            if (!user) throw new BadRequestException('Cliente não encontrado');

            user.tokens = (user.tokens ?? 0) - tokens;
            await user.save();

            const message = `Consumo de chamada de vídeo com ${attendantName} em ${formatDatePtBr(endedAt)} — duração de ${formatDurationPtBr(durationMs)}`;

            await getTransactionModel().create({
                userId: customerId,
                message,
                type: 'charge',
                amount: tokens,
            });

            const updated = this.utils.toObject(user);

            // Best-effort — the charge itself already landed above; a
            // presence-cache hiccup shouldn't turn a successful charge into
            // an error response.
            try {
                await patchOnlineUserIfPresent(customerId, { tokens: updated.tokens ?? 0 });
                broadcastOnlineUsers(traceId);
            } catch (error) {
                logger.error({ traceId, error }, 'charge-token: falha ao sincronizar cache de presença');
            }

            // realtime still needs to know, to push the per-user
            // user_tokens_updated SSE event — that's its exclusive job, the
            // online_user cache/broadcast above is handled here now.
            notifyUserTokenCharged(traceId, updated).catch(() => {});

            return successData(updated);
        } catch (error: unknown) {
            return logError(error, '/users/charge-token');
        }
    };

    public readonly mapper = (body: Request['body']): IInput => ({
        customerId: mapString(body.customerId),
        tokens: typeof body.tokens === 'number' ? body.tokens : Number(body.tokens),
        attendantName: mapString(body.attendantName),
        durationMs: typeof body.durationMs === 'number' ? body.durationMs : Number(body.durationMs),
        endedAt: body.endedAt,
    });

    private readonly transform = (mapped: IInput): IInput => {
        const zodResult = validateInput(mapped);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);
        return zodResult.data as unknown as IInput;
    };
}
