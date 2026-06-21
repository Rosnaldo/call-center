import { Create } from './create';
import { Delete } from './delete';

export class IncomingCallController {
    public readonly classId = Symbol.for('Controller > IncomingCall');

    public readonly create: Create;
    public readonly delete: Delete;

    constructor() {
        this.create = Create.construir(this.classId);
        this.delete = Delete.construir(this.classId);
    }
}
