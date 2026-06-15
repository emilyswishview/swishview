import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { EmployeePermissions, READ_ONLY_PERMS } from "@/hooks/useProspectsSession";
import { Loader2 } from "lucide-react";

const FIELDS: { key: keyof EmployeePermissions; label: string; desc: string }[] = [
  { key: "can_edit",   label: "Edit rows",       desc: "Change any prospect cell (status, notes, etc.)" },
  { key: "can_create", label: "Add new rows",    desc: "Create prospects manually" },
  { key: "can_delete", label: "Delete rows",     desc: "Permanently remove prospects" },
  { key: "can_send",   label: "Send emails",     desc: "Send / queue outreach emails" },
  { key: "can_sync",   label: "Sync channels",   desc: "Run YouTube channel sync" },
  { key: "can_ban",    label: "Ban / unban",     desc: "Move prospects to banned leads" },
  { key: "can_export", label: "Export data",     desc: "Download CSV / Excel exports" },
];

export default function EmployeePermissionsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [perms, setPerms] = useState<EmployeePermissions>(READ_ONLY_PERMS);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("prospects_employee_permissions" as any).select("*").eq("id", 1).maybeSingle();
      if (data) setPerms({ ...READ_ONLY_PERMS, ...(data as any) });
      setLoading(false);
    })();
  }, [open]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("prospects_employee_permissions" as any).update({ ...perms, updated_at: new Date().toISOString() }).eq("id", 1);
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Permissions updated", description: "Employees see changes on next page load." });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Employee Permissions</DialogTitle>
          <DialogDescription>Choose what non-admin @swishview.com employees can do on the Prospects page. Everything off = read-only.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="space-y-3 py-2">
            {FIELDS.map(f => (
              <div key={f.key} className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor={f.key} className="font-medium">{f.label}</Label>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
                <Switch id={f.key} checked={perms[f.key]} onCheckedChange={(v) => setPerms(p => ({ ...p, [f.key]: v }))} />
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || loading}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
