export const UserRole = {
    admin: 'admin',
    customer: 'customer',
    attendent: 'attendent',
} as const;

export const UserRoleAll = [
    UserRole.admin,
    UserRole.customer,
    UserRole.attendent,
];

export interface IMedia {
    _id: string;
    url: string;
    s3Path: string;
    s3Host: string;
    cdnHost?: string;
};

export interface IUserAvatar extends IMedia {};

export interface IUser {
    _id: string;
    slug: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    avatar?: IUserAvatar;
    role: keyof typeof UserRole;
    createdAt: Date;
    updatedAt: Date;
}

export const PictureType = {
    image: 'image',
} as const;

export const PictureTypeAll = [
    PictureType.image,
];

export interface IPicture extends IMedia {
    type: keyof typeof PictureType;
    w: number;
    h: number;
};

export interface Pagination {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    size: number;
};

