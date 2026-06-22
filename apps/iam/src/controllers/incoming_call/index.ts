import { Send } from './send';
import { AnswerCall } from './answer_call';
import { Cancel } from './cancel';

export class IncomingCallController {
    public readonly classId = Symbol.for('Controller > IncomingCall');

    public readonly send: Send;
    public readonly answerCall: AnswerCall;
    public readonly cancel: Cancel;

    constructor() {
        this.send = Send.construir(this.classId);
        this.answerCall = AnswerCall.construir(this.classId);
        this.cancel = Cancel.construir(this.classId);
    }
}
