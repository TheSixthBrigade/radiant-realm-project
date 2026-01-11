import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  ChevronDown, ChevronUp, Plus, Lightbulb, 
  AlertCircle, Sparkles, ThumbsUp, Send, X, Loader2,
  Circle, CheckCircle2, PlayCircle, TestTube2
} from 'lucide-react';
import { toast } from 'sonner';

interface RoadmapVersion {
  id: string;
  creator_id: string;
  version_name: string;
  status: string;
  description?: string;
  sort_order: number;
  is_expanded: boolean;
  items?: RoadmapItem[];
}

interface RoadmapItem {
  id: string;
  version_id: string;
  title: string;
  description?: string;
  status: string;
  sort_order: number;
}

interface RoadmapSuggestion {
  id: string;
  creator_id: string;
  user_id: string;
  version_id?: string;
  title: string;
  description?: string;
  status: string;
  upvotes: number;
  created_at: string;
  user_upvoted?: boolean;
}

interface RoadmapSectionProps {
  creatorId: string;
  isOwner: boolean;
  settings?: {
    title?: string;
    subtitle?: string;
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    cardBackgroundColor?: string;
    [key: string]: any;
  };
}

  // Dynamic status config using custom colors
  const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
    backlog: { label: 'Backlog', color: 'text-slate-400', bgColor: 'bg-slate-700', icon: Circle },
    in_progress: { label: 'In Progress', color: 'text-white', bgColor: '', icon: PlayCircle },
    qa: { label: 'QA', color: 'text-white', bgColor: '', icon: TestTube2 },
    completed: { label: 'Completed', color: 'text-green-400', bgColor: 'bg-green-600', icon: CheckCircle2 },
  };

