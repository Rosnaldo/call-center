import { Send } from './send';
import { Delete } from './delete';

export class IncomingCallController {
    public readonly classId = Symbol.for('Controller > IncomingCall');

    public readonly send: Send;
    public readonly delete: Delete;

    constructor() {
        this.send = Send.construir(this.classId);
        this.delete = Delete.construir(this.classId);
    }
}
