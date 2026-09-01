import { AppShell } from "@/components/layout/app-shell";
import { StatusSubmitButton } from "@/components/request/status-submit-button";
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
        <details>
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-sm font-semibold">
            Create user
            <span className="text-xs font-normal text-muted-foreground">Manager, promoter, client</span>
          </summary>
        <form action={createUserProfile} className="mt-3 grid gap-2 md:grid-cols-2">
          <div className="space-y-1.5"><Label>Name</Label><Input name="name" placeholder="Julia Casanis" /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input name="email" type="email" placeholder="sofia@club.com" /></div>
          <div className="space-y-1.5"><Label>Password</Label><Input name="password" type="password" placeholder="Minimum 8 characters" /></div>
          <div className="space-y-2">
            <Label>Role</Label>
            <select name="role" className="h-10 w-full rounded-md border bg-input px-3 text-sm">
              {["PROMOTER", "PROMOTER_MANAGER", "CLIENT", "SUPER_ADMIN"].map((role) => <option key={role} value={role}>{formatEnum(role)}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label>Phone</Label><Input name="phone" placeholder="+34..." /></div>
          <div className="space-y-1.5">
            <Label>Promoter manager</Label>
            <select name="managerId" className="h-10 w-full rounded-md border bg-input px-3 text-sm">
              <option value="">No manager</option>
              {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name ?? manager.email}</option>)}
            </select>
          </div>
          <Button className="md:col-span-2" type="submit">Create user</Button>
        </form>
        </details>
      </LuxuryCard>
      <div className="mb-3 grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 bg-white text-center text-slate-950">
        <Metric label="Users" value={String(users.length)} />
        <Metric label="Active" value={String(users.filter((user) => user.active).length)} />
        <Metric label="Managers" value={String(users.filter((user) => user.role === "PROMOTER_MANAGER").length)} />
      </div>
      <form action="/admin/users" className="mb-4 grid gap-2 rounded-lg border border-slate-200 bg-white p-2.5 md:grid-cols-[1fr_180px_180px_auto]"><Input name="q" defaultValue={filters.q ?? ""} placeholder="Search name, email or phone" /><select name="role" defaultValue={filters.role ?? ""} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950"><option value="">All roles</option>{["PROMOTER", "PROMOTER_MANAGER", "CLIENT", "SUPER_ADMIN"].map((role) => <option key={role} value={role}>{formatEnum(role)}</option>)}</select><select name="active" defaultValue={filters.active ?? ""} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950"><option value="">Any access</option><option value="active">Active</option><option value="suspended">Suspended</option></select><Button type="submit">Filter</Button></form>
      <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {users.map((user) => (
          <div key={`${user.id}-${user.role}`} className={`px-3 py-2.5 text-ink-950 ${!user.active ? "opacity-70" : ""}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink-950">{user.name ?? user.email}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500 md:text-sm">{user.email} · {formatEnum(user.role)}</p>
              </div>
              <span className={user.active ? "rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500"}>
                {user.active ? "Active" : "Suspended"}
              </span>
            </div>
            {user.id !== profile.id && (
              <details className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium text-slate-700">Manage access and venues</summary>
                <form action={assignUserManager} className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                  <input type="hidden" name="userId" value={user.id} />
                  <select name="managerId" defaultValue={user.manager_id ?? ""} disabled={user.role !== "PROMOTER"} className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950"><option value="">No manager</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name ?? manager.email}</option>)}</select>
                  {user.role === "PROMOTER" ? (
                    <StatusSubmitButton label="Assign" pendingLabel="Saving" variant="secondary" className="bg-slate-100 text-slate-900 hover:bg-slate-200" />
                  ) : (
                    <Button type="submit" variant="secondary" disabled>Assign</Button>
                  )}
                </form>
                {["PROMOTER", "PROMOTER_MANAGER"].includes(user.role) && <div className="mt-3 grid gap-1.5 sm:grid-cols-2">{clubs.filter((club) => club.active).map((club) => { const assigned = assignments.some((item) => item.club_id === club.id && item.user_id === user.id); return <form key={club.id} action={setUserClubAssignment} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white p-2"><input type="hidden" name="userId" value={user.id} /><input type="hidden" name="clubId" value={club.id} /><input type="hidden" name="assigned" value={String(!assigned)} /><span className="truncate text-sm text-slate-700">{club.name}</span><StatusSubmitButton label={assigned ? "Remove" : "Assign"} pendingLabel="Saving" size="sm" variant={assigned ? "outline" : "secondary"} /></form>; })}</div>}
                <form action={setUserActive} className="mt-3">
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="active" value={String(!user.active)} />
                  <StatusSubmitButton label={user.active ? "Suspend access" : "Restore access"} pendingLabel="Saving" variant={user.active ? "outline" : "secondary"} className="w-full" />
                </form>
              </details>
            )}
          </div>
        ))}
        {!users.length && <LuxuryCard className="text-center text-sm text-muted-foreground">No users match these filters.</LuxuryCard>}
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="border-r border-slate-200 p-2.5 last:border-r-0">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold leading-none">{value}</p>
    </div>
  );
}