export const RoadmapSection = ({ creatorId, isOwner, settings }: RoadmapSectionProps) => {
  const { user } = useAuth();
  const [versions, setVersions] = useState<RoadmapVersion[]>([]);
  const [suggestions, setSuggestions] = useState<RoadmapSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({});
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [selectedVersionForSuggestion, setSelectedVersionForSuggestion] = useState<string | null>(null);
  const [suggestionTitle, setSuggestionTitle] = useState('');
  const [suggestionDescription, setSuggestionDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Owner editing states
  const [newVersionName, setNewVersionName] = useState('');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [addingItemToVersion, setAddingItemToVersion] = useState<string | null>(null);

  // Get custom colors from settings
  const primaryColor = settings?.primaryColor || '#8b5cf6'; // purple-500
  const secondaryColor = settings?.secondaryColor || '#3b82f6'; // blue-500
  const backgroundColor = settings?.backgroundColor || 'transparent';
  const cardBackgroundColor = settings?.cardBackgroundColor || '#1e293b'; // slate-800

  useEffect(() => {
    fetchRoadmapData();
  }, [creatorId]);

  const fetchRoadmapData = async () => {
    try {
      // Fetch versions with items
      const { data: versionsData, error: versionsError } = await (supabase as any)
        .from('roadmap_versions')
        .select('*')
        .eq('creator_id', creatorId)
        .order('sort_order', { ascending: true });

      if (versionsError) throw versionsError;

      // Fetch items for all versions
      const { data: itemsData, error: itemsError } = await (supabase as any)
        .from('roadmap_items')
        .select('*')
        .eq('creator_id', creatorId)
        .order('sort_order', { ascending: true });

      if (itemsError) throw itemsError;

      // Combine versions with their items
      const versionsWithItems = (versionsData || []).map((v: RoadmapVersion) => ({
        ...v,
        items: (itemsData || []).filter((i: RoadmapItem) => i.version_id === v.id)
      }));

      setVersions(versionsWithItems);

      // Set initial expanded state
      const expanded: Record<string, boolean> = {};
      versionsWithItems.forEach((v: RoadmapVersion) => {
        expanded[v.id] = v.is_expanded;
      });
      setExpandedVersions(expanded);

      // Fetch suggestions
      const { data: suggestionsData } = await (supabase as any)
        .from('roadmap_suggestions')
        .select('*')
        .eq('creator_id', creatorId)
        .order('upvotes', { ascending: false });

      // Check if current user has upvoted
      if (user && suggestionsData) {
        const { data: upvotesData } = await (supabase as any)
          .from('roadmap_suggestion_upvotes')
          .select('suggestion_id')
          .eq('user_id', user.id);

        const upvotedIds = new Set((upvotesData || []).map((u: any) => u.suggestion_id));
        setSuggestions(suggestionsData.map((s: RoadmapSuggestion) => ({
          ...s,
          user_upvoted: upvotedIds.has(s.id)
        })));
      } else {
        setSuggestions(suggestionsData || []);
      }
    } catch (error) {
      console.error('Error fetching roadmap:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVersion = (versionId: string) => {
    setExpandedVersions(prev => ({ ...prev, [versionId]: !prev[versionId] }));
  };

  const handleSuggestFeature = (versionId?: string) => {
    if (!user) {
      toast.error('Please sign in to suggest features');
      return;
    }
    setSelectedVersionForSuggestion(versionId || null);
    setShowSuggestionModal(true);
  };

  const submitSuggestion = async () => {
    if (!user || !suggestionTitle.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from('roadmap_suggestions')
        .insert({
          creator_id: creatorId,
          user_id: user.id,
          version_id: selectedVersionForSuggestion,
          title: suggestionTitle.trim(),
          description: suggestionDescription.trim() || null,
        });

      if (error) throw error;

      toast.success('Suggestion submitted!');
      setShowSuggestionModal(false);
      setSuggestionTitle('');
      setSuggestionDescription('');
      fetchRoadmapData();
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      toast.error('Failed to submit suggestion');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (suggestionId: string, currentlyUpvoted: boolean) => {
    if (!user) {
      toast.error('Please sign in to upvote');
      return;
    }

    try {
      if (currentlyUpvoted) {
        await (supabase as any)
          .from('roadmap_suggestion_upvotes')
          .delete()
          .eq('suggestion_id', suggestionId)
          .eq('user_id', user.id);
      } else {
        await (supabase as any)
          .from('roadmap_suggestion_upvotes')
          .insert({ suggestion_id: suggestionId, user_id: user.id });
      }
      fetchRoadmapData();
    } catch (error) {
      console.error('Error toggling upvote:', error);
    }
  };

  // Owner functions
  const addVersion = async () => {
    if (!newVersionName.trim()) return;

    try {
      const { error } = await (supabase as any)
        .from('roadmap_versions')
        .insert({
          creator_id: creatorId,
          version_name: newVersionName.trim(),
          sort_order: versions.length,
        });

      if (error) throw error;
      setNewVersionName('');
      fetchRoadmapData();
      toast.success('Version added!');
    } catch (error) {
      console.error('Error adding version:', error);
      toast.error('Failed to add version');
    }
  };

  const addItem = async (versionId: string) => {
    if (!newItemTitle.trim()) return;

    try {
      const version = versions.find(v => v.id === versionId);
      const { error } = await (supabase as any)
        .from('roadmap_items')
        .insert({
          version_id: versionId,
          creator_id: creatorId,
          title: newItemTitle.trim(),
          sort_order: (version?.items?.length || 0),
        });

      if (error) throw error;
      setNewItemTitle('');
      setAddingItemToVersion(null);
      fetchRoadmapData();
      toast.success('Item added!');
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    }
  };

  const updateVersionStatus = async (versionId: string, status: string) => {
    try {
      await (supabase as any)
        .from('roadmap_versions')
        .update({ status })
        .eq('id', versionId);
      fetchRoadmapData();
    } catch (error) {
      console.error('Error updating version:', error);
    }
  };

  const updateItemStatus = async (itemId: string, status: string) => {
    try {
      await (supabase as any)
        .from('roadmap_items')
        .update({ status })
        .eq('id', itemId);
      fetchRoadmapData();
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const deleteVersion = async (versionId: string) => {
    if (!confirm('Delete this version and all its items?')) return;
    try {
      await (supabase as any).from('roadmap_versions').delete().eq('id', versionId);
      fetchRoadmapData();
      toast.success('Version deleted');
    } catch (error) {
      console.error('Error deleting version:', error);
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      await (supabase as any).from('roadmap_items').delete().eq('id', itemId);
      fetchRoadmapData();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  const title = settings?.title || 'Development Roadmap';
  const subtitle = settings?.subtitle || 'Track our progress and see what we\'re working on';

  return (
    <section className="py-16 px-4 sm:px-6 relative overflow-hidden" style={{ backgroundColor }}>
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ backgroundColor: `${primaryColor}1A` }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl" style={{ backgroundColor: `${secondaryColor}1A` }} />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{title}</h2>
          <p className="text-slate-400 text-lg">{subtitle}</p>
        </div>

        {/* Owner: Add Version */}
        {isOwner && (
          <div className="mb-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex gap-3">
              <Input
                placeholder="New version (e.g., v2.0.0 - Major Update)"
                value={newVersionName}
                onChange={(e) => setNewVersionName(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white"
                onKeyDown={(e) => e.key === 'Enter' && addVersion()}
              />
              <Button onClick={addVersion} style={{ backgroundColor: primaryColor, borderColor: primaryColor }} className="hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" /> Add Version
              </Button>
            </div>
          </div>
        )}

        {/* Versions List */}
        <div className="space-y-4">
          {versions.map((version) => {
            const isExpanded = expandedVersions[version.id];
            const statusInfo = statusConfig[version.status] || statusConfig.backlog;
            const StatusIcon = statusInfo.icon;
            const itemCount = version.items?.length || 0;

            return (
              <div 
                key={version.id} 
                className="rounded-2xl border overflow-hidden transition-all duration-300 hover:border-opacity-75"
                style={{ 
                  backgroundColor: cardBackgroundColor,
                  borderColor: `${primaryColor}50`
                }}
              >
                {/* Version Header */}
                <div 
                  className="p-5 flex items-center justify-between cursor-pointer group"
                  onClick={() => toggleVersion(version.id)}
                >
                  <div className="flex items-center gap-4">
                    <h3 className="text-xl font-bold text-white">{version.version_name}</h3>
                    <span className="px-3 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: statusInfo.bgColor || (status === 'in_progress' ? secondaryColor : status === 'qa' ? primaryColor : statusInfo.bgColor) }}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); handleSuggestFeature(version.id); }}
                      style={{ 
                        backgroundColor: `${primaryColor}33`,
                        borderColor: `${primaryColor}80`,
                        color: primaryColor
                      }}
                      className="hover:opacity-80"
                    >
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Suggest Feature
                    </Button>
                    <span className="text-slate-400 text-sm">{itemCount} tasks</span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                    )}
                  </div>
                </div>

                {/* Owner: Version Controls */}
                {isOwner && isExpanded && (
                  <div className="px-5 pb-3 flex gap-2 border-b border-slate-700/50">
                    <select
                      value={version.status}
                      onChange={(e) => updateVersionStatus(version.id, e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded px-3 py-1 text-sm text-white"
                    >
                      <option value="backlog">Backlog</option>
                      <option value="in_progress">In Progress</option>
                      <option value="qa">QA</option>
                      <option value="completed">Completed</option>
                    </select>
                    <Button size="sm" variant="ghost" onClick={() => deleteVersion(version.id)} className="text-red-400 hover:text-red-300">
                      Delete Version
                    </Button>
                  </div>
                )}

                {/* Items List */}
                {isExpanded && (
                  <div className="p-5 pt-3 space-y-3">
                    {version.items?.map((item) => {
                      const itemStatus = statusConfig[item.status] || statusConfig.backlog;
                      const ItemIcon = itemStatus.icon;

                      return (
                        <div 
                          key={item.id}
                          className="p-4 rounded-xl border transition-all group hover:border-opacity-75"
                          style={{
                            backgroundColor: `${cardBackgroundColor}80`,
                            borderColor: `${primaryColor}30`
                          }}
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${itemStatus.bgColor || (item.status === 'in_progress' ? secondaryColor : item.status === 'qa' ? primaryColor : '#64748b')}33` }}>
                              <ItemIcon className={`w-5 h-5 ${itemStatus.color}`} style={{ color: itemStatus.bgColor || (item.status === 'in_progress' ? secondaryColor : item.status === 'qa' ? primaryColor : '#64748b') }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-white mb-1">{item.title}</h4>
                              {item.description && (
                                <p className="text-slate-400 text-sm">{item.description}</p>
                              )}
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-medium text-white flex-shrink-0" style={{ backgroundColor: itemStatus.bgColor || (item.status === 'in_progress' ? secondaryColor : item.status === 'qa' ? primaryColor : '#64748b') }}>
                              {itemStatus.label}
                            </span>
                            {isOwner && (
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <select
                                  value={item.status}
                                  onChange={(e) => updateItemStatus(item.id, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="bg-slate-700 border-none rounded px-2 py-1 text-xs text-white"
                                >
                                  <option value="backlog">Backlog</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="qa">QA</option>
                                  <option value="completed">Completed</option>
                                </select>
                                <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-300">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Owner: Add Item */}
                    {isOwner && (
                      <div className="pt-2">
                        {addingItemToVersion === version.id ? (
                          <div className="flex gap-2">
                            <Input
                              placeholder="New task title..."
                              value={newItemTitle}
                              onChange={(e) => setNewItemTitle(e.target.value)}
                              className="bg-slate-800 border-slate-700 text-white"
                              onKeyDown={(e) => e.key === 'Enter' && addItem(version.id)}
                              autoFocus
                            />
                            <Button onClick={() => addItem(version.id)} size="sm" style={{ backgroundColor: primaryColor }} className="hover:opacity-90">
                              Add
                            </Button>
                            <Button onClick={() => setAddingItemToVersion(null)} size="sm" variant="ghost">
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAddingItemToVersion(version.id)}
                            className="w-full p-3 border-2 border-dashed rounded-xl text-slate-400 transition-colors flex items-center justify-center gap-2 hover:opacity-80"
                            style={{ 
                              borderColor: `${primaryColor}50`,
                              color: primaryColor
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = primaryColor;
                              e.currentTarget.style.color = primaryColor;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = `${primaryColor}50`;
                              e.currentTarget.style.color = primaryColor;
                            }}
                          >
                            <Plus className="w-4 h-4" /> Add Task
                          </button>
                        )}
                      </div>
                    )}

                    {version.items?.length === 0 && !isOwner && (
                      <p className="text-slate-500 text-center py-4">No tasks yet</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {versions.length === 0 && !isOwner && (
          <div className="text-center py-16 rounded-2xl border shadow-2xl" style={{ backgroundColor: `${cardBackgroundColor}80`, borderColor: `${primaryColor}50` }}>
            <div className="w-12 h-12 mx-auto mb-4" style={{ color: primaryColor }}>
              <Sparkles className="w-12 h-12" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Roadmap Coming Soon</h3>
            <p className="text-slate-400">Check back later for development updates!</p>
          </div>
        )}

        {/* Suggestions Section */}
        {suggestions.length > 0 && (
          <div className="mt-12">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Lightbulb className="w-6 h-6 text-yellow-400" />
              Community Suggestions
            </h3>
            <div className="grid gap-4">
              {suggestions.slice(0, 5).map((suggestion) => (
                <div 
                  key={suggestion.id}
                  className="p-4 bg-slate-900/80 rounded-xl border border-slate-700/50 flex items-center gap-4"
                >
                  <button
                    onClick={() => handleUpvote(suggestion.id, suggestion.user_upvoted || false)}
                    className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors"
                    style={{
                      backgroundColor: suggestion.user_upvoted ? `${primaryColor}33` : cardBackgroundColor,
                      color: suggestion.user_upvoted ? primaryColor : '#94a3b8'
                    }}
                    onMouseEnter={(e) => {
                      if (!suggestion.user_upvoted) {
                        e.currentTarget.style.backgroundColor = `${cardBackgroundColor}CC`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!suggestion.user_upvoted) {
                        e.currentTarget.style.backgroundColor = cardBackgroundColor;
                      }
                    }}
                  >
                    <ThumbsUp className={`w-5 h-5 ${suggestion.user_upvoted ? 'fill-current' : ''}`} />
                    <span className="text-sm font-medium">{suggestion.upvotes}</span>
                  </button>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white">{suggestion.title}</h4>
                    {suggestion.description && (
                      <p className="text-slate-400 text-sm mt-1">{suggestion.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* General Suggest Button */}
        <div className="mt-8 text-center">
          <Button
            onClick={() => handleSuggestFeature()}
            className="text-white px-8 py-3"
            style={{
              background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`
            }}
          >
            <Lightbulb className="w-5 h-5 mr-2" />
            Suggest a Feature
          </Button>
        </div>
      </div>

      {/* Suggestion Modal */}
      {showSuggestionModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                Suggest a Feature
              </h3>
              <button onClick={() => setShowSuggestionModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!user ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-slate-300 mb-4">Please sign in to suggest features</p>
                <Button asChild style={{ backgroundColor: primaryColor }} className="hover:opacity-90">
                  <a href="/auth">Sign In</a>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Feature Title *</label>
                  <Input
                    placeholder="What feature would you like to see?"
                    value={suggestionTitle}
                    onChange={(e) => setSuggestionTitle(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description (optional)</label>
                  <Textarea
                    placeholder="Describe your idea in more detail..."
                    value={suggestionDescription}
                    onChange={(e) => setSuggestionDescription(e.target.value)}
                    rows={4}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => setShowSuggestionModal(false)}
                    variant="outline"
                    className="flex-1 border-slate-700 text-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={submitSuggestion}
                    disabled={!suggestionTitle.trim() || submitting}
                    style={{ backgroundColor: primaryColor }}
                    className="flex-1 hover:opacity-90"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Submit
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default RoadmapSection;
