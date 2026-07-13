import { Create } from './create';
import { AddParticipant } from './add_participant';
import { RemoveParticipant } from './remove_participant';
import { Delete } from './delete';
import { Complete } from './complete';
import { SyncActiveCall } from './sync_active_call';

// create/delete no longer have their own HTTP route (see routes/call.ts) —
// SyncActiveCall's self-heal path builds its own instances directly instead
// of going through this aggregator — but the classes stay reachable here
// too, since the unit tests exercise them this way.
export class CallController {
    public readonly classId = Symbol.for('Controller > Call');

    public readonly create: Create;
    public readonly addParticipant: AddParticipant;
    public readonly removeParticipant: RemoveParticipant;
    public readonly delete: Delete;
    public readonly complete: Complete;
    public readonly syncActiveCall: SyncActiveCall;

    constructor() {
        this.create = Create.construir(this.classId);
        this.addParticipant = AddParticipant.construir(this.classId);
        this.removeParticipant = RemoveParticipant.construir(this.classId);
        this.delete = Delete.construir(this.classId);
        this.complete = Complete.construir(this.classId);
        this.syncActiveCall = SyncActiveCall.construir(this.classId);
    }
}
