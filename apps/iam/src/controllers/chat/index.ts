import { SendMessage } from './send_message';
import { UploadFile } from './upload_file';
import { GetMessages } from './get_messages';
import { Delete } from './delete';

export class ChatController {
    public readonly classId = Symbol.for('Controller > Chat');

    public readonly sendMessage: SendMessage;
    public readonly uploadFile: UploadFile;
    public readonly getMessages: GetMessages;
    public readonly delete: Delete;

    constructor() {
        this.sendMessage = SendMessage.construir(this.classId);
        this.uploadFile = UploadFile.construir(this.classId);
        this.getMessages = GetMessages.construir(this.classId);
        this.delete = Delete.construir(this.classId);
    }
}
