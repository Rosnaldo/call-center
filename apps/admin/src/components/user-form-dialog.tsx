import { useState, useRef, useEffect } from "react"
import { Camera, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserRole, type IUser, type Pagination } from "@repo/shared-types"
import { apiBack } from "@/api/backend"
import { type QueryObserverResult, type RefetchOptions } from "@tanstack/react-query"
import { checkErrorByField } from "@/utils/check_error_by_field"
import { mytoast } from "./toast"
import { ApiError } from "@/error/api"

const TOKEN_AMOUNT_OPTIONS = [5, 15, 40, 100]

interface UserFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    editingUser: IUser | null
    refetchUsersList: (options?: RefetchOptions | undefined) => Promise<QueryObserverResult<{
        data: IUser[];
        pagination: Pagination;
    }, Error>>
}

export function UserFormDialog({
    open,
    onOpenChange,
    editingUser,
    refetchUsersList,
}: UserFormDialogProps) {
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [email, setEmail] = useState("")
    const [avatarUrl, setAvatarUrl] = useState("")
    const [role, setRole] = useState<keyof typeof UserRole>("customer")
    const [addTokens, setAddTokens] = useState("")
    const [errors, setErrors] = useState<Record<string, string>>({})
    const fileInputRef = useRef<HTMLInputElement>(null)

    async function handleSaveUser(userData: Partial<IUser> & { addTokens?: number }) {
        try {
            let res;
            if (userData._id) {
                res = await apiBack.put(
                    "/users/edit", userData, {
                        params: { _id: userData._id }
                    }
                )
            } else {

                res = await apiBack.post(
                    "/users/create", userData
                )
            }

            if (res.data.isError) {
                throw new ApiError(res.data.message);
            }

            refetchUsersList()
            mytoast.success("Usuário atualizado com sucesso!");
        } catch (error: unknown) {
            if (checkErrorByField(error, 'message')) {
                mytoast.error(error.message);
                return;
            }
            throw error;
        }
    }

    useEffect(() => {
        if (open) {
            if (editingUser) {
                setFirstName(editingUser.firstName)
                setLastName(editingUser.lastName)
                setEmail(editingUser?.email || '')
                setRole(editingUser.role)
                setAvatarUrl(editingUser.avatar?.url || '')
            } else {
                setFirstName("")
                setLastName("")
                setEmail("")
                setRole("customer")
                setAvatarUrl('')
            }
            setAddTokens("")
            setErrors({})
        }
    }, [open, editingUser])

    function validate() {
        const newErrors: Record<string, string> = {}
        if (!firstName.trim()) newErrors.firstName = "First name is required"
        if (!lastName.trim()) newErrors.lastName = "Last name is required"
        if (!email.trim()) newErrors.email = "Email is required"
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        newErrors.email = "Invalid email format"
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!validate()) return

        handleSaveUser({
            ...(editingUser ? { _id: editingUser._id } : {}),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            role,
            ...(editingUser && addTokens.trim() ? { addTokens: Number(addTokens) } : {}),
        })
        onOpenChange(false)
        refetchUsersList()
    }

    const handleFileChange = async (file: File) => {
        if (!file.type.startsWith("image/")) {
            mytoast.error("Por favor, selecione uma imagem.")
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            mytoast.error("A imagem deve ter no maximo 5MB.")
            return
        }

        const formData = new FormData();
        formData.append("image", file);

        try {
            const res = await apiBack.post("/users/upload-avatar", formData, {
                params: { userId: editingUser!._id, },
            });
    
            if (res.data.isError) {
                mytoast.error(res.data.message)
            } else {
                const updated = res.data as IUser;
                setAvatarUrl(updated?.avatar?.url || '');
                mytoast.success("Avatar salvo com sucesso.")
            }
        } catch (error) {
            mytoast.error("Ocorreu um erro inesperado. Tente novamente.")
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (files && files.length > 0) {
            handleFileChange(files[0])
        }
    }

    function removeAvatar() {
        setAvatarUrl("")
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const initials = `${firstName?.charAt(0)}${lastName?.charAt(0)}`.toUpperCase()

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
            <DialogTitle>
                {editingUser ? "Edit User" : "Add New User"}
            </DialogTitle>
            <DialogDescription>
                {editingUser
                ? "Update the user information below."
                : "Fill in the details to create a new user."}
            </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Avatar Section */}
            {editingUser ? <div className="flex flex-col items-center gap-3">
                <div className="relative group">
                <Avatar className="h-20 w-20 border-2">
                    <AvatarImage src={avatarUrl} alt="User avatar" />
                    <AvatarFallback className="text-lg bg-muted text-muted-foreground">
                    {initials || "?"}
                    </AvatarFallback>
                </Avatar>
                {avatarUrl && (
                    <button
                    type="button"
                    onClick={removeAvatar}
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove avatar"
                    >
                        <X className="h-3 w-3" />
                    </button>
                )}
                </div>
                <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-1.5"
                >
                    <Camera className="h-3.5 w-3.5" />
                    Upload Photo
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleInputChange}
                    className="hidden"
                    aria-label="Upload avatar image"
                />
                </div>
                {errors.avatar && (
                <p className="text-xs text-destructive">{errors.avatar}</p>
                )}
            </div>
             : (<></>)}

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                />
                {errors.firstName && (
                    <p className="text-xs text-destructive">{errors.firstName}</p>
                )}
                </div>
                <div className="flex flex-col gap-1.5">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                />
                {errors.lastName && (
                    <p className="text-xs text-destructive">{errors.lastName}</p>
                )}
                </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.doe@example.com"
                />
                {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
                )}
            </div>

            {/* Role */}
            <div className="flex flex-col gap-1.5">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as keyof typeof UserRole)}>
                <SelectTrigger id="role">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="attendant">Attendant</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
                </Select>
            </div>

            {/* Tokens */}
            {editingUser && role === "customer" && (
                <div className="flex flex-col gap-1.5">
                <Label htmlFor="addTokens">Add Tokens</Label>
                <Select value={addTokens} onValueChange={setAddTokens}>
                    <SelectTrigger id="addTokens">
                        <SelectValue placeholder="Select an amount" />
                    </SelectTrigger>
                    <SelectContent>
                        {TOKEN_AMOUNT_OPTIONS.map((amount) => (
                            <SelectItem key={amount} value={String(amount)}>
                                {amount} tokens
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                    Current balance: {editingUser.tokens ?? 0}
                </p>
                </div>
            )}

            <DialogFooter className="pt-2">
                <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                >
                Cancel
                </Button>
                <Button type="submit">
                {editingUser ? "Save Changes" : "Add User"}
                </Button>
            </DialogFooter>
            </form>
        </DialogContent>
        </Dialog>
    )
}
