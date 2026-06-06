export class BadConfigurationException extends Error {
    constructor(message: string, error?: Error) {
        super(message);
        this.message = message;
        if (error) {
            message += ` - Exception ${error.name} ${error.stack} ${error.message}`;
            this.message = message;
        }
    }

    toString(): string {
        return this.message;
    }
}
