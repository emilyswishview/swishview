import { useCallback, useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Activity, Calendar, Mail, RefreshCw, Search, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/looseClient";
import { useToast } from "@/hooks/use-toast";

interface WebsiteUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  created_at: string | null;
  google_sub: string | null;
}

interface UserActivity {
  id: string;
  text: string;
  date: string;
}

interface UserSummary extends WebsiteUser {
  campaigns: number;
  payments: number;
  activities: UserActivity[];
  lastActivity: string | null;
}

const safeDate = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const LoggedInUsersPanel = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [profilesResult, activitiesResult, campaignsResult, paymentsResult, seoResult] = await Promise.all([
        supabase.from("profiles").select("id, email, full_name, role, created_at, google_sub").order("created_at", { ascending: false }),
        supabase.from("recent_activities").select("id, user_id, activity_text, activity_date, created_at").order("created_at", { ascending: false }).limit(5000),
        supabase.from("promotions").select("id, user_id, title, status, created_at").order("created_at", { ascending: false }),
        supabase.from("payments").select("id, user_id, amount, status, created_at").order("created_at", { ascending: false }),
        supabase.from("seo_purchases").select("id, user_id, status, created_at").order("created_at", { ascending: false }),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (activitiesResult.error) throw activitiesResult.error;
      if (campaignsResult.error) throw campaignsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      if (seoResult.error) throw seoResult.error;

      const activityMap = new Map<string, UserActivity[]>();
      const addActivity = (userId: string | null, activity: UserActivity) => {
        if (!userId) return;
        const current = activityMap.get(userId) || [];
        current.push(activity);
        activityMap.set(userId, current);
      };

      (activitiesResult.data || []).forEach((item: any) => addActivity(item.user_id, {
        id: `activity-${item.id}`,
        text: item.activity_text,
        date: item.created_at || item.activity_date,
      }));
      (campaignsResult.data || []).forEach((item: any) => addActivity(item.user_id, {
        id: `campaign-${item.id}`,
        text: `Campaign created: ${item.title || "Untitled campaign"}`,
        date: item.created_at,
      }));
      (paymentsResult.data || []).forEach((item: any) => addActivity(item.user_id, {
        id: `payment-${item.id}`,
        text: `Payment ${item.status || "recorded"}${item.amount ? ` · ${item.amount}` : ""}`,
        date: item.created_at,
      }));
      (seoResult.data || []).forEach((item: any) => addActivity(item.user_id, {
        id: `seo-${item.id}`,
        text: `SEO purchase ${item.status || "updated"}`,
        date: item.created_at,
      }));

      setUsers((profilesResult.data || []).map((profile: WebsiteUser) => {
        const activities = (activityMap.get(profile.id) || [])
          .filter((item) => safeDate(item.date))
          .sort((a, b) => +new Date(b.date) - +new Date(a.date))
          .slice(0, 5);
        return {
          ...profile,
          campaigns: (campaignsResult.data || []).filter((item: any) => item.user_id === profile.id).length,
          payments: (paymentsResult.data || []).filter((item: any) => item.user_id === profile.id && item.status === "completed").length,
          activities,
          lastActivity: activities[0]?.date || profile.created_at,
        };
      }));
    } catch (error: any) {
      console.error("Failed to load logged-in users:", error);
      toast({ title: "Could not load users", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => `${user.full_name || ""} ${user.email}`.toLowerCase().includes(query));
  }, [search, users]);

  return (
    <div className="min-h-full overflow-auto p-4 sm:p-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Swishview logged in user</h2>
          <p className="text-xs text-muted-foreground">Website accounts and their latest activity.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading} className="gap-2 self-start">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" className="pl-9" />
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">{loading ? "Loading users…" : `${filteredUsers.length} website users`}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-y border-border bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Activity</th>
                  <th className="px-4 py-3 font-medium">Campaigns</th>
                  <th className="px-4 py-3 font-medium">Paid orders</th>
                  <th className="px-4 py-3 font-medium">Latest activity</th>
                </tr>
              </thead>
              <tbody>
                {!loading && filteredUsers.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No website users found.</td></tr>
                )}
                {filteredUsers.map((user) => {
                  const joined = safeDate(user.created_at);
                  const lastActivity = safeDate(user.lastActivity);
                  return (
                    <tr key={user.id} className="border-b border-border/70 align-top last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound className="h-4 w-4" /></div>
                          <div className="min-w-0"><div className="font-medium truncate max-w-[220px]">{user.full_name || "Unnamed user"}</div><div className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{user.email}</div><Badge variant="outline" className="mt-1 text-[10px]">{user.google_sub ? "Google" : "Email"}</Badge></div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{joined ? format(joined, "MMM d, yyyy") : "—"}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1 font-medium"><Activity className="h-3.5 w-3.5 text-primary" />{user.activities.length}</div><div className="mt-1 max-w-[260px] space-y-1">{user.activities.slice(0, 2).map((activity) => <div key={activity.id} className="truncate text-xs text-muted-foreground" title={activity.text}>{activity.text}</div>)}{user.activities.length > 2 && <div className="text-[11px] text-muted-foreground">+{user.activities.length - 2} more</div>}</div></td>
                      <td className="px-4 py-3 text-center">{user.campaigns}</td>
                      <td className="px-4 py-3 text-center">{user.payments}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{lastActivity ? <><div>{formatDistanceToNow(lastActivity, { addSuffix: true })}</div><div className="mt-1 flex items-center gap-1 text-[11px]"><Calendar className="h-3 w-3" />{format(lastActivity, "MMM d, yyyy h:mm a")}</div></> : "No activity yet"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoggedInUsersPanel;