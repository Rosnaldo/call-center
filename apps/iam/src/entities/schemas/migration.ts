import { Schema, Types, Document } from 'mongoose';

import { Model } from 'mongoose';

export interface IMigrationSchema {
    _id: Types.ObjectId;
    script: string;
}

export const MigrationSchema = new Schema<IMigrationSchema>(
    {
        script: {
            unique: true,
            required: true,
            type: String
        }
    },
    {
        timestamps: {
            createdAt: 'dataCriacao',
            updatedAt: 'dataAtualizacao'
        }
    }
);

type IMigrationDocument = Document<Types.ObjectId, any, IMigrationSchema> & IMigrationSchema;
type IMigrationModel = Model<IMigrationSchema>;

export interface IMigration {
    ISchema: IMigrationSchema;
    IDocument: IMigrationDocument;
    IModel: IMigrationModel;
}
