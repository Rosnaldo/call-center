import { CallState } from '@repo/shared-types';
import type { MeetingStoreInstance } from '../../states/stores';

export type WsMeetingMessage =
    | { event: 'meeting_started'; data: { call: CallState } }
    | { event: 'participant_joined'; data: { call: CallState } }
    | { event: 'participant_left'; data: { call: CallState } }
    | { event: 'meeting_ended'; data: { call: CallState } };

export interface WsMeetingStores {
    meeting: MeetingStoreInstance;
}

export class WsMeetingService {
    private stores: WsMeetingStores;

    constructor(stores: WsMeetingStores) {
        this.stores = stores;
    }

    handle(msg: { event: string; data?: any }): boolean {
        const { meetingStarted, updateJoinedView, updateLeftView, meetingEnded } = this.stores.meeting.getState();

        switch (msg.event) {
            case 'meeting_started':
                meetingStarted(msg.data.call);
                break;
            case 'participant_joined':
                updateJoinedView(msg.data.call);
                break;
            case 'participant_left':
                updateLeftView(msg.data.call);
                break;
            case 'meeting_ended':
                meetingEnded(msg.data.call);
                break;
            default:
                return false;
        }
        return true;
    }
}
