import { FindOrCreate } from './find_or_create';

export class DailyRoomController {
    public readonly classId = Symbol.for('Controller > DailyRoom');

    public readonly findOrCreate: FindOrCreate;

    constructor() {
        this.findOrCreate = FindOrCreate.construir(this.classId);
    }
}
