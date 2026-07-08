import { callHistoryCollectionName } from '#const/collection_name_mapping';
import { IndexDescription } from 'mongodb';
import { UniqueIndex } from '../unique_index';

// Partial (not sparse): meetingId can legitimately be '' in some inputs, and a
// plain sparse index would still collide multiple '' values against each other.
// $gt: '' matches only non-empty strings, so uniqueness is scoped to real Daily
// meeting ids — this is what makes onMeetingEnded safe to retry/redeliver.
const indexes: Array<IndexDescription> = [
    {
        key: { meetingId: 1 },
        unique: true,
        partialFilterExpression: { meetingId: { $gt: '' } },
        name: UniqueIndex.CallHistory.meetingId.key,
    },
];

export default {
    indexes,
    collectionName: callHistoryCollectionName,
}
