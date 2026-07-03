import { Avatar } from './avatar';
import { ChargeToken } from './charge_token';
import { Count } from './count';
import { Create } from './create';
import { Delete } from './delete';
import { Edit } from './edit';
import { Exists } from './exists';
import { FindBySlug } from './find_by_slug';
import { Paginacao } from './paginacao';

export class UserController {
    public readonly classId = Symbol.for('Controller > User');

    public readonly paginacao: Paginacao;
    public readonly create: Create;
    public readonly exists: Exists;
    public readonly findBySlug: FindBySlug;
    public readonly delete: Delete;
    public readonly edit: Edit;
    public readonly avatar: Avatar;
    public readonly count: Count;
    public readonly chargeToken: ChargeToken;

    constructor() {
        this.count = Count.construir(this.classId);
        this.create = Create.construir(this.classId);
        this.paginacao = Paginacao.construir(this.classId);
        this.exists = Exists.construir(this.classId);
        this.findBySlug = FindBySlug.construir(this.classId);
        this.delete = Delete.construir(this.classId);
        this.edit = Edit.construir(this.classId);
        this.avatar = Avatar.construir(this.classId);
        this.chargeToken = ChargeToken.construir(this.classId);
    }
}
