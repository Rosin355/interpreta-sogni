import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, User } from "lucide-react";

interface UserProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string | null;
  roles: string[];
}

const AdminUsersList = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, created_at')
        .order('created_at', { ascending: false });

      if (!profiles) { setLoading(false); return; }

      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const roleMap = new Map<string, string[]>();
      (roles || []).forEach(r => {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      });

      setUsers(profiles.map(p => ({
        ...p,
        roles: roleMap.get(p.id) || ['user'],
      })));
      setLoading(false);
    };

    fetchUsers();
  }, []);

  const filtered = users.filter(u =>
    !search || (u.username || '').toLowerCase().includes(search.toLowerCase())
  );

  const roleBadgeVariant = (role: string) => {
    if (role === 'super_admin') return 'destructive' as const;
    if (role === 'admin') return 'default' as const;
    if (role === 'professional') return 'secondary' as const;
    return 'outline' as const;
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca utente per username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} utenti trovati</p>

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filtered.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-3 flex items-center gap-3">
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
              <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                {user.roles.map(role => (
                  <Badge key={role} variant={roleBadgeVariant(role)} className="text-[10px]">
                    {role.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminUsersList;
