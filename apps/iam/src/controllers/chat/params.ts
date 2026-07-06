import { ChatAttendantment, Message } from '@repo/shared-types';

export interface ICreateSendMessageInput {
    customerId: string;
    attendantId: string;
    sender: 'attendant' | 'customer';
    text: string;
}

export interface IUploadFileInput {
    customerId: string;
    attendantId: string;
    sender: 'attendant' | 'customer';
    buffer: Buffer;
    originalName: string;
    mimetype: string;
    size: number;
}

export interface IGetMessagesInput {
    customerId: string;
    attendantId: string;
}

export interface IDeleteInput {
    customerId: string;
    attendantId: string;
}

export interface IChatController {
    ISendMessage: {
        IOutput: Message;
    };
    IUploadFile: {
        IOutput: Message;
    };
    IGetMessages: {
        IOutput: ChatAttendantment;
    };
    IDelete: {
        IOutput: {};
    };
}
