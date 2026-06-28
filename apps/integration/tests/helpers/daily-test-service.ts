import { IDailyService, JoinOptions } from '../../../web/src/services/daily';
import { ensureRoom } from './dailyco-room';

export class DailyTestService implements IDailyService {
    private joinedRooms = new Set<string>();

    constructor(private readonly webhookUrl: string) {}

    async join(options: JoinOptions): Promise<void> {
        await ensureRoom(options.room);

        const isFirstJoin = !this.joinedRooms.has(options.room);
        this.joinedRooms.add(options.room);

        if (isFirstJoin) {
            await fetch(this.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    version: '1.0.0',
                    type: 'meeting.started',
                    id: `met-sta-test-${Date.now()}`,
                    payload: {
                        meeting_id: `meeting-${options.room}`,
                        room: options.room,
                        start_ts: Date.now() / 1000,
                    },
                    event_ts: Date.now() / 1000,
                }),
            });
            await new Promise((r) => setTimeout(r, 200));
        }

        await fetch(this.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                version: '1.0.0',
                type: 'participant.joined',
                id: `ptcpt-join-test-${Date.now()}`,
                payload: {
                    session_id: `session-${Date.now()}`,
                    room: options.room,
                    user_id: String((options.userData as any)?.id ?? ''),
                    user_name: options.userName,
                    joined_at: Date.now() / 1000,
                },
                event_ts: Date.now() / 1000,
            }),
        });
    }

    async leave(): Promise<void> {}
    destroy(): void {}
    rebuild(): void {}
}
