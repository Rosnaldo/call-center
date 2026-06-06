import { userCollectionName } from '#const/collection_name_mapping';
import { IndexDescription } from 'mongodb';
import { UniqueIndex } from '../unique_index';

const indexes: Array<IndexDescription> = [
    {
        key: { email: 1 },
        unique: true,
        name: UniqueIndex.User.email.key
    },
];

export default {
    indexes,
    collectionName: userCollectionName
}
