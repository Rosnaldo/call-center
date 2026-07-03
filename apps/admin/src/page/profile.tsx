import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Camera, UploadCloud } from "lucide-react"
import { Link } from "react-router-dom"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiBack } from "@/api/backend"
import { ApiError } from "@/error/api"
import { checkErrorByField } from "@/utils/check_error_by_field"
import { mytoast } from "@/components/toast"
import { useCurrentUser } from "@/hooks/use-current-user"

export default function ProfilePage() {
    const { data: currentUser, isLoading, refetch } = useCurrentUser()

    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (currentUser) {
            setFirstName(currentUser.firstName)
            setLastName(currentUser.lastName)
        }
    }, [currentUser])

    async function handleSave() {
        try {
            const res = await apiBack.put(
                "/users/edit",
                { firstName: firstName.trim(), lastName: lastName.trim() },
                { params: { _id: currentUser!._id } }
            )

            if (res.data.isError) {
                throw new ApiError(res.data.message)
            }

            mytoast.success("Perfil atualizado com sucesso!")
            refetch()
        } catch (error: unknown) {
            if (checkErrorByField(error, "message")) {
                mytoast.error(error.message)
                return
            }
            throw error
        }
    }

    async function handleFileChange(file: File) {
        if (!file.type.startsWith("image/")) {
            mytoast.error("Por favor, selecione uma imagem.")
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            mytoast.error("A imagem deve ter no maximo 5MB.")
            return
        }

        const formData = new FormData()
        formData.append("image", file)

        try {
            const res = await apiBack.post("/users/upload-avatar", formData)

            if (res.data.isError) {
                mytoast.error(res.data.message)
                return
            }

            mytoast.success("Avatar salvo com sucesso.")
            refetch()
        } catch (error) {
            mytoast.error("Ocorreu um erro inesperado. Tente novamente.")
        }
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (file) handleFileChange(file)
        e.target.value = ""
    }

    function handleDragOver(e: React.DragEvent) {
        e.preventDefault()
        setIsDragging(true)
    }

    function handleDragLeave() {
        setIsDragging(false)
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files?.[0]
        if (file) handleFileChange(file)
    }

    const initials = `${firstName?.charAt(0) ?? ""}${lastName?.charAt(0) ?? ""}`.toUpperCase()
    const hasChanges = currentUser
        ? firstName.trim() !== currentUser.firstName || lastName.trim() !== currentUser.lastName
        : false

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <Header />
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                <Link
                    to="/users"
                    className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para o painel
                </Link>
                <Card>
                    <CardHeader>
                        <CardTitle>Meu perfil</CardTitle>
                        <CardDescription>Gerencie sua foto e suas informações pessoais.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-6">
                        {isLoading || !currentUser ? (
                            <p className="text-sm text-muted-foreground">Carregando...</p>
                        ) : (
                            <>
                                <div
                                    id="avatar-photo-upload-card"
                                    className={`relative flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-6 transition-colors ${
                                        isDragging ? "border-primary bg-primary/5" : "border-transparent"
                                    }`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    <Avatar className="h-24 w-24 border-2">
                                        <AvatarImage src={currentUser.avatar?.url} alt="Avatar" />
                                        <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                                            {initials || "?"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Camera className="h-3.5 w-3.5" />
                                        Alterar foto
                                    </Button>
                                    <p className="text-xs text-muted-foreground">
                                        Ou arraste e solte uma imagem aqui
                                    </p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleInputChange}
                                        className="hidden"
                                        aria-label="Upload avatar image"
                                    />

                                    {isDragging && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-background/90 backdrop-blur-[1px] pointer-events-none">
                                            <UploadCloud className="h-8 w-8 text-primary animate-bounce" />
                                            <span className="text-xs font-medium text-foreground">Solte a imagem aqui</span>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="firstName">Nome</Label>
                                        <Input
                                            id="firstName"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="lastName">Sobrenome</Label>
                                        <Input
                                            id="lastName"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" value={currentUser.email ?? ""} disabled />
                                </div>

                                <div className="flex justify-end">
                                    <Button onClick={handleSave} disabled={!hasChanges || !firstName.trim() || !lastName.trim()}>
                                        Salvar alterações
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
