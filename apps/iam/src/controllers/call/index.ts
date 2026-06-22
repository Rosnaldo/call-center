import { Create } from './create';
import { Get } from './get';
import { GetByRoom } from './get_by_room';
import { Update } from './update';
import { Delete } from './delete';

export class CallController {
    public readonly classId = Symbol.for('Controller > Call');

    public readonly create: Create;
    public readonly get: Get;
    public readonly getByRoom: GetByRoom;
    public readonly update: Update;
    public readonly delete: Delete;

    constructor() {
        this.create = Create.construir(this.classId);
        this.get = Get.construir(this.classId);
        this.getByRoom = GetByRoom.construir(this.classId);
        this.update = Update.construir(this.classId);
        this.delete = Delete.construir(this.classId);
    }
}
