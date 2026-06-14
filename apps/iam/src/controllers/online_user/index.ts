import { Add } from './add';
import { List } from './list';

export class OnlineUserController {
    public readonly classId = Symbol.for('Controller > OnlineUser');

    public readonly add: Add;
    public readonly list: List;

    constructor() {
        this.add = Add.construir(this.classId);
        this.list = List.construir(this.classId);
    }
}
