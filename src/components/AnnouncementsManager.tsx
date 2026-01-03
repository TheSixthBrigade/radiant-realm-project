import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Plus, Trash2, Edit, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const AnnouncementsManager = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "info",
    border_color: "red"
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.message) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from('announcements')
          .update({
            title: formData.title,
            message: formData.message,
            type: formData.type,
            border_color: formData.border_color,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Announcement updated!');
      } else {
        // Create new
        const { error } = await supabase
          .from('announcements')
          .insert({
            admin_id: user?.id,
            title: formData.title,
            message: formData.message,
            type: formData.type,
            border_color: formData.border_color,
            is_active: true
          });

        if (error) throw error;
        toast.success('Announcement created!');
      }

      setFormData({ title: "", message: "", type: "info", border_color: "red" });
      setShowForm(false);
      setEditingId(null);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error('Failed to save announcement');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(currentStatus ? 'Announcement hidden' : 'Announcement activated');
      fetchAnnouncements();
    } catch (error) {
      console.error('Error toggling announcement:', error);
      toast.error('Failed to update announcement');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    }
  };

  const handleEdit = (announcement: any) => {
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      border_color: announcement.border_color || "red"
    });
    setEditingId(announcement.id);
    setShowForm(true);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'info': return 'bg-blue-500';
      case 'warning': return 'bg-yellow-500';
      case 'success': return 'bg-green-500';
      case 'update': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

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
          <Megaphone className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Announcements</h2>
        </div>
        <Button onClick={() => {
          setShowForm(!showForm);
          setEditingId(null);
          setFormData({ title: "", message: "", type: "info", border_color: "red" });
        }}>
          <Plus className="w-4 h-4 mr-2" />
          New Announcement
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Announcement title"
                required
              />
            </div>

            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Announcement message"
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="border_color">Border Color</Label>
                <Select value={formData.border_color} onValueChange={(value) => setFormData({ ...formData, border_color: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="red">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500 rounded" />
                        Red
                      </div>
                    </SelectItem>
                    <SelectItem value="orange">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-orange-500 rounded" />
                        Orange
                      </div>
                    </SelectItem>
                    <SelectItem value="green">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded" />
                        Green
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                {editingId ? 'Update' : 'Create'} Announcement
              </Button>
              <Button type="button" variant="outline" onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setFormData({ title: "", message: "", type: "info", border_color: "red" });
              }}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {announcements.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No announcements yet. Create one to notify users!</p>
          </Card>
        ) : (
          announcements.map((announcement) => (
            <Card key={announcement.id} className={`p-4 ${!announcement.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 ${getTypeColor(announcement.type)} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Megaphone className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold">{announcement.title}</h3>
                    <Badge variant="outline" className="text-xs">
                      {announcement.type}
                    </Badge>
                    {!announcement.is_active && (
                      <Badge variant="secondary" className="text-xs">
                        Hidden
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{announcement.message}</p>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(announcement.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleActive(announcement.id, announcement.is_active)}
                  >
                    {announcement.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(announcement)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(announcement.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AnnouncementsManager;
