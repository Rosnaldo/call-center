export interface IDailyRoom {
    id: string;
    name: string;
    api_created: boolean;
    privacy: string;
    url: string;
    created_at: string;
}

export interface IDailyRoomController {
    IFindOrCreate: {
        IInput: Record<string, never>;
        IOutput: IDailyRoom;
    };
}
