import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, User, Video, ChevronRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserWithCampaignCount {
  id: string;
  email: string;
  full_name: string | null;
  channel_name: string | null;
  channel_url: string | null;
  created_at: string;
  campaign_count: number;
}

const CampaignUsersPage = () => {
  const [users, setUsers] = useState<UserWithCampaignCount[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithCampaignCount[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsersWithCampaigns();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredUsers(
        users.filter(u =>
          u.full_name?.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          u.channel_name?.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, users]);

  const fetchUsersWithCampaigns = async () => {
    try {
      const { data, error } = await (supabase as any).rpc('get_campaign_management_users');

      if (error) throw error;

      const usersWithCounts = (data || []) as UserWithCampaignCount[];

      setUsers(usersWithCounts);
      setFilteredUsers(usersWithCounts);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">All Clients</h2>
        <p className="text-gray-500 mt-1">Select a client to view and manage their campaigns</p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <Input
          placeholder="Search by name, email, or channel..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 h-12 text-base rounded-xl border-gray-200 focus:border-orange-400 focus:ring-orange-400/20"
        />
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-gray-500">
        <span>{filteredUsers.length} client{filteredUsers.length !== 1 ? 's' : ''}</span>
        <span>•</span>
        <span>{filteredUsers.filter(u => u.campaign_count > 0).length} with campaigns</span>
      </div>

      {/* Users Grid */}
      <div className="grid gap-3">
        {filteredUsers.map(user => (
          <Card
            key={user.id}
            className="border border-gray-100 hover:border-orange-200 hover:shadow-md transition-all cursor-pointer group"
            onClick={() => navigate(`/campaign-management/${user.id}`)}
          >
            <CardContent className="flex items-center gap-4 p-4">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-gray-400" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 truncate">
                    {user.full_name || 'No Name'}
                  </span>
                  {user.campaign_count > 0 && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      <Video className="h-3 w-3 mr-1" />
                      {user.campaign_count} campaign{user.campaign_count !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">{user.email}</p>
                {user.channel_name && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">{user.channel_name}</p>
                )}
              </div>

              {/* Arrow */}
              <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-orange-400 transition-colors flex-shrink-0" />
            </CardContent>
          </Card>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No clients found matching "{searchTerm}"
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignUsersPage;
