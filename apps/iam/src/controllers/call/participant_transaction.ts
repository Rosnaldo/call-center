import { getRedisClient } from '#redis/singleton';
import { CALL_TTL_SECONDS } from '#const/redis_ttl';
import { BadRequestException } from '#exceptions/bad_request';
import { CallState } from '@repo/shared-types';
import { CallStateBuilder } from '#schemas/call/utils';

const CALLS_KEY = 'calls';
const MAX_ATTEMPTS = 10;

// Shared WATCH/MULTI optimistic-lock loop behind add-participant and
// remove-participant — both mutate activeUserIds concurrently as
// participant.joined/left webhooks and sync-active-call race each other, so
// a plain read-modify-write could silently drop one side's change.
export async function updateParticipantWithRetry(
    customerId: string,
    attendantId: string,
    mutate: (builder: CallStateBuilder) => CallStateBuilder,
): Promise<CallState> {
    const conn = getRedisClient().duplicate();

    try {
        const key = `${CALLS_KEY}:${customerId}--${attendantId}`;

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            await conn.watch(key);

            const existing = await conn.get(key);
            if (!existing) {
                await conn.unwatch();
                throw new BadRequestException('Call não encontrada');
            }

            const call = JSON.parse(existing) as CallState;
            const updated = mutate(new CallStateBuilder(call)).state;

            // Any call update refreshes the TTL — participant join/leave
            // included — so a call can never expire while it's actually
            // ongoing, regardless of how long it's been since
            // onMeetingStarted or the last sync-active-call.
            const result = await conn.multi().set(key, JSON.stringify(updated), 'EX', CALL_TTL_SECONDS).exec();
            if (result) return updated;
        }

        throw new Error('Falha ao atualizar participante da call após múltiplas tentativas (conflito de concorrência)');
    } finally {
        conn.disconnect();
    }
}
