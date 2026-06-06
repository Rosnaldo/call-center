
export class ApiError extends Error {
    constructor(apiMessage: string) {
        super(apiMessage);
        this.name = "ApiError";
    }
}
