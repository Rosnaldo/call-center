import { Create } from './create';

export class CallController {
    public readonly classId = Symbol.for('Controller > Call');

    public readonly create: Create;

    constructor() {
        this.create = Create.construir(this.classId);
    }
}
