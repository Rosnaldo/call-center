import { CallState, computeTokensToBeCharged } from '@repo/shared-types';
import { getRedisClient } from '#redis/singleton';
import { CALL_TTL_SECONDS } from '#const/redis_ttl';

const CALLS_KEY = 'calls';

export type IUpdateBuilder = Pick<
    CallState,
    'activeUserIds' | 'accumulatedMs' | 'overlapStartedAt' | 'startedAt' | 'endedAt' | 'tokensToBeCharged'
>;

const applyParticipantChange = (call: CallState, userId: string, joined: boolean): Partial<CallState> => {
    if (joined) {
        const activeUsers = new Set(call.activeUserIds);
        activeUsers.add(userId);

        const updates: Partial<CallState> = {
            activeUserIds: Array.from(activeUsers),
            tokensToBeCharged: computeTokensToBeCharged(call.accumulatedMs),
        };

        if (activeUsers.size === 2 && !call.overlapStartedAt) {
            updates.overlapStartedAt = Date.now();
        }

        return updates;
    }

    const activeUsers = new Set(call.activeUserIds);
    const updates: Partial<CallState> = {};

    if (activeUsers.size === 2 && call.overlapStartedAt) {
        updates.accumulatedMs = call.accumulatedMs + (Date.now() - call.overlapStartedAt);
        updates.overlapStartedAt = null;
    }

    activeUsers.delete(userId);
    updates.activeUserIds = Array.from(activeUsers);

    return updates;
};

export class CallStateBuilder {
    protected doc: CallState;

    constructor(doc: CallState | null = null) {
        this.doc = doc ?? ({} as CallState);
    }

    public readonly create = (params: CallState): this => {
        this.doc = { ...params };
        return this;
    };

    public readonly update = (params: Partial<IUpdateBuilder>): this => {
        const { activeUserIds, accumulatedMs, overlapStartedAt, startedAt, endedAt, tokensToBeCharged } = params;

        this.doc.activeUserIds = activeUserIds === undefined ? this.doc.activeUserIds : activeUserIds;
        this.doc.accumulatedMs = accumulatedMs === undefined ? this.doc.accumulatedMs : accumulatedMs;
        this.doc.overlapStartedAt = overlapStartedAt === undefined ? this.doc.overlapStartedAt : overlapStartedAt;
        this.doc.startedAt = startedAt === undefined ? this.doc.startedAt : startedAt;
        this.doc.endedAt = endedAt === undefined ? this.doc.endedAt : endedAt;
        this.doc.tokensToBeCharged = tokensToBeCharged === undefined ? this.doc.tokensToBeCharged : tokensToBeCharged;

        return this;
    };

    public readonly addParticipant = (userId: string): this => {
        return this.update(applyParticipantChange(this.doc, userId, true));
    };

    public readonly removeParticipant = (userId: string): this => {
        return this.update(applyParticipantChange(this.doc, userId, false));
    };

    public readonly setParticipants = (userIds: string[]): this => {
        this.doc.activeUserIds = [...userIds];
        return this;
    };

    // Only /calls/complete calls this — see Complete controller.
    public readonly close = (): this => {
        this.doc.isClosed = true;
        return this;
    };

    // Exposes the current state without persisting — callers that manage
    // their own write (e.g. update_participant's WATCH/MULTI optimistic
    // lock) need the computed object without going through save().
    public get state(): CallState {
        return this.doc;
    }

    public readonly save = async (): Promise<CallState> => {
        const redis = getRedisClient();
        const key = `${CALLS_KEY}:${this.doc.customerId}--${this.doc.attendantId}`;
        await redis.set(key, JSON.stringify(this.doc), 'EX', CALL_TTL_SECONDS);
        return this.doc;
    };
}
