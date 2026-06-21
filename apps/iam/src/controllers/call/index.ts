import { Create } from './create';
import { Delete } from './delete';

export class CallController {
    public readonly classId = Symbol.for('Controller > Call');

    public readonly create: Create;
    public readonly delete: Delete;

    constructor() {
        this.create = Create.construir(this.classId);
        this.delete = Delete.construir(this.classId);
    }
}
