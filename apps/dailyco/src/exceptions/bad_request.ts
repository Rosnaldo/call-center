export class BadRequestException extends Error {
    public status: number;
    constructor(message: string, status: number = 400) {
        super(message);
        this.message = message;
        this.status = status;
    }

    toString(): string {
        return this.message;
    }
}
