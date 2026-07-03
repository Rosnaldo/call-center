import { useQuery } from "@tanstack/react-query"
import type { IUser } from "@repo/shared-types"
import { apiBack } from "@/api/backend"
import { myfetch } from "@/utils/utils"
import { useAuth } from "@/providers/auth-provider"

async function fetchCurrentUser() {
    return await myfetch<IUser>(() => apiBack.get("/users/me"))
}

export function useCurrentUser() {
    const { isAuthenticated } = useAuth()

    return useQuery({
        queryKey: ["users/me"],
        queryFn: fetchCurrentUser,
        enabled: isAuthenticated,
    })
}
