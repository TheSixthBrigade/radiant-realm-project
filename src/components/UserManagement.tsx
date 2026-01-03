import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Search, 
  Ban, 
  UserX, 
  Shield, 
  Edit,
  Mail,
  Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Get all profiles with user data
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user roles for each profile
      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.user_id);

          return {
            ...profile,
            roles: roles?.map(r => r.role) || []
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: string, displayName: string) => {
    if (!confirm(`Are you sure you want to ban ${displayName}?`)) return;

    try {
      // Add banned role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'banned'
        });

      if (error) throw error;
      toast.success(`${displayName} has been banned`);
      fetchUsers();
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    }
  };

  const handleUnbanUser = async (userId: string, displayName: string) => {
    try {
      // Remove banned role
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'banned');

      if (error) throw error;
      toast.success(`${displayName} has been unbanned`);
      fetchUsers();
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('Failed to unban user');
    }
  };

  const handleDeleteUser = async (userId: string, displayName: string) => {
    if (!confirm(`Are you sure you want to DELETE ${displayName}? This action cannot be undone!`)) return;

    try {
      // Delete profile (cascade will handle related data)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      toast.success(`${displayName} has been deleted`);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleToggleCreator = async (userId: string, currentStatus: boolean, displayName: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_creator: !currentStatus })
        .eq('user_id', userId);

      if (error) throw error;
      toast.success(`${displayName} ${!currentStatus ? 'is now' : 'is no longer'} a creator`);
      fetchUsers();
    } catch (error) {
      console.error('Error toggling creator status:', error);
      toast.error('Failed to update creator status');
    }
  };

  const filteredUsers = users.filter(user => 
    user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.user_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">User Management</h2>
        </div>
        <Badge variant="secondary">{users.length} Total Users</Badge>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search users by name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No users found</p>
          </Card>
        ) : (
          filteredUsers.map((user) => {
            const isBanned = user.roles.includes('banned');
            const isAdmin = user.roles.includes('admin');

            return (
              <Card key={user.user_id} className={`p-4 ${isBanned ? 'opacity-50 border-red-500' : ''}`}>
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-6 h-6 text-primary" />
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold">{user.display_name || 'Unnamed User'}</h3>
                      {isAdmin && (
                        <Badge variant="default" className="text-xs">
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      {user.is_creator && (
                        <Badge variant="secondary" className="text-xs">
                          Creator
                        </Badge>
                      )}
                      {isBanned && (
                        <Badge variant="destructive" className="text-xs">
                          <Ban className="w-3 h-3 mr-1" />
                          Banned
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3" />
                        <span className="text-xs truncate">{user.user_id}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        <span className="text-xs">
                          Joined {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {!isAdmin && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleCreator(user.user_id, user.is_creator, user.display_name)}
                          title={user.is_creator ? "Remove creator status" : "Make creator"}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        {isBanned ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnbanUser(user.user_id, user.display_name)}
                            title="Unban user"
                          >
                            <Shield className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBanUser(user.user_id, user.display_name)}
                            title="Ban user"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteUser(user.user_id, user.display_name)}
                          title="Delete user"
                        >
                          <UserX className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default UserManagement;
