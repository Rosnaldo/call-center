import { Create } from './create';

export class CallUserPresenceController {
    public readonly classId = Symbol.for('Controller > CallUserPresence');

    public readonly create: Create;

    constructor() {
        this.create = Create.construir(this.classId);
    }
}
