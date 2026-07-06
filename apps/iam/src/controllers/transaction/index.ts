import { Create } from './create';
import { List } from './list';

export class TransactionController {
    public readonly classId = Symbol.for('Controller > Transaction');

    public readonly create: Create;
    public readonly list: List;

    constructor() {
        this.create = Create.construir(this.classId);
        this.list = List.construir(this.classId);
    }
}
