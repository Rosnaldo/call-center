import mongoose, { HydratedDocument, Types } from "mongoose";

type ObjectIdLike = Types.ObjectId | undefined;

export function resolveFieldFromThis<
    TField extends keyof any,
    IQuery extends mongoose.Query<any, any, any, object>,
    IDocument extends HydratedDocument<Record<TField, Types.ObjectId>>,
>(
    self: IQuery | IDocument,
    field: TField
): ObjectIdLike {
    if (self instanceof mongoose.Query) {
        const query = self as IQuery;
        const q = query.getQuery() as Record<string, any>;
        const u = query.getUpdate() as Record<string, any> | undefined;
        const fieldR: Types.ObjectId | undefined =
            q?.[field as string] ??
            u?.[field as string] ??
            u?.$set?.[field as string];

        // Fallback: se não veio na query/update, buscar o doc alvo
        return fieldR;
    } else {
        // create/save
        return self[field];
    }
}

export function extractFieldFromFilter(
    filter: any,
    field: string
): any {
    return filter[field];
};

export function extractFieldFromUpdate(
    update: any,
    field: string
): any {
    return (
        update[field] ??
        update.$set?.[field]
    );
};

export type DocumentOperation = 'create' | 'update';

export function getDocumentOperationType<T>(
    doc: HydratedDocument<T>
): DocumentOperation {
    return doc.isNew ? 'create' : 'update';
};
