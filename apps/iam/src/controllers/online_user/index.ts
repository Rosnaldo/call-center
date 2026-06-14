import { Add } from './add';
import { List } from './list';
import { Remove } from './remove';

export class OnlineUserController {
    public readonly classId = Symbol.for('Controller > OnlineUser');

    public readonly add: Add;
    public readonly list: List;
    public readonly remove: Remove;

    constructor() {
        this.add = Add.construir(this.classId);
        this.list = List.construir(this.classId);
        this.remove = Remove.construir(this.classId);
    }
}
