import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, User, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logAuditEvent } from "@/utils/audit-logger";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ALL_ROLES = ['user', 'professional', 'admin', 'super_admin'] as const;

interface UserProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string | null;
  roles: string[];
}

const AdminUsersList = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [roleToAdd, setRoleToAdd] = useState<string>("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{ userId: string; role: string } | null>(null);

  const fetchUsers = useCallback(async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, created_at')
      .order('created_at', { ascending: false });

    if (!profiles) { setLoading(false); return; }

    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    const roleMap = new Map<string, string[]>();
    (roles || []).forEach(r => {
      const existing = roleMap.get(r.user_id) || [];
      existing.push(r.role);
      roleMap.set(r.user_id, existing);
    });

    setUsers(profiles.map(p => ({ ...p, roles: roleMap.get(p.id) || ['user'] })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const addRole = async (userId: string, role: string) => {
    setProcessing(userId);
    try {
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: role as any });
      if (error) throw error;
      await logAuditEvent({
        action: 'admin_action', tableName: 'user_roles',
        targetUserId: userId, details: { specificAction: 'added_role', role }
      });
      toast({ title: `Ruolo "${role}" aggiunto` });
      setEditingUserId(null);
      setRoleToAdd("");
      await fetchUsers();
    } catch (e: any) {
      toast({ title: "Errore", description: e.message, variant: "destructive" });
    } finally { setProcessing(null); }
  };

  const removeRole = async (userId: string, role: string) => {
    setProcessing(userId);
    try {
      const { error } = await supabase.from('user_roles').delete()
        .eq('user_id', userId).eq('role', role as any);
      if (error) throw error;
      await logAuditEvent({
        action: 'admin_action', tableName: 'user_roles',
        targetUserId: userId, details: { specificAction: 'removed_role', role }
      });
      toast({ title: `Ruolo "${role}" rimosso` });
      setConfirmRemove(null);
      await fetchUsers();
    } catch (e: any) {
      toast({ title: "Errore", description: e.message, variant: "destructive" });
    } finally { setProcessing(null); }
  };

  const filtered = users.filter(u =>
    !search || (u.username || '').toLowerCase().includes(search.toLowerCase())
  );

  const roleBadgeVariant = (role: string) => {
    if (role === 'super_admin') return 'destructive' as const;
    if (role === 'admin') return 'default' as const;
    if (role === 'professional') return 'secondary' as const;
    return 'outline' as const;
  };

  const availableRoles = (currentRoles: string[]) =>
    ALL_ROLES.filter(r => !currentRoles.includes(r));

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cerca utente per username..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} utenti trovati</p>

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filtered.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-secondary/50 flex items-center justify-center shrink-0">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.username || 'Senza nome'}</p>
                  <p className="text-xs text-muted-foreground">
                    Iscritto il {user.created_at ? new Date(user.created_at).toLocaleDateString('it-IT') : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                  {user.roles.map(role => (
                    <Badge
                      key={role}
                      variant={roleBadgeVariant(role)}
                      className="text-[10px] gap-1 cursor-pointer hover:opacity-80"
                      onClick={() => setConfirmRemove({ userId: user.id, role })}
                    >
                      {role.replace('_', ' ')}
                      <X className="h-2.5 w-2.5" />
                    </Badge>
                  ))}
                  {availableRoles(user.roles).length > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => { setEditingUserId(editingUserId === user.id ? null : user.id); setRoleToAdd(""); }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {editingUserId === user.id && (
                <div className="flex items-center gap-2 pl-12">
                  <Select value={roleToAdd} onValueChange={setRoleToAdd}>
                    <SelectTrigger className="h-8 text-xs w-40">
                      <SelectValue placeholder="Seleziona ruolo" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles(user.roles).map(r => (
                        <SelectItem key={r} value={r} className="text-xs">{r.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    disabled={!roleToAdd || processing === user.id}
                    onClick={() => roleToAdd && addRole(user.id, roleToAdd)}
                  >
                    {processing === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Aggiungi'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!confirmRemove} onOpenChange={(open) => !open && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovere ruolo</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler rimuovere il ruolo "{confirmRemove?.role.replace('_', ' ')}" da questo utente?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRemove && removeRole(confirmRemove.userId, confirmRemove.role)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!!processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Rimuovi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsersList;
