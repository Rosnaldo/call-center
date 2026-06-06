export interface ICrud<IParams> {
    create: (arg: IParams) => Promise<IParams>;
    update: (_id: string, arg: IParams) => Promise<IParams>;
}
