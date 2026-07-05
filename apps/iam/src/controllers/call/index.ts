import { Create } from './create';
import { Get } from './get';
import { GetByRoom } from './get_by_room';
import { GetByUser } from './get_by_user';
import { Update } from './update';
import { Delete } from './delete';
import { Complete } from './complete';
import { TrackRoom, DeleteRooms } from './track_room';

export class CallController {
    public readonly classId = Symbol.for('Controller > Call');

    public readonly create: Create;
    public readonly get: Get;
    public readonly getByRoom: GetByRoom;
    public readonly getByUser: GetByUser;
    public readonly update: Update;
    public readonly delete: Delete;
    public readonly complete: Complete;
    public readonly trackRoom: TrackRoom;
    public readonly deleteRooms: DeleteRooms;

    constructor() {
        this.create = Create.construir(this.classId);
        this.get = Get.construir(this.classId);
        this.getByRoom = GetByRoom.construir(this.classId);
        this.getByUser = GetByUser.construir(this.classId);
        this.update = Update.construir(this.classId);
        this.delete = Delete.construir(this.classId);
        this.complete = Complete.construir(this.classId);
        this.trackRoom = TrackRoom.construir(this.classId);
        this.deleteRooms = DeleteRooms.construir(this.classId);
    }
}
