import { Create } from './create';

export class CallHistoryController {
    public readonly classId = Symbol.for('Controller > CallHistory');

    public readonly create: Create;

    constructor() {
        this.create = Create.construir(this.classId);
    }
}
