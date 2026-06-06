import { checkErrorByField } from './check_error_by_field';

export const isMongoError = (error: Error) => {
    let isErroName = false;
    if (checkErrorByField(error, 'name')) {
        isErroName = error.name === 'MongoServerError';
    }

    return isErroName;
};
