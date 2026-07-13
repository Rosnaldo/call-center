import { useState, useEffect } from "react"
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
import type { IUser, Pagination } from "@repo/shared-types"
import { apiBack } from "@/api/backend"
import { type QueryObserverResult, type RefetchOptions } from "@tanstack/react-query"
import { checkErrorByField } from "@/utils/check_error_by_field"
import { mytoast } from "./toast"
import { ApiError } from "@/error/api"

const TOKEN_AMOUNT_OPTIONS = [5, 15, 40, 100]

interface GiveTokensDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    user: IUser | null
    refetchUsersList: (options?: RefetchOptions | undefined) => Promise<QueryObserverResult<{
        data: IUser[];
        pagination: Pagination;
    }, Error>>
}

export function GiveTokensDialog({
    open,
    onOpenChange,
    user,
    refetchUsersList,
}: GiveTokensDialogProps) {
    const [giveTokensAmount, setGiveTokensAmount] = useState("")
    const [giveTokensMessage, setGiveTokensMessage] = useState("")
    const [isGivingTokens, setIsGivingTokens] = useState(false)

    useEffect(() => {
        if (open) {
            setGiveTokensAmount("")
            setGiveTokensMessage("")
        }
    }, [open, user])

    async function handleGiveTokens() {
        if (!user || !giveTokensAmount) return

        setIsGivingTokens(true)
        try {
            const res = await apiBack.post("/users/give-token", {
                customerId: user._id,
                tokens: Number(giveTokensAmount),
                message: giveTokensMessage.trim() || undefined,
            })

            if (res.data.isError) {
                throw new ApiError(res.data.message);
            }

            mytoast.success("Tokens adicionados com sucesso!");
            refetchUsersList()
            onOpenChange(false)
        } catch (error: unknown) {
            if (checkErrorByField(error, 'message')) {
                mytoast.error(error.message);
                return;
            }
            throw error;
        } finally {
            setIsGivingTokens(false)
        }
    }

    if (!user) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
            <DialogTitle>Dar Tokens</DialogTitle>
            <DialogDescription>
                {user.firstName} {user.lastName} · Saldo atual: {user.tokens ?? 0}
            </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2">
            <Label htmlFor="giveTokensAmount">Quantidade</Label>
            <Select value={giveTokensAmount} onValueChange={setGiveTokensAmount}>
                <SelectTrigger id="giveTokensAmount">
                    <SelectValue placeholder="Selecione uma quantidade" />
                </SelectTrigger>
                <SelectContent>
                    {TOKEN_AMOUNT_OPTIONS.map((amount) => (
                        <SelectItem key={amount} value={String(amount)}>
                            {amount} tokens
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Label htmlFor="giveTokensMessage">Motivo (opcional)</Label>
            <Input
                id="giveTokensMessage"
                value={giveTokensMessage}
                onChange={(e) => setGiveTokensMessage(e.target.value)}
                placeholder="Motivo (ex: bônus de boas-vindas)"
            />
            </div>

            <DialogFooter className="pt-2">
            <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
            >
                Cancel
            </Button>
            <Button
                type="button"
                disabled={!giveTokensAmount || isGivingTokens}
                onClick={handleGiveTokens}
            >
                Dar Tokens
            </Button>
            </DialogFooter>
        </DialogContent>
        </Dialog>
    )
}
