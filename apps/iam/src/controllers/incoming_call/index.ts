import { Send } from './send';
import { Accept } from './accept';
import { Cancel } from './cancel';

export class IncomingCallController {
    public readonly classId = Symbol.for('Controller > IncomingCall');

    public readonly send: Send;
    public readonly accept: Accept;
    public readonly cancel: Cancel;

    constructor() {
        this.send = Send.construir(this.classId);
        this.accept = Accept.construir(this.classId);
        this.cancel = Cancel.construir(this.classId);
    }
}
