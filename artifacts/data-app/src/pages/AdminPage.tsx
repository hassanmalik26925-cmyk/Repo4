import { motion } from "framer-motion";
import { Shield, Users, Activity, FileText, AlertCircle } from "lucide-react";
import { useListAdminUsers, useGetAdminStats, useListAdminAuditLogs } from "@workspace/api-client-react";
import { useAuth } from "../contexts/AuthContext";
import { formatRelative } from "../lib/format";
import { Skeleton } from "../components/UIPrimitives";
import { AnimatedPage } from "../components/AnimatedPage";

export function AdminPage() {
  const { user } = useAuth();
  const users = useListAdminUsers();
  const stats = useGetAdminStats();
  const audit = useListAdminAuditLogs();

  if (!user || user.role !== "admin") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-lg font-semibold">Admin Access Required</h2>
        <p className="text-sm text-muted-foreground">You need admin privileges to view this page.</p>
      </div>
    );
  }

  return (
    <AnimatedPage>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">System overview and user management</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={<Users className="h-4 w-4" />} label="Users" value={stats.data?.userCount ?? 0} color="bg-sky-500" />
          <StatCard icon={<Activity className="h-4 w-4" />} label="Logins Today" value={stats.data?.todayLogins ?? 0} color="bg-emerald-500" />
          <StatCard icon={<FileText className="h-4 w-4" />} label="Audit Logs" value={stats.data?.auditLogCount ?? 0} color="bg-violet-500" />
        </div>

        {/* Users table */}
        <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-card overflow-hidden">
          <div className="border-b border-[hsl(var(--card-border))] px-4 py-3">
            <h2 className="text-sm font-semibold">Users</h2>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {users.isLoading ? (
              <div className="p-4 space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-accent/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Role</th>
                    <th className="px-4 py-2 text-left">Currency</th>
                    <th className="px-4 py-2 text-left">Billing</th>
                    <th className="px-4 py-2 text-left">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.data?.users.map((u) => (
                    <tr key={u.id} className="border-t border-[hsl(var(--card-border))]">
                      <td className="px-4 py-2.5 font-medium">{u.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          u.role === "admin" ? "bg-violet-500/10 text-violet-500" : "bg-sky-500/10 text-sky-500"
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{u.currency}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        <span className={u.billingStatus === "active" || u.billingStatus === "trialing" ? "text-emerald-600" : ""}>
                          {u.billingStatus ?? "inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatRelative(u.createdAt ?? "")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Audit logs */}
        <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-card overflow-hidden">
          <div className="border-b border-[hsl(var(--card-border))] px-4 py-3">
            <h2 className="text-sm font-semibold">Recent Audit Logs</h2>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {audit.isLoading ? (
              <div className="p-4 space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-accent/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">Action</th>
                    <th className="px-4 py-2 text-left">Resource</th>
                    <th className="px-4 py-2 text-left">IP</th>
                    <th className="px-4 py-2 text-left">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.data?.logs.map((log) => (
                    <tr key={log.id} className="border-t border-[hsl(var(--card-border))]">
                      <td className="px-4 py-2.5 font-medium">{log.action}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{log.resource ?? "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{log.ip ?? "—"}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatRelative(log.createdAt ?? "")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-card p-4">
      <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg text-white ${color}`}>
        {icon}
      </div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
