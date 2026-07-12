import { AppShell } from "@/components/layout/app-shell";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireProfile } from "@/lib/auth";
import { assignUserManager, createUserProfile, setUserActive, setUserClubAssignment } from "@/lib/actions/management-actions";
import { getClubAssignmentsForAdmin, getClubsForAdmin, getUsersForAdmin } from "@/lib/data/app";
import { formatEnum } from "@/lib/utils";

export default async function AdminUsersPage({ searchParams }: Readonly<{ searchParams: Promise<{ q?: string; role?: string; active?: string }> }>) {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const filters = await searchParams;
  const [users, allUsers, clubs, assignments] = await Promise.all([getUsersForAdmin(filters), getUsersForAdmin(), getClubsForAdmin(), getClubAssignmentsForAdmin()]);
  const managers = allUsers.filter((user) => user.role === "PROMOTER_MANAGER" && user.active);
  return (
    <AppShell profile={profile} title="Users" eyebrow="Admin">
      <LuxuryCard className="mb-4">
        <form action={createUserProfile} className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2"><Label>Name</Label><Input name="name" placeholder="Julia Casanis" /></div>
          <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" placeholder="sofia@club.com" /></div>
          <div className="space-y-2"><Label>Password</Label><Input name="password" type="password" placeholder="Minimum 8 characters" /></div>
          <div className="space-y-2">
            <Label>Role</Label>
            <select name="role" className="h-12 w-full rounded-md border bg-input px-3 text-sm">
              {["PROMOTER", "PROMOTER_MANAGER", "CLIENT", "SUPER_ADMIN"].map((role) => <option key={role} value={role}>{formatEnum(role)}</option>)}
            </select>
          </div>
          <div className="space-y-2"><Label>Phone</Label><Input name="phone" placeholder="+34..." /></div>
          <div className="space-y-2">
            <Label>Promoter manager</Label>
            <select name="managerId" className="h-12 w-full rounded-md border bg-input px-3 text-sm">
              <option value="">No manager</option>
              {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name ?? manager.email}</option>)}
            </select>
          </div>
          <Button className="md:col-span-2" type="submit">Create user</Button>
        </form>
      </LuxuryCard>
      <form action="/admin/users" className="mb-4 grid gap-2 rounded-lg border border-champagne-700/40 bg-card p-3 md:grid-cols-[1fr_180px_180px_auto]"><Input name="q" defaultValue={filters.q ?? ""} placeholder="Search name, email or phone" /><select name="role" defaultValue={filters.role ?? ""} className="h-12 rounded-md border bg-input px-3 text-sm"><option value="">All roles</option>{["PROMOTER", "PROMOTER_MANAGER", "CLIENT", "SUPER_ADMIN"].map((role) => <option key={role} value={role}>{formatEnum(role)}</option>)}</select><select name="active" defaultValue={filters.active ?? ""} className="h-12 rounded-md border bg-input px-3 text-sm"><option value="">Any access</option><option value="active">Active</option><option value="suspended">Suspended</option></select><Button type="submit">Filter</Button></form>
      <div className="space-y-3">
        {users.map((user) => (
          <LuxuryCard key={`${user.id}-${user.role}`} className={!user.active ? "opacity-70" : undefined}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate font-semibold">{user.name ?? user.email}</p>
                <p className="mt-1 truncate text-sm text-muted-foreground">{user.email} · {formatEnum(user.role)}</p>
              </div>
              <span className={user.active ? "text-xs font-semibold text-emerald-400" : "text-xs font-semibold text-muted-foreground"}>
                {user.active ? "ACTIVE" : "SUSPENDED"}
              </span>
            </div>
            {user.id !== profile.id && (
              <form action={assignUserManager} className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                <input type="hidden" name="userId" value={user.id} />
                <select name="managerId" defaultValue={user.manager_id ?? ""} disabled={user.role !== "PROMOTER"} className="h-11 rounded-md border bg-input px-3 text-sm"><option value="">No manager</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name ?? manager.email}</option>)}</select>
                <Button type="submit" variant="secondary" disabled={user.role !== "PROMOTER"}>Assign</Button>
              </form>
            )}
            {["PROMOTER", "PROMOTER_MANAGER"].includes(user.role) && <details className="mt-4"><summary className="cursor-pointer text-sm text-champagne-300">Club access</summary><div className="mt-3 grid gap-2 sm:grid-cols-2">{clubs.filter((club) => club.active).map((club) => { const assigned = assignments.some((item) => item.club_id === club.id && item.user_id === user.id); return <form key={club.id} action={setUserClubAssignment} className="flex items-center justify-between gap-2 rounded-md bg-secondary p-2"><input type="hidden" name="userId" value={user.id} /><input type="hidden" name="clubId" value={club.id} /><input type="hidden" name="assigned" value={String(!assigned)} /><span className="truncate text-sm">{club.name}</span><Button type="submit" size="sm" variant={assigned ? "outline" : "secondary"}>{assigned ? "Remove" : "Assign"}</Button></form>; })}</div></details>}
            {user.id !== profile.id && (
              <form action={setUserActive} className="mt-4">
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="active" value={String(!user.active)} />
                <Button type="submit" variant={user.active ? "outline" : "secondary"} className="w-full">
                  {user.active ? "Suspend access" : "Restore access"}
                </Button>
              </form>
            )}
          </LuxuryCard>
        ))}
        {!users.length && <LuxuryCard className="text-center text-sm text-muted-foreground">No users match these filters.</LuxuryCard>}
      </div>
    </AppShell>
  );
}
