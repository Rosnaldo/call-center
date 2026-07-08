import { Add } from './add';
import { List } from './list';
import { Remove } from './remove';
import { UpdateTokens } from './update_tokens';
import { Touch } from './touch';
import { UpdateStatus } from './update_status';

export class OnlineUserController {
    public readonly classId = Symbol.for('Controller > OnlineUser');

    public readonly add: Add;
    public readonly list: List;
    public readonly remove: Remove;
    public readonly updateTokens: UpdateTokens;
    public readonly touch: Touch;
    public readonly updateStatus: UpdateStatus;

    constructor() {
        this.add = Add.construir(this.classId);
        this.list = List.construir(this.classId);
        this.remove = Remove.construir(this.classId);
        this.updateTokens = UpdateTokens.construir(this.classId);
        this.touch = Touch.construir(this.classId);
        this.updateStatus = UpdateStatus.construir(this.classId);
    }
}
