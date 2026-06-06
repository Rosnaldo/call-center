import { Document } from "mongoose";

const cleanMongooseDoc = (obj: any): any => {
    if (obj && typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
            if (key.startsWith('__') || key.startsWith('$__')) {
                delete newObj[key];
            }
        }
    }

    return obj;
};

export const cleanMongooseObject = (doc: Document) => {
    let object;
    if (typeof doc?.toJSON === 'function') {
        object = cleanMongooseDoc(doc.toJSON({ flattenMaps: true }));
    } else {
        object = cleanMongooseDoc(doc);
    }

    return object;
}
