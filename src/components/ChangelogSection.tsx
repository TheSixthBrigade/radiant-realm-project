import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, Plus, Edit2, Trash2, Eye, EyeOff, 
  Calendar, Tag, Loader2, ChevronDown, ChevronUp,
  Sparkles, X
} from 'lucide-react';
import { toast } from 'sonner';

interface Changelog {
  id: string;
  product_id: string;
  version_id?: string;
  version_name: string;
  title?: string;
  content?: string;
  release_date: string;
  is_published: boolean;
  created_at: string;
}

interface ChangelogSectionProps {
  productId: string;
  isOwner: boolean;
  accentColor?: string;
}

export const ChangelogSection = ({ productId, isOwner, accentColor = '#7c3aed' }: ChangelogSectionProps) => {
  const [changelogs, setChangelogs] = useState<Changelog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  
  // Form state
  const [versionName, setVersionName] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchChangelogs();
  }, [productId]);

  const fetchChangelogs = async () => {
    try {
      let query = (supabase as any)
        .from('changelogs')
        .select('*')
        .eq('product_id', productId)
        .order('release_date', { ascending: false });
      
      // Non-owners only see published changelogs
      if (!isOwner) {
        query = query.eq('is_published', true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setChangelogs(data || []);
      
      // Auto-expand first changelog
      if (data && data.length > 0) {
        setExpanded({ [data[0].id]: true });
      }
    } catch (e) {
      console.error('Error fetching changelogs:', e);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setVersionName('');
    setTitle('');
    setContent('');
    setIsPublished(false);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!versionName.trim()) {
      toast.error('Version name is required');
      return;
    }
    
    setSubmitting(true);
    try {
      if (editingId) {
        // Update existing
        await (supabase as any)
          .from('changelogs')
          .update({
            version_name: versionName.trim(),
            title: title.trim() || null,
            content: content.trim() || null,
            is_published: isPublished
          })
          .eq('id', editingId);
        toast.success('Changelog updated!');
      } else {
        // Create new
        await (supabase as any)
          .from('changelogs')
          .insert({
            product_id: productId,
            version_name: versionName.trim(),
            title: title.trim() || null,
            content: content.trim() || null,
            is_published: isPublished,
            release_date: new Date().toISOString()
          });
        toast.success('Changelog created!');
      }
      resetForm();
      fetchChangelogs();
    } catch (e) {
      console.error('Error saving changelog:', e);
      toast.error('Failed to save changelog');
    }
    setSubmitting(false);
  };

  const handleEdit = (changelog: Changelog) => {
    setEditingId(changelog.id);
    setVersionName(changelog.version_name);
    setTitle(changelog.title || '');
    setContent(changelog.content || '');
    setIsPublished(changelog.is_published);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this changelog?')) return;
    try {
      await (supabase as any).from('changelogs').delete().eq('id', id);
      toast.success('Changelog deleted');
      fetchChangelogs();
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const togglePublish = async (id: string, currentState: boolean) => {
    try {
      await (supabase as any)
        .from('changelogs')
        .update({ is_published: !currentState })
        .eq('id', id);
      toast.success(currentState ? 'Unpublished' : 'Published!');
      fetchChangelogs();
    } catch (e) {
      toast.error('Failed to update');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Parse markdown-like content for display
  const renderContent = (text: string) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Headers
      if (line.startsWith('### ')) {
        return <h4 key={i} className="text-sm font-semibold mt-4 mb-2 text-purple-400">{line.slice(4)}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={i} className="text-base font-semibold mt-4 mb-2 text-white">{line.slice(3)}</h3>;
      }
      // List items
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <div key={i} className="flex items-start gap-2 ml-2 my-1">
            <span className="text-green-400 mt-1">•</span>
            <span className="text-gray-300">{line.slice(2)}</span>
          </div>
        );
      }
      // Empty lines
      if (!line.trim()) {
        return <div key={i} className="h-2" />;
      }
      // Regular text
      return <p key={i} className="text-gray-300 my-1">{line}</p>;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: accentColor }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6" style={{ color: accentColor }} />
          <h2 className="text-2xl font-bold text-white">Changelog</h2>
        </div>
        {isOwner && (
          <Button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="rounded-full"
            style={{ backgroundColor: accentColor }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Release
          </Button>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && isOwner && (
        <div 
          className="p-6 rounded-2xl border backdrop-blur-xl"
          style={{ 
            backgroundColor: 'rgba(30, 41, 59, 0.6)',
            borderColor: 'rgba(124, 58, 237, 0.3)'
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              {editingId ? 'Edit Changelog' : 'New Changelog'}
            </h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Version *</label>
                <Input
                  placeholder="e.g. v1.2.0"
                  value={versionName}
                  onChange={e => setVersionName(e.target.value)}
                  className="bg-black/30 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Title (optional)</label>
                <Input
                  placeholder="e.g. Major Update"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="bg-black/30 border-gray-700 text-white"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Changes (Markdown supported)</label>
              <Textarea
                placeholder="## Added&#10;- New feature X&#10;- Improved Y&#10;&#10;## Fixed&#10;- Bug with Z"
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={8}
                className="bg-black/30 border-gray-700 text-white font-mono text-sm"
              />
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={e => setIsPublished(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-300">Publish immediately</span>
              </label>
              
              <div className="flex gap-2">
                <Button variant="ghost" onClick={resetForm} className="text-gray-400">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !versionName.trim()}
                  style={{ backgroundColor: accentColor }}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {editingId ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Changelog List */}
      {changelogs.length === 0 ? (
        <div 
          className="text-center py-16 rounded-2xl border"
          style={{ 
            backgroundColor: 'rgba(30, 41, 59, 0.3)',
            borderColor: 'rgba(255, 255, 255, 0.1)'
          }}
        >
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <p className="text-gray-400">No changelogs yet</p>
          {isOwner && (
            <p className="text-sm text-gray-500 mt-2">Create your first release notes above</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {changelogs.map(changelog => {
            const isExpanded = expanded[changelog.id];
            return (
              <div
                key={changelog.id}
                className="rounded-2xl border overflow-hidden transition-all"
                style={{ 
                  backgroundColor: 'rgba(30, 41, 59, 0.4)',
                  borderColor: isExpanded ? accentColor + '50' : 'rgba(255, 255, 255, 0.1)'
                }}
              >
                {/* Header */}
                <button
                  onClick={() => setExpanded(p => ({ ...p, [changelog.id]: !p[changelog.id] }))}
                  className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: accentColor + '20' }}
                    >
                      <Tag className="w-5 h-5" style={{ color: accentColor }} />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-white">{changelog.version_name}</span>
                        {changelog.title && (
                          <span className="text-gray-400">— {changelog.title}</span>
                        )}
                        {!changelog.is_published && isOwner && (
                          <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                            Draft
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(changelog.release_date)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOwner && (
                      <div className="flex gap-1 mr-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => togglePublish(changelog.id, changelog.is_published)}
                          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                          title={changelog.is_published ? 'Unpublish' : 'Publish'}
                        >
                          {changelog.is_published ? (
                            <Eye className="w-4 h-4 text-green-400" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(changelog)}
                          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(changelog.id)}
                          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>
                
                {/* Content */}
                {isExpanded && changelog.content && (
                  <div 
                    className="px-5 pb-5 pt-0 border-t"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                  >
                    <div className="pl-16 pt-4">
                      {renderContent(changelog.content)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChangelogSection;
