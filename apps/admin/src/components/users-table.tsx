import { useState } from "react"
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  ShieldCheck,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserFormDialog } from "@/components/user-form-dialog"
import { DeleteUserDialog } from "@/components/delete-user-dialog"
import type { IUser, Pagination, UserRole } from "@repo/shared-types"
import { apiBack } from "@/api/backend"
import { useQueries } from "@tanstack/react-query"
import { ApiError } from "@/error/api"
import { useDebounce } from "@/hooks/use-debounce"
import { checkErrorByField } from "@/utils/check_error_by_field"
import { mytoast } from "./toast"
import { myfetch } from "@/utils/utils"

const PAGE_SIZE = 30

async function fetchUserCount() {
    return await myfetch<{ admins: number; customers: number; attendants: number; }>(
        () => apiBack.get(
            "/users/count"
        )
    );
}

async function fetchUsersList({ currentPage, search }: { currentPage: number, search: string }) {
    return await myfetch<{ data: IUser[], pagination: Pagination }>(
        () => apiBack.get(
            "/users/list", {
                params: {
                    page: currentPage,
                    search,
                }
            }
        )
    );
}

export function UsersTable() {
    const [search, setSearch] = useState("")
    const [roleFilter, setRoleFilter] = useState<"all" | keyof typeof UserRole>("all")
    const [currentPage, setCurrentPage] = useState(1)
    const debouncedSearch = useDebounce(search, 500);

    const results = useQueries({
        queries: [
            { queryKey: ['users/count'], queryFn: () => fetchUserCount() },
            { queryKey: ['users/list', currentPage, debouncedSearch], queryFn: () => fetchUsersList({ currentPage, search: debouncedSearch }) },
        ],
    });

    const isLoading = results.some(q => q.isLoading)
    const isError = results.some(q => q.isError)
    const firstError = results.find(q => q.isError)?.error

    // Dialog states
    const [formOpen, setFormOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<IUser | null>(null)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deletingUser, setDeletingUser] = useState<IUser | null>(null)

    const usersListQuery = results[1];
    const counts = results[0].data;
    const data = results[1].data;
    const users = data?.data ?? [];
    const pagination = data?.pagination;
    const refetchUsersList = usersListQuery.refetch;

    // Pagination
    const totalPages = pagination?.totalPages || 0
    const safeCurrentPage = pagination?.currentPage || 0
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE

    async function handleDeleteUser() {
        if (!deletingUser) return
        try {
            const res = await apiBack.delete(
                "/users/delete", {
                    params: { _id: deletingUser._id }
                }
            );

            if (res.data.isError) {
                throw new ApiError(res.data.message);
            }

            mytoast.success("Usuário deletado com sucesso!");
        } catch (error: unknown) {
            if (checkErrorByField(error, 'message')) {
                mytoast.error(error.message);
                return;
            }
            throw error;
        }

        setDeleteOpen(false)
        setDeletingUser(null)
        refetchUsersList()
    }

    function openEdit(user: IUser) {
        setEditingUser(user)
        setFormOpen(true)
    }

    function openAdd() {
        setEditingUser(null)
        setFormOpen(true)
    }

    function openDelete(user: IUser) {
        setDeletingUser(user)
        setDeleteOpen(true)
    }

    // Reset page on filter change
    function handleSearchChange(value: string) {
        setSearch(value)
        setCurrentPage(1)
    }

    function handleRoleFilterChange(value: string) {
        setRoleFilter(value as "all" | keyof typeof UserRole)
        setCurrentPage(1)
    }

    // Pagination pages to show
    function getPageNumbers() {
        const pages: (number | "ellipsis")[] = []
        if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i)
        } else {
        pages.push(1)
        if (safeCurrentPage > 3) pages.push("ellipsis")
        const start = Math.max(2, safeCurrentPage - 1)
        const end = Math.min(totalPages - 1, safeCurrentPage + 1)
        for (let i = start; i <= end; i++) pages.push(i)
        if (safeCurrentPage < totalPages - 2) pages.push("ellipsis")
        pages.push(totalPages)
        }
        return pages
    }

    function Loading() {
        return <div>Loading...</div>;
    }

    function ErrorState({ error }: { error: Error }) {
        return <div style={{ color: "red" }}>{error.message}</div>;
    }

    if (isLoading) return <Loading />;
    if (isError) return <ErrorState error={firstError as Error} />;

    return (
        <div className="flex flex-col gap-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-2xl font-semibold text-card-foreground">{counts?.admins}</p>
            </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
                <p className="text-sm text-muted-foreground">Customers</p>
                <p className="text-2xl font-semibold text-card-foreground">{counts?.customers}</p>
            </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
                <p className="text-sm text-muted-foreground">Attendants</p>
                <p className="text-2xl font-semibold text-card-foreground">{counts?.attendants}</p>
            </div>
            </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9"
                />
            </div>
            <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
                <SelectTrigger className="w-[130px]">
                <SelectValue />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="attendant">Attendant</SelectItem>
                </SelectContent>
            </Select>
            </div>
            <Button onClick={openAdd} className="gap-1.5 shrink-0">
            <Plus className="h-4 w-4" />
            Add User
            </Button>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card">
            <Table>
            <TableHeader>
                <TableRow className="hover:bg-transparent">
                <TableHead className="w-[60px]">Avatar</TableHead>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[100px]">Role</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {users.length === 0 ? (
                <TableRow>
                    <TableCell
                    colSpan={6}
                    className="h-32 text-center text-muted-foreground"
                    >
                    {search || roleFilter !== "all"
                        ? "No users match your filters."
                        : "No users found. Click 'Add User' to create one."}
                    </TableCell>
                </TableRow>
                ) : (
                users.map((user) => (
                    <TableRow key={user._id}>
                    <TableCell>
                        <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatar?.url} alt={`${user.firstName} ${user.lastName}`} />
                        <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                            {user.firstName.charAt(0)}
                            {user.lastName.charAt(0)}
                        </AvatarFallback>
                        </Avatar>
                    </TableCell>
                    <TableCell className="font-medium text-card-foreground">
                        {user.firstName}
                    </TableCell>
                    <TableCell className="text-card-foreground">{user.lastName}</TableCell>
                    <TableCell className="text-muted-foreground">
                        {user.email}
                    </TableCell>
                    <TableCell>
                        <Badge
                        variant={user.role === "admin" ? "default" : "secondary"}
                        className={
                            user.role === "admin"
                            ? "bg-primary/15 text-primary border-primary/20 hover:bg-primary/20"
                            : ""
                        }
                        >
                        {user.role}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(user)}
                            aria-label={`Edit ${user.firstName} ${user.lastName}`}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => openDelete(user)}
                            aria-label={`Delete ${user.firstName} ${user.lastName}`}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        </div>
                    </TableCell>
                    </TableRow>
                ))
                )}
            </TableBody>
            </Table>

            {/* Pagination Footer */}
            {users.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-medium text-foreground">
                    {startIndex + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium text-foreground">
                    {Math.min(startIndex + PAGE_SIZE, users.length)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                    {users.length}
                </span>{" "}
                users
                </p>
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={safeCurrentPage === 1}
                        onClick={() => setCurrentPage(1)}
                        aria-label="First page"
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={safeCurrentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        aria-label="Previous page"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {getPageNumbers().map((page, idx) =>
                        page === "ellipsis" ? (
                        <span
                            key={`ellipsis-${idx}`}
                            className="flex h-8 w-8 items-center justify-center text-sm text-muted-foreground"
                            aria-hidden
                        >
                            ...
                        </span>
                        ) : (
                        <Button
                            key={page}
                            variant={page === safeCurrentPage ? "default" : "outline"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCurrentPage(page)}
                            aria-label={`Page ${page}`}
                            aria-current={page === safeCurrentPage ? "page" : undefined}
                        >
                            {page}
                        </Button>
                        )
                    )}
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={safeCurrentPage === totalPages}
                        onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        aria-label="Next page"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={safeCurrentPage === totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        aria-label="Last page"
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            )}
        </div>

        {/* Dialogs */}
        <UserFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            editingUser={editingUser}
            refetchUsersList={refetchUsersList}
        />
        <DeleteUserDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            user={deletingUser}
            onConfirm={handleDeleteUser}
        />
        </div>
    )
}
