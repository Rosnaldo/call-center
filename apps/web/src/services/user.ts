import { apiBack } from "../api/backend";
import { User } from "../entities/user";
import { ApiError } from "../error/api";

export async function fetchUser(email: string): Promise<User>  {
    const res = await apiBack.get(
        "/users/exists", {
            params: { email }
        }
    )
    
    if (res.data.isError) {
        throw new ApiError(res.data.message);
    }

    const user = res.data as User;
    return user;
}

export async function fetchUserUpload(formData: FormData): Promise<string> {
    const res = await apiBack.post("/users/upload-avatar", formData);
    
    if (res.data.isError) {
        throw new ApiError(res.data.message);
    }

    const user = res.data as User;
    return user.avatar?.url || '';
}
