import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ChevronDown, ChevronUp, Plus, Lightbulb,
  Sparkles, ThumbsUp, Send, X, Loader2,
  Circle, CheckCircle2, PlayCircle, TestTube2,
  Edit2, MessageCircle, ArrowLeft, ArrowUp,
  Vote, Layers, Clock, Terminal, Grid3X3,
  Columns, TrendingUp, Focus, List,
} from 'lucide-react';
import { toast } from 'sonner';
import { RoadmapSettings, getTheme } from '@/lib/roadmapThemes';

interface RoadmapVersion {
  id: string;
  creator_id: string;
  version_name: string;
  description?: string;
  status: string;
  sort_order: number;
  is_expanded: boolean;
  status_changed_at?: string;
  created_at?: string;
  items?: RoadmapItem[];
}

interface RoadmapItem {
  id: string;
  version_id: string;
  title: string;
  description?: string;
  status: string;
  sort_order: number;
  status_changed_at?: string;
  created_at?: string;
  vote_count?: number;
  user_has_voted?: boolean;
  voting_enabled?: boolean;
}

interface SuggestionAuthor {
  id: string;
  display_name?: string;
  avatar_url?: string;
}

interface RoadmapSuggestion {
  id: string;
  creator_id: string;
  user_id: string;
  title: string;
  description?: string;
  upvotes: number;
  user_upvoted?: boolean;
  forum_status?: 'open' | 'planned' | 'in_progress' | 'completed' | 'declined';
  status_changed_at?: string;
  created_at?: string;
  reply_count?: number;
  author?: SuggestionAuthor;
}

interface SuggestionReply {
  id: string;
  suggestion_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  author?: SuggestionAuthor;
  is_creator?: boolean;
}

interface GlobalBackgroundSettings {
  enabled?: boolean;
  type?: 'solid' | 'gradient' | 'image';
  color?: string;
  gradientStart?: string;
  gradientEnd?: string;
  image?: string;
  overlay?: number;
}

interface RoadmapPageProps {
  creatorId: string;
  isOwner: boolean;
  settings: RoadmapSettings;
  storeName?: string;
  storeLogo?: string;
  productId?: string;
  onBack?: () => void;
  votingEnabled?: boolean;
  sortByVotes?: boolean;
  storeSlug?: string;
  globalBackground?: GlobalBackgroundSettings;
}

function hexToRgba(hex: string, opacity: number): string {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return `rgba(128,128,128,${opacity})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function withOpacity(color: string, opacity: number): string {
  if (!color) return `rgba(128,128,128,${opacity})`;
  if (color.startsWith('#')) return hexToRgba(color, opacity);
  if (color.includes('rgba')) {
    const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${opacity})`;
  }
  return color;
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  backlog: Circle,
  in_progress: PlayCircle,
  qa: TestTube2,
  completed: CheckCircle2,
};

export const RoadmapPage = ({
  creatorId, isOwner, settings, storeName, storeLogo, productId,
  onBack, votingEnabled = false, sortByVotes = false, globalBackground,
}: RoadmapPageProps) => {
  const { user } = useAuth();
  const theme = getTheme(settings);

  // Map new theme interface to local helpers
  const accent = theme.accent;
  const bg = theme.bg;
  const surface = theme.surface;
  const border = theme.border;
  const text = theme.text;
  const textMuted = theme.textMuted;

  const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    backlog:     { bg: withOpacity(theme.status.backlog, 0.2),     border: theme.status.backlog,     text: theme.status.backlog },
    in_progress: { bg: withOpacity(theme.status.in_progress, 0.2), border: theme.status.in_progress, text: theme.status.in_progress },
    qa:          { bg: withOpacity(theme.status.qa, 0.2),          border: theme.status.qa,          text: theme.status.qa },
    completed:   { bg: withOpacity(theme.status.completed, 0.2),   border: theme.status.completed,   text: theme.status.completed },
  };
  const sc = (status: string) => STATUS_COLORS[status] || STATUS_COLORS.backlog;

  const [versions, setVersions] = useState<RoadmapVersion[]>([]);
  const [suggestions, setSuggestions] = useState<RoadmapSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sidebarActiveId, setSidebarActiveId] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [suggestionTitle, setSuggestionTitle] = useState('');
  const [suggestionDesc, setSuggestionDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [newItem, setNewItem] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [itemVotingEnabled, setItemVotingEnabled] = useState(votingEnabled);
  const [itemSortByVotes, setItemSortByVotes] = useState(sortByVotes);
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [editingVersionDesc, setEditingVersionDesc] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const [editingTaskDesc, setEditingTaskDesc] = useState('');
  const [selectedSuggestion, setSelectedSuggestion] = useState<RoadmapSuggestion | null>(null);
  const [suggestionReplies, setSuggestionReplies] = useState<SuggestionReply[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [sortBy, setSortBy] = useState<'upvotes' | 'newest' | 'discussed'>('upvotes');
  const [spotlightIdx, setSpotlightIdx] = useState(0);
  const [accordionOpen, setAccordionOpen] = useState<Record<string, boolean>>({});

  const fmtRelative = (d?: string) => {
    if (!d) return '';
    const ms = Date.now() - new Date(d).getTime();
    const m = Math.floor(ms / 60000), h = Math.floor(ms / 3600000), day = Math.floor(ms / 86400000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (day < 7) return `${day}d ago`;
    return new Date(d).toLocaleDateString();
  };
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  useEffect(() => { fetchData(); }, [creatorId, productId]);

  const fetchData = async () => {
    try {
      if (productId) {
        const { data: p } = await (supabase as any).from('products').select('title, voting_enabled, sort_by_votes').eq('id', productId).single();
        if (p) { setProductName(p.title); setItemVotingEnabled(p.voting_enabled || false); setItemSortByVotes(p.sort_by_votes || false); }
      }
      let vq = (supabase as any).from('roadmap_versions').select('*').eq('creator_id', creatorId);
      if (productId) vq = vq.eq('product_id', productId);
      const { data: v } = await vq.order('sort_order');
      let iq = (supabase as any).from('roadmap_items').select('*').eq('creator_id', creatorId);
      if (productId) iq = iq.eq('product_id', productId);
      const { data: rawItems } = await iq.order('sort_order');
      let items = rawItems || [];
      if (items.length > 0) {
        const ids = items.map((i: any) => i.id);
        const { data: votes } = await (supabase as any).from('roadmap_item_votes').select('item_id').in('item_id', ids);
        const vcMap = new Map<string, number>();
        (votes || []).forEach((v: any) => vcMap.set(v.item_id, (vcMap.get(v.item_id) || 0) + 1));
        let userVoted = new Set<string>();
        if (user) {
          const { data: uv } = await (supabase as any).from('roadmap_item_votes').select('item_id').eq('user_id', user.id).in('item_id', ids);
          userVoted = new Set((uv || []).map((v: any) => v.item_id));
        }
        items = items.map((i: any) => ({ ...i, vote_count: vcMap.get(i.id) || 0, user_has_voted: userVoted.has(i.id) }));
      }
      const combined = (v || []).map((ver: any) => {
        let vi = items.filter((i: any) => i.version_id === ver.id);
        if (itemSortByVotes) vi.sort((a: any, b: any) => (b.vote_count || 0) - (a.vote_count || 0));
        return { ...ver, items: vi };
      });
      setVersions(combined);
      const exp: Record<string, boolean> = {};
      combined.forEach((ver: any) => { exp[ver.id] = settings.defaultExpanded ?? true; });
      setExpanded(exp);
      if (settings.showSuggestions) {
        const { data: sug } = await (supabase as any).from('roadmap_suggestions').select('*').eq('creator_id', creatorId).order('upvotes', { ascending: false });
        if (sug) {
          const sids = sug.map((s: any) => s.id);
          const { data: rc } = await (supabase as any).from('roadmap_suggestion_replies').select('suggestion_id').in('suggestion_id', sids);
          const cmap = new Map<string, number>();
          (rc || []).forEach((r: any) => cmap.set(r.suggestion_id, (cmap.get(r.suggestion_id) || 0) + 1));
          const uids = [...new Set(sug.map((s: any) => s.user_id))];
          const { data: profiles } = await (supabase as any).from('profiles').select('user_id, display_name, avatar_url').in('user_id', uids);
          const pmap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
          let enriched = sug.map((s: any) => ({ ...s, reply_count: cmap.get(s.id) || 0, author: pmap.get(s.user_id) || { display_name: 'Anonymous' } }));
          if (user) {
            const { data: ups } = await (supabase as any).from('roadmap_suggestion_upvotes').select('suggestion_id').eq('user_id', user.id);
            const upIds = new Set((ups || []).map((u: any) => u.suggestion_id));
            setSuggestions(enriched.map((s: any) => ({ ...s, user_upvoted: upIds.has(s.id) })));
          } else setSuggestions(enriched);
        } else setSuggestions([]);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const addVersion = async () => {
    if (!newVersion.trim()) return;
    const ins: any = { creator_id: creatorId, version_name: newVersion.trim(), sort_order: 0 };
    if (productId) ins.product_id = productId;
    await (supabase as any).from('roadmap_versions').insert(ins);
    for (const ver of versions) await (supabase as any).from('roadmap_versions').update({ sort_order: ver.sort_order + 1 }).eq('id', ver.id);
    setNewVersion(''); fetchData(); toast.success('Version added!');
  };

  const addItem = async (verId: string) => {
    if (!newItem.trim()) return;
    const ver = versions.find(v => v.id === verId);
    const ins: any = { version_id: verId, creator_id: creatorId, title: newItem.trim(), description: newItemDesc.trim() || null, sort_order: ver?.items?.length || 0 };
    if (productId) ins.product_id = productId;
    await (supabase as any).from('roadmap_items').insert(ins);
    setNewItem(''); setNewItemDesc(''); setAddingTo(null); fetchData(); toast.success('Task added!');
  };

  const updateStatus = async (table: string, id: string, status: string) => {
    await (supabase as any).from(table).update({ status }).eq('id', id); fetchData();
  };

  const deleteVersion = async (id: string) => {
    if (!confirm('Delete this version?')) return;
    await (supabase as any).from('roadmap_versions').delete().eq('id', id); fetchData(); toast.success('Deleted');
  };

  const deleteItem = async (id: string) => {
    await (supabase as any).from('roadmap_items').delete().eq('id', id); fetchData();
  };

  const updateVersionDescription = async (versionId: string, description: string) => {
    await (supabase as any).from('roadmap_versions').update({ description: description.trim() || null }).eq('id', versionId);
    setEditingVersionId(null); fetchData(); toast.success('Updated!');
  };

  const updateTask = async (taskId: string, title: string, description: string) => {
    await (supabase as any).from('roadmap_items').update({ title: title.trim(), description: description.trim() || null }).eq('id', taskId);
    setEditingTaskId(null); fetchData(); toast.success('Updated!');
  };

  const fetchReplies = async (suggestionId: string) => {
    setLoadingReplies(true);
    try {
      const { data: replies } = await (supabase as any).from('roadmap_suggestion_replies').select('*').eq('suggestion_id', suggestionId).order('created_at', { ascending: true });
      if (replies) {
        const uids = [...new Set(replies.map((r: any) => r.user_id))];
        const { data: profiles } = await (supabase as any).from('profiles').select('user_id, display_name, avatar_url').in('user_id', uids);
        const pmap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        setSuggestionReplies(replies.map((r: any) => ({ ...r, author: pmap.get(r.user_id) || { display_name: 'Anonymous' }, is_creator: r.user_id === selectedSuggestion?.creator_id })));
      }
    } catch (e) { console.error(e); }
    setLoadingReplies(false);
  };

  const submitReply = async () => {
    if (!user || !selectedSuggestion || !replyContent.trim()) return;
    setSubmitting(true);
    try {
      await (supabase as any).from('roadmap_suggestion_replies').insert({ suggestion_id: selectedSuggestion.id, user_id: user.id, content: replyContent.trim() });
      setReplyContent(''); fetchReplies(selectedSuggestion.id); fetchData(); toast.success('Reply posted!');
    } catch { toast.error('Failed to post reply'); }
    setSubmitting(false);
  };

  const updateSuggestionStatus = async (id: string, status: string) => {
    await (supabase as any).from('roadmap_suggestions').update({ forum_status: status, status_changed_at: new Date().toISOString() }).eq('id', id);
    fetchData();
    if (selectedSuggestion?.id === id) setSelectedSuggestion(prev => prev ? { ...prev, forum_status: status as any } : null);
    toast.success('Status updated!');
  };

  const deleteSuggestion = async (id: string) => {
    try {
      await (supabase as any).from('roadmap_suggestion_replies').delete().eq('suggestion_id', id);
      await (supabase as any).from('roadmap_suggestion_upvotes').delete().eq('suggestion_id', id);
      await (supabase as any).from('roadmap_suggestions').delete().eq('id', id);
      if (selectedSuggestion?.id === id) { setSelectedSuggestion(null); setSuggestionReplies([]); }
      fetchData(); toast.success('Deleted!');
    } catch { toast.error('Failed to delete'); }
  };

  const submitSuggestion = async () => {
    if (!user || !suggestionTitle.trim()) return;
    setSubmitting(true);
    await (supabase as any).from('roadmap_suggestions').insert({ creator_id: creatorId, user_id: user.id, title: suggestionTitle.trim(), description: suggestionDesc.trim() || null });
    setShowModal(false); setSuggestionTitle(''); setSuggestionDesc(''); setSubmitting(false); fetchData(); toast.success('Suggestion submitted!');
  };

  const toggleUpvote = async (id: string, upvoted: boolean) => {
    if (!user) { toast.error('Sign in to upvote'); return; }
    if (upvoted) await (supabase as any).from('roadmap_suggestion_upvotes').delete().eq('suggestion_id', id).eq('user_id', user.id);
    else await (supabase as any).from('roadmap_suggestion_upvotes').insert({ suggestion_id: id, user_id: user.id });
    fetchData();
  };

  const toggleItemVote = async (itemId: string, hasVoted: boolean) => {
    if (!user) { toast.error('Sign in to vote'); return; }
    if (!itemVotingEnabled) { toast.error('Voting not enabled'); return; }
    try {
      if (hasVoted) await (supabase as any).from('roadmap_item_votes').delete().eq('item_id', itemId).eq('user_id', user.id);
      else await (supabase as any).from('roadmap_item_votes').insert({ item_id: itemId, user_id: user.id });
      fetchData();
    } catch { toast.error('Failed to update vote'); }
  };

  const toggleItemVotingEnabled = async (itemId: string, current: boolean) => {
    if (!isOwner) return;
    try {
      await (supabase as any).from('roadmap_items').update({ voting_enabled: !current }).eq('id', itemId);
      fetchData(); toast.success(!current ? 'Voting enabled!' : 'Voting disabled!');
    } catch { toast.error('Failed'); }
  };

  // Background style
  let bgStyle: React.CSSProperties = {};
  const hasOwnBg = settings.backgroundType && settings.backgroundType !== 'default';
  if (hasOwnBg) {
    if (settings.backgroundType === 'image' && settings.backgroundImage) {
      const op = (settings.backgroundOverlayOpacity || 70) / 100;
      bgStyle = { backgroundImage: `linear-gradient(rgba(0,0,0,${op}),rgba(0,0,0,${op})),url(${settings.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' };
    } else if (settings.backgroundType === 'gradient') {
      const s = settings.useCustomColors ? settings.customBackgroundGradientStart : (theme.bgGradient ? theme.bg : theme.bg);
      const e = settings.useCustomColors ? settings.customBackgroundGradientEnd : (theme.bgGradient ? theme.bg : theme.bg);
      bgStyle = { background: theme.bgGradient || `linear-gradient(135deg, ${s} 0%, ${e} 100%)` };
    } else {
      bgStyle = { backgroundColor: settings.customBackgroundColor || bg };
    }
  } else if (globalBackground?.enabled) {
    if (globalBackground.type === 'image' && globalBackground.image) {
      const op = globalBackground.overlay || 0.5;
      bgStyle = { backgroundImage: `linear-gradient(rgba(0,0,0,${op}),rgba(0,0,0,${op})),url(${globalBackground.image})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' };
    } else if (globalBackground.type === 'gradient') {
      bgStyle = { background: `linear-gradient(135deg, ${globalBackground.gradientStart || '#0f172a'} 0%, ${globalBackground.gradientEnd || '#1e1b4b'} 100%)` };
    } else {
      bgStyle = { backgroundColor: globalBackground.color || '#0f172a' };
    }
  } else {
    bgStyle = theme.bgGradient ? { background: theme.bgGradient } : { backgroundColor: bg };
  }

  const layout = settings.layoutVariant || theme.layout || 'ghost';
  const spacingMap: Record<string, string> = { compact: 'space-y-3', normal: 'space-y-5', relaxed: 'space-y-8' };
  const sectionSpacing = spacingMap[settings.sectionSpacing || 'normal'] || 'space-y-5';
  const cardBg = withOpacity(surface, (settings.cardOpacity ?? 90) / 100);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={bgStyle}>
      <Loader2 className="w-12 h-12 animate-spin" style={{ color: accent }} />
    </div>
  );

  // ── Shared sub-components ─────────────────────────────────────────────────

  const TaskEditForm = ({ item, statusColors }: { item: RoadmapItem; statusColors: { border: string } }) => (
    <div className="space-y-3">
      <Input value={editingTaskTitle} onChange={e => setEditingTaskTitle(e.target.value)}
        placeholder="Task title..." className="w-full rounded-lg"
        style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderColor: statusColors.border, color: text }} autoFocus />
      <Textarea value={editingTaskDesc} onChange={e => setEditingTaskDesc(e.target.value)}
        placeholder="Description (optional)..." rows={2} className="w-full rounded-lg"
        style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderColor: statusColors.border, color: text }} />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => updateTask(item.id, editingTaskTitle, editingTaskDesc)}
          disabled={!editingTaskTitle.trim()} style={{ backgroundColor: accent, color: '#fff' }}>Save</Button>
        <Button size="sm" variant="ghost" onClick={() => setEditingTaskId(null)} style={{ color: textMuted }}>Cancel</Button>
      </div>
    </div>
  );

  const TaskOwnerControls = ({ item }: { item: RoadmapItem }) => (
    <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity items-center pl-5">
      {itemVotingEnabled && (
        <button onClick={() => toggleItemVotingEnabled(item.id, item.voting_enabled !== false)}
          className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${item.voting_enabled !== false ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'}`}>
          <Vote className="w-3 h-3" />
        </button>
      )}
      <select value={item.status} onChange={e => updateStatus('roadmap_items', item.id, e.target.value)}
        className="rounded px-2 py-0.5 text-xs border"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: text, borderColor: border }}
        onClick={e => e.stopPropagation()}>
        <option value="backlog">Backlog</option>
        <option value="in_progress">In Progress</option>
        <option value="qa">QA</option>
        <option value="completed">Completed</option>
      </select>
      <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-300 p-0.5"><X className="w-3.5 h-3.5" /></button>
    </div>
  );

  const AddTaskForm = ({ ver, statusColors }: { ver: RoadmapVersion; statusColors: { border: string } }) => (
    isOwner ? (
      addingTo === ver.id ? (
        <div className="space-y-2 mt-3 p-3 rounded-xl border" style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderColor: statusColors.border }}>
          <Input placeholder="Task title..." value={newItem} onChange={e => setNewItem(e.target.value)}
            className="w-full" style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderColor: statusColors.border, color: text }} autoFocus />
          <Textarea placeholder="Description (optional)..." value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} rows={2}
            className="w-full" style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderColor: statusColors.border, color: text }} />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => addItem(ver.id)} disabled={!newItem.trim()} style={{ backgroundColor: accent, color: '#fff' }}>Add Task</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAddingTo(null); setNewItem(''); setNewItemDesc(''); }} style={{ color: textMuted }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAddingTo(ver.id)}
          className="w-full p-2.5 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-80 mt-3"
          style={{ borderColor: statusColors.border + '50', color: textMuted }}>
          <Plus className="w-3.5 h-3.5" />Add Task
        </button>
      )
    ) : null
  );

  const VersionDescEditor = ({ ver, statusColors }: { ver: RoadmapVersion; statusColors: { border: string } }) => (
    editingVersionId === ver.id ? (
      <div className="mt-3">
        <Textarea value={editingVersionDesc} onChange={e => setEditingVersionDesc(e.target.value)}
          placeholder="Add a description..." rows={2} className="w-full rounded-xl mb-2"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderColor: statusColors.border, color: text }} autoFocus />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => updateVersionDescription(ver.id, editingVersionDesc)} style={{ backgroundColor: accent, color: '#fff' }}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditingVersionId(null)} style={{ color: textMuted }}>Cancel</Button>
        </div>
      </div>
    ) : (
      <>
        {ver.description && <p className="mt-2 text-sm opacity-70" style={{ color: textMuted }}>{ver.description}</p>}
        {isOwner && (
          <button onClick={() => { setEditingVersionId(ver.id); setEditingVersionDesc(ver.description || ''); }}
            className="mt-1 text-xs flex items-center gap-1 opacity-40 hover:opacity-80 transition-opacity" style={{ color: textMuted }}>
            <Edit2 className="w-3 h-3" />{ver.description ? 'Edit description' : 'Add description'}
          </button>
        )}
      </>
    )
  );

  const VersionOwnerControls = ({ ver }: { ver: RoadmapVersion }) => {
    const colors = sc(ver.status);
    return isOwner && expanded[ver.id] ? (
      <div className="flex gap-2 px-6 pb-3 border-t pt-3" style={{ borderColor: colors.border + '25' }}>
        <select value={ver.status} onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)}
          className="rounded-lg px-3 py-1.5 text-sm border"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: text, borderColor: colors.border }}>
          <option value="backlog">Backlog</option>
          <option value="in_progress">In Progress</option>
          <option value="qa">QA</option>
          <option value="completed">Completed</option>
        </select>
        <Button size="sm" variant="ghost" onClick={() => deleteVersion(ver.id)} className="text-red-400 hover:text-red-300">Delete</Button>
      </div>
    ) : null;
  };

  // ── LAYOUT: GHOST — pure text list, no cards ──────────────────────────────
  const renderGhost = () => (
    <div className={sectionSpacing} style={{ fontFamily: theme.font }}>
      {versions.map(ver => {
        const colors = sc(ver.status);
        const isExp = expanded[ver.id];
        return (
          <div key={ver.id} className="border-b" style={{ borderColor: border + '30' }}>
            <button className="w-full text-left py-5 flex items-center justify-between group"
              onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full flex-shrink-0 transition-all" style={{ backgroundColor: colors.border, boxShadow: isExp ? `0 0 8px ${colors.border}` : 'none' }} />
                <span className={`${settings.versionTitleSize || 'text-xl'} font-semibold tracking-tight`} style={{ color: text }}>{ver.version_name}</span>
                <span className="text-xs font-mono uppercase tracking-widest" style={{ color: colors.border }}>{ver.status.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono opacity-30" style={{ color: textMuted }}>{ver.items?.length || 0}</span>
                {isExp ? <ChevronUp className="w-4 h-4 opacity-40" style={{ color: textMuted }} /> : <ChevronDown className="w-4 h-4 opacity-40" style={{ color: textMuted }} />}
              </div>
            </button>
            {ver.description && <p className="pb-3 pl-6 text-sm opacity-50" style={{ color: textMuted }}>{ver.description}</p>}
            {isOwner && isExp && (
              <div className="flex gap-2 pb-3 pl-6">
                <select value={ver.status} onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)}
                  className="rounded px-2 py-1 text-xs border" style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: text, borderColor: border }}>
                  <option value="backlog">Backlog</option><option value="in_progress">In Progress</option>
                  <option value="qa">QA</option><option value="completed">Completed</option>
                </select>
                <Button size="sm" variant="ghost" onClick={() => deleteVersion(ver.id)} className="text-red-400 text-xs">Delete</Button>
              </div>
            )}
            {isExp && (
              <div className="pl-6 pb-6 space-y-0">
                {ver.items?.map(item => {
                  const ic = sc(item.status);
                  const isEdit = editingTaskId === item.id;
                  return (
                    <div key={item.id} className="group py-2.5 flex items-start gap-4 border-b last:border-0" style={{ borderColor: border + '15' }}>
                      {isEdit ? <div className="flex-1"><TaskEditForm item={item} statusColors={ic} /></div> : (
                        <>
                          {itemVotingEnabled && item.voting_enabled !== false && (
                            <button onClick={() => toggleItemVote(item.id, item.user_has_voted || false)}
                              className="flex flex-col items-center px-1.5 py-1 rounded transition-all flex-shrink-0"
                              style={{ color: item.user_has_voted ? accent : textMuted }}>
                              <ArrowUp className="w-3 h-3" /><span className="text-[10px] font-bold">{item.vote_count || 0}</span>
                            </button>
                          )}
                          <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: ic.border }} />
                          <div className="flex-1 min-w-0">
                            <span className={`${settings.taskTitleSize || 'text-sm'}`} style={{ color: item.status === 'completed' ? textMuted : text, textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>{item.title}</span>
                            {item.description && <p className="text-xs opacity-40 mt-0.5" style={{ color: textMuted }}>{item.description}</p>}
                          </div>
                          <span className="text-xs font-mono opacity-40 flex-shrink-0" style={{ color: ic.border }}>{item.status.replace('_', ' ')}</span>
                          {isOwner && (
                            <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }}
                              className="opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: textMuted }}>
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                          <TaskOwnerControls item={item} />
                        </>
                      )}
                    </div>
                  );
                })}
                <AddTaskForm ver={ver} statusColors={colors} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── LAYOUT: KANBAN — true columns board ───────────────────────────────────
  const renderKanban = () => {
    const columns = [
      { key: 'backlog', label: 'Backlog' },
      { key: 'in_progress', label: 'In Progress' },
      { key: 'qa', label: 'QA' },
      { key: 'completed', label: 'Done' },
    ] as const;
    const allItems = versions.flatMap(ver =>
      (ver.items || []).map(item => ({ ...item, _verName: ver.version_name }))
    );
    return (
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {columns.map(col => {
            const colColors = sc(col.key);
            const items = allItems.filter(i => i.status === col.key);
            return (
              <div key={col.key} className="w-72 flex-shrink-0 rounded-2xl flex flex-col"
                style={{ backgroundColor: withOpacity(surface, 0.5), border: `1px solid ${colColors.border}25` }}>
                <div className="px-4 py-3 flex items-center justify-between rounded-t-2xl"
                  style={{ borderBottom: `2px solid ${colColors.border}60`, background: `linear-gradient(135deg, ${colColors.border}15 0%, transparent 100%)` }}>
                  <span className="text-sm font-bold tracking-wide uppercase" style={{ color: colColors.border }}>{col.label}</span>
                  <span className="text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold"
                    style={{ backgroundColor: colColors.bg, color: colColors.text }}>{items.length}</span>
                </div>
                <div className="p-3 space-y-2 flex-1">
                  {items.map(item => {
                    const ic = sc(item.status);
                    const isEdit = editingTaskId === item.id;
                    return (
                      <div key={item.id} className={`rounded-xl ${settings.taskCardPadding || 'p-3'} group transition-all`}
                        style={{ backgroundColor: cardBg, border: `1px solid ${ic.border}20`, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                        {isEdit ? <TaskEditForm item={item} statusColors={ic} /> : (
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <p className={`${settings.taskTitleSize || 'text-sm'} font-medium leading-snug`} style={{ color: text }}>{item.title}</p>
                              {isOwner && (
                                <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }}
                                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity flex-shrink-0" style={{ color: textMuted }}>
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            {item.description && <p className="text-xs opacity-50 mt-1" style={{ color: textMuted }}>{item.description}</p>}
                            <div className="mt-2">
                              <span className="text-xs opacity-40" style={{ color: textMuted }}>{(item as any)._verName}</span>
                            </div>
                          </div>
                        )}
                        {!isEdit && <TaskOwnerControls item={item} />}
                      </div>
                    );
                  })}
                  {items.length === 0 && (
                    <div className="text-center py-8 opacity-20" style={{ color: textMuted }}>
                      <div className="text-2xl mb-1">·</div><div className="text-xs">empty</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {isOwner && (
          <div className="mt-6 space-y-2">
            {versions.map(ver => (
              <div key={ver.id} className="flex items-center gap-3">
                <span className="text-xs opacity-40 w-24 text-right" style={{ color: textMuted }}>{ver.version_name}</span>
                <div className="flex-1"><AddTaskForm ver={ver} statusColors={sc(ver.status)} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── LAYOUT: TIMELINE — alternating left/right with glowing spine ──────────
  const renderTimeline = () => (
    <div className="px-1 relative">
      <div className="absolute left-[30px] top-0 bottom-0 w-px" style={{ background: `linear-gradient(to bottom, transparent, ${accent}60, transparent)` }} />
      <div className={sectionSpacing}>
        {versions.map(ver => {
          const colors = sc(ver.status);
          const isExp = expanded[ver.id];
          return (
            <div key={ver.id} className="relative pl-16">
              <div className="absolute left-[22px] top-5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center z-10 transition-all"
                style={{ backgroundColor: isExp ? colors.border : bg, borderColor: colors.border, boxShadow: isExp ? `0 0 12px ${colors.border}80` : 'none' }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isExp ? '#fff' : colors.border }} />
              </div>
              <div className="absolute left-[40px] top-[30px] h-px w-6" style={{ backgroundColor: colors.border + '40' }} />
              <div className="rounded-2xl backdrop-blur-xl transition-all duration-300"
                style={{ backgroundColor: cardBg, border: `1px solid ${colors.border}25`, boxShadow: isExp ? `0 4px 24px rgba(0,0,0,0.4)` : '0 2px 12px rgba(0,0,0,0.2)' }}>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <button className="flex-1 text-left" onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className={`${settings.versionTitleSize || 'text-xl'} font-semibold`} style={{ color: text }}>{ver.version_name}</h2>
                        <span className="text-xs px-2 py-0.5 rounded-full border"
                          style={{ color: colors.text, borderColor: colors.border + '60', backgroundColor: colors.bg }}>
                          {ver.status.replace('_', ' ')}
                        </span>
                        {ver.status === 'completed' && ver.status_changed_at && (
                          <span className="text-xs opacity-50" style={{ color: textMuted }}>· {fmtDate(ver.status_changed_at)}</span>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-xs opacity-40" style={{ color: textMuted }}>{ver.items?.length || 0}</span>
                      <button onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
                        {isExp ? <ChevronUp className="w-4 h-4" style={{ color: textMuted }} /> : <ChevronDown className="w-4 h-4" style={{ color: textMuted }} />}
                      </button>
                    </div>
                  </div>
                  <VersionDescEditor ver={ver} statusColors={colors} />
                </div>
                <VersionOwnerControls ver={ver} />
                {isExp && (
                  <div className="px-5 pb-5 space-y-2 border-t" style={{ borderColor: colors.border + '15' }}>
                    <div className="pt-4 space-y-2">
                      {ver.items?.map(item => {
                        const ic = sc(item.status);
                        const isEdit = editingTaskId === item.id;
                        const StatusIcon = STATUS_ICONS[item.status] || Circle;
                        return (
                          <div key={item.id} className={`rounded-xl ${settings.taskCardPadding || 'p-3'} transition-all group`}
                            style={{ backgroundColor: withOpacity(surface, 0.4), borderLeft: `2px solid ${ic.border}60` }}>
                            {isEdit ? <TaskEditForm item={item} statusColors={ic} /> : (
                              <div className="flex items-center gap-3">
                                <StatusIcon className="w-4 h-4 flex-shrink-0" style={{ color: ic.border }} />
                                <div className="flex-1 min-w-0">
                                  <h3 className={`${settings.taskTitleSize || 'text-sm'} font-medium`} style={{ color: text }}>{item.title}</h3>
                                  {item.description && <p className="text-xs mt-0.5 opacity-60" style={{ color: textMuted }}>{item.description}</p>}
                                </div>
                                {isOwner && (
                                  <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }}
                                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-1" style={{ color: textMuted }}>
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                            {!isEdit && <TaskOwnerControls item={item} />}
                          </div>
                        );
                      })}
                    </div>
                    <AddTaskForm ver={ver} statusColors={colors} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── LAYOUT: TERMINAL — fake CLI, no cards ─────────────────────────────────
  const renderTerminal = () => (
    <div style={{ fontFamily: theme.font }}>
      <div className="mb-4 px-1" style={{ color: accent }}>
        <span className="opacity-60">$ </span>
        <span>roadmap --list-versions{productName ? ` --product="${productName}"` : ''}</span>
      </div>
      <div className={sectionSpacing}>
        {versions.map(ver => {
          const colors = sc(ver.status);
          const isExp = expanded[ver.id];
          const statusChar = ver.status === 'completed' ? '✓' : ver.status === 'in_progress' ? '~' : ver.status === 'qa' ? '?' : '·';
          return (
            <div key={ver.id} style={{ borderLeft: `3px solid ${colors.border}`, paddingLeft: '1rem' }}>
              <button className="w-full text-left py-2" onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
                <div className="flex items-center gap-3">
                  <span style={{ color: colors.border }}>[{statusChar}]</span>
                  <span className={`${settings.versionTitleSize || 'text-base'} font-bold`} style={{ color: text }}>{ver.version_name}</span>
                  <span className="text-xs opacity-40" style={{ color: textMuted }}>// {ver.status.replace('_', ' ')}</span>
                  {ver.status === 'completed' && ver.status_changed_at && (
                    <span className="text-xs opacity-30" style={{ color: textMuted }}>{fmtDate(ver.status_changed_at)}</span>
                  )}
                  <span className="ml-auto text-xs opacity-30" style={{ color: textMuted }}>{isExp ? '[-]' : '[+]'}</span>
                </div>
              </button>
              {ver.description && <p className="text-xs opacity-40 pb-1 pl-8" style={{ color: textMuted }}># {ver.description}</p>}
              {isOwner && isExp && (
                <div className="flex gap-2 pb-2 pl-8">
                  <select value={ver.status} onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)}
                    className="rounded px-2 py-0.5 text-xs border" style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: text, borderColor: border }}>
                    <option value="backlog">Backlog</option><option value="in_progress">In Progress</option>
                    <option value="qa">QA</option><option value="completed">Completed</option>
                  </select>
                  <Button size="sm" variant="ghost" onClick={() => deleteVersion(ver.id)} className="text-red-400 text-xs">Delete</Button>
                </div>
              )}
              {isExp && (
                <div className="pb-3 space-y-1 pl-8">
                  {ver.items?.map(item => {
                    const ic = sc(item.status);
                    const isEdit = editingTaskId === item.id;
                    const box = item.status === 'completed' ? '[x]' : item.status === 'in_progress' ? '[-]' : item.status === 'qa' ? '[?]' : '[ ]';
                    return (
                      <div key={item.id} className="group py-1">
                        {isEdit ? <TaskEditForm item={item} statusColors={ic} /> : (
                          <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 mt-0.5" style={{ color: ic.border }}>{box}</span>
                            <div className="flex-1 min-w-0">
                              <span className={`${settings.taskTitleSize || 'text-sm'}`} style={{ color: item.status === 'completed' ? textMuted : text, textDecoration: item.status === 'completed' ? 'line-through' : 'none', opacity: item.status === 'completed' ? 0.6 : 1 }}>{item.title}</span>
                              {item.description && <div className="text-xs opacity-40 mt-0.5" style={{ color: textMuted }}>  # {item.description}</div>}
                            </div>
                            {isOwner && (
                              <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }}
                                className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity" style={{ color: textMuted }}>
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                        {!isEdit && <TaskOwnerControls item={item} />}
                      </div>
                    );
                  })}
                  <AddTaskForm ver={ver} statusColors={colors} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── LAYOUT: SPOTLIGHT — one version at a time, full hero ─────────────────
  const renderSpotlight = () => {
    const ver = versions[spotlightIdx];
    if (!ver) return null;
    const colors = sc(ver.status);
    const total = ver.items?.length || 0;
    const done = ver.items?.filter(i => i.status === 'completed').length || 0;
    return (
      <div>
        <div className="flex items-center justify-center gap-2 mb-8">
          {versions.map((v, i) => {
            const c = sc(v.status);
            return (
              <button key={v.id} onClick={() => setSpotlightIdx(i)} className="transition-all"
                style={{ width: i === spotlightIdx ? '24px' : '8px', height: '8px', borderRadius: '4px', backgroundColor: i === spotlightIdx ? c.border : c.border + '40' }} />
            );
          })}
        </div>
        <div className="rounded-3xl overflow-hidden transition-all duration-500"
          style={{ backgroundColor: cardBg, border: `1px solid ${colors.border}25`, boxShadow: `0 0 80px ${colors.border}20, 0 24px 60px rgba(0,0,0,0.5)` }}>
          <div className="p-10" style={{ background: `radial-gradient(ellipse at top, ${colors.border}15 0%, transparent 60%)` }}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <span className="text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full mb-4 inline-block"
                  style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}50` }}>
                  {ver.status.replace('_', ' ')}
                </span>
                <h2 className={`${settings.versionTitleSize || 'text-4xl'} font-black tracking-tight mt-2`} style={{ color: text }}>{ver.version_name}</h2>
                {ver.description && <p className="text-base opacity-60 mt-3 max-w-xl" style={{ color: textMuted }}>{ver.description}</p>}
              </div>
              <div className="text-right flex-shrink-0 ml-8">
                <div className="text-5xl font-black" style={{ color: colors.border }}>{done}/{total}</div>
                <div className="text-xs opacity-40 mt-1" style={{ color: textMuted }}>tasks complete</div>
              </div>
            </div>
            {total > 0 && (
              <div className="h-1.5 rounded-full overflow-hidden mb-8" style={{ backgroundColor: withOpacity(surface, 0.5) }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.round((done / total) * 100)}%`, backgroundColor: colors.border }} />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ver.items?.map(item => {
                const ic = sc(item.status);
                const isEdit = editingTaskId === item.id;
                const StatusIcon = STATUS_ICONS[item.status] || Circle;
                return (
                  <div key={item.id} className="rounded-2xl p-4 group transition-all"
                    style={{ backgroundColor: withOpacity(surface, 0.5), border: `1px solid ${ic.border}20` }}>
                    {isEdit ? <TaskEditForm item={item} statusColors={ic} /> : (
                      <div className="flex items-start gap-3">
                        <StatusIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: ic.border }} />
                        <div className="flex-1 min-w-0">
                          <p className={`${settings.taskTitleSize || 'text-sm'} font-semibold`} style={{ color: text }}>{item.title}</p>
                          {item.description && <p className="text-xs opacity-50 mt-1" style={{ color: textMuted }}>{item.description}</p>}
                        </div>
                        {isOwner && (
                          <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }}
                            className="opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: textMuted }}>
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                    {!isEdit && <TaskOwnerControls item={item} />}
                  </div>
                );
              })}
            </div>
            <AddTaskForm ver={ver} statusColors={colors} />
          </div>
          {isOwner && (
            <div className="flex gap-2 px-10 pb-6 border-t" style={{ borderColor: colors.border + '15', paddingTop: '16px' }}>
              <select value={ver.status} onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)}
                className="rounded-xl px-3 py-1.5 text-sm border"
                style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: text, borderColor: colors.border }}>
                <option value="backlog">Backlog</option><option value="in_progress">In Progress</option>
                <option value="qa">QA</option><option value="completed">Completed</option>
              </select>
              <Button size="sm" variant="ghost" onClick={() => deleteVersion(ver.id)} className="text-red-400 hover:text-red-300">Delete</Button>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between mt-6">
          <button onClick={() => setSpotlightIdx(i => Math.max(0, i - 1))} disabled={spotlightIdx === 0}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl transition-all disabled:opacity-20"
            style={{ backgroundColor: withOpacity(surface, 0.4), color: textMuted }}>
            <ArrowLeft className="w-4 h-4" /> Previous
          </button>
          <span className="text-xs opacity-40" style={{ color: textMuted }}>{spotlightIdx + 1} / {versions.length}</span>
          <button onClick={() => setSpotlightIdx(i => Math.min(versions.length - 1, i + 1))} disabled={spotlightIdx === versions.length - 1}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl transition-all disabled:opacity-20"
            style={{ backgroundColor: withOpacity(surface, 0.4), color: textMuted }}>
            Next <ArrowUp className="w-4 h-4 rotate-90" />
          </button>
        </div>
      </div>
    );
  };

  // ── LAYOUT: BENTO — CSS grid mosaic, varying tile sizes ──────────────────
  const renderBento = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-auto">
      {versions.map((ver, idx) => {
        const colors = sc(ver.status);
        const isExp = expanded[ver.id];
        const isLarge = idx % 3 === 0;
        return (
          <div key={ver.id} className={`rounded-2xl overflow-hidden flex flex-col transition-all ${isLarge ? 'col-span-2' : 'col-span-1'}`}
            style={{ backgroundColor: cardBg, border: `1px solid ${colors.border}25`, minHeight: isLarge ? '280px' : '200px', boxShadow: `0 4px 24px rgba(0,0,0,0.3)` }}>
            <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${colors.border}, ${colors.border}40)` }} />
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                    style={{ backgroundColor: colors.bg, color: colors.text }}>{ver.status.replace('_', ' ')}</span>
                  <h2 className={`${isLarge ? (settings.versionTitleSize || 'text-xl') : 'text-base'} font-bold mt-2`} style={{ color: text }}>{ver.version_name}</h2>
                </div>
                <button onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: colors.border + '20', color: colors.border }}>
                  {isExp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
              {ver.description && <p className="text-xs opacity-60 mb-3" style={{ color: textMuted }}>{ver.description}</p>}
              {isOwner && isExp && (
                <div className="flex gap-2 mb-3">
                  <select value={ver.status} onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)}
                    className="rounded px-2 py-1 text-xs border" style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: text, borderColor: colors.border }}>
                    <option value="backlog">Backlog</option><option value="in_progress">In Progress</option>
                    <option value="qa">QA</option><option value="completed">Completed</option>
                  </select>
                  <Button size="sm" variant="ghost" onClick={() => deleteVersion(ver.id)} className="text-red-400 text-xs">Delete</Button>
                </div>
              )}
              {isExp ? (
                <div className="space-y-1.5 flex-1">
                  {ver.items?.map(item => {
                    const ic = sc(item.status);
                    const isEdit = editingTaskId === item.id;
                    return (
                      <div key={item.id} className="rounded-lg p-2.5 group transition-all"
                        style={{ backgroundColor: withOpacity(surface, 0.6), borderLeft: `2px solid ${ic.border}` }}>
                        {isEdit ? <TaskEditForm item={item} statusColors={ic} /> : (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium" style={{ color: text }}>{item.title}</p>
                            </div>
                            {isOwner && (
                              <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }}
                                className="opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: textMuted }}>
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                        {!isEdit && <TaskOwnerControls item={item} />}
                      </div>
                    );
                  })}
                  <AddTaskForm ver={ver} statusColors={colors} />
                </div>
              ) : (
                <div className="mt-auto">
                  <div className="flex gap-1 flex-wrap">
                    {(['backlog', 'in_progress', 'qa', 'completed'] as const).map(s => {
                      const count = ver.items?.filter(i => i.status === s).length || 0;
                      if (!count) return null;
                      const c = sc(s);
                      return <span key={s} className="text-xs px-2 py-0.5 rounded-full" style={{ color: c.text, backgroundColor: c.bg }}>{count}</span>;
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── LAYOUT: GLASS — frosted panels on animated gradient mesh ─────────────
  const renderGlass = () => (
    <div className={sectionSpacing}>
      {versions.map(ver => {
        const colors = sc(ver.status);
        const isExp = expanded[ver.id];
        return (
          <div key={ver.id} className="rounded-3xl overflow-hidden transition-all duration-300"
            style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.12)`, boxShadow: isExp ? `0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)` : `0 4px 20px rgba(0,0,0,0.2)` }}>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <button className="flex-1 text-left" onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className={`${settings.versionTitleSize || 'text-2xl'} font-bold`} style={{ color: text }}>{ver.version_name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: withOpacity(colors.border, 0.2), color: colors.text, border: `1px solid ${withOpacity(colors.border, 0.4)}` }}>
                      {ver.status.replace('_', ' ')}
                    </span>
                  </div>
                </button>
                <div className="flex items-center gap-3 ml-4">
                  <span className="text-xs opacity-40" style={{ color: textMuted }}>{ver.items?.length || 0} tasks</span>
                  <button onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: textMuted }}>
                    {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <VersionDescEditor ver={ver} statusColors={colors} />
            </div>
            {isOwner && isExp && (
              <div className="flex gap-2 px-6 pb-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                <select value={ver.status} onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)}
                  className="rounded-xl px-3 py-1.5 text-sm border"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: text, borderColor: 'rgba(255,255,255,0.1)' }}>
                  <option value="backlog">Backlog</option><option value="in_progress">In Progress</option>
                  <option value="qa">QA</option><option value="completed">Completed</option>
                </select>
                <Button size="sm" variant="ghost" onClick={() => deleteVersion(ver.id)} className="text-red-400 hover:text-red-300">Delete</Button>
              </div>
            )}
            {isExp && (
              <div className="px-6 pb-6 space-y-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="pt-4 space-y-2">
                  {ver.items?.map(item => {
                    const ic = sc(item.status);
                    const isEdit = editingTaskId === item.id;
                    return (
                      <div key={item.id} className="rounded-2xl p-3 group transition-all"
                        style={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.08)` }}>
                        {isEdit ? <TaskEditForm item={item} statusColors={ic} /> : (
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ic.border, boxShadow: `0 0 6px ${ic.border}` }} />
                            <div className="flex-1 min-w-0">
                              <p className={`${settings.taskTitleSize || 'text-sm'} font-medium`} style={{ color: text }}>{item.title}</p>
                              {item.description && <p className="text-xs mt-0.5 opacity-50" style={{ color: textMuted }}>{item.description}</p>}
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: ic.bg, color: ic.text }}>{item.status.replace('_', ' ')}</span>
                            {isOwner && (
                              <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }}
                                className="opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: textMuted }}>
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                        {!isEdit && <TaskOwnerControls item={item} />}
                      </div>
                    );
                  })}
                </div>
                <AddTaskForm ver={ver} statusColors={colors} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── LAYOUT: BRUTALIST — thick borders, 0 radius, uppercase ───────────────
  const renderBrutalist = () => (
    <div className={sectionSpacing} style={{ fontFamily: theme.font }}>
      {versions.map(ver => {
        const colors = sc(ver.status);
        const isExp = expanded[ver.id];
        return (
          <div key={ver.id} style={{ border: `3px solid ${colors.border}`, backgroundColor: surface, boxShadow: `6px 6px 0 ${colors.border}` }}>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <button className="flex-1 text-left" onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-black uppercase tracking-widest px-2 py-1"
                      style={{ backgroundColor: colors.border, color: bg }}>
                      {ver.status.replace('_', ' ')}
                    </span>
                    <h2 className={`${settings.versionTitleSize || 'text-2xl'} font-black uppercase tracking-tight`} style={{ color: text }}>{ver.version_name}</h2>
                  </div>
                </button>
                <div className="flex items-center gap-3 ml-4">
                  <span className="text-xs font-mono font-bold" style={{ color: textMuted }}>[{ver.items?.length || 0}]</span>
                  <button onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}
                    className="w-8 h-8 flex items-center justify-center font-black text-lg"
                    style={{ border: `2px solid ${colors.border}`, color: colors.border }}>
                    {isExp ? '−' : '+'}
                  </button>
                </div>
              </div>
              {ver.description && <p className="mt-2 text-sm font-mono opacity-70" style={{ color: textMuted }}>{ver.description}</p>}
            </div>
            {isOwner && isExp && (
              <div className="flex gap-2 px-5 pb-3 border-t-2" style={{ borderColor: colors.border, paddingTop: '8px' }}>
                <select value={ver.status} onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)}
                  className="px-3 py-1.5 text-sm border-2 font-bold uppercase"
                  style={{ backgroundColor: bg, color: text, borderColor: colors.border }}>
                  <option value="backlog">Backlog</option><option value="in_progress">In Progress</option>
                  <option value="qa">QA</option><option value="completed">Completed</option>
                </select>
                <Button size="sm" variant="ghost" onClick={() => deleteVersion(ver.id)} className="text-red-400 font-black uppercase">Delete</Button>
              </div>
            )}
            {isExp && (
              <div className="px-5 pb-5 space-y-2 border-t-2" style={{ borderColor: colors.border }}>
                <div className="pt-4 space-y-2">
                  {ver.items?.map(item => {
                    const ic = sc(item.status);
                    const isEdit = editingTaskId === item.id;
                    return (
                      <div key={item.id} className="p-3 group transition-all"
                        style={{ border: `2px solid ${ic.border}`, backgroundColor: bg }}>
                        {isEdit ? <TaskEditForm item={item} statusColors={ic} /> : (
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black uppercase px-1.5 py-0.5 flex-shrink-0"
                              style={{ backgroundColor: ic.border, color: bg }}>{item.status.replace('_', ' ')}</span>
                            <div className="flex-1 min-w-0">
                              <p className={`${settings.taskTitleSize || 'text-sm'} font-bold uppercase`} style={{ color: text }}>{item.title}</p>
                              {item.description && <p className="text-xs font-mono opacity-50 mt-0.5" style={{ color: textMuted }}>{item.description}</p>}
                            </div>
                            {isOwner && (
                              <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }}
                                className="opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: textMuted }}>
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                        {!isEdit && <TaskOwnerControls item={item} />}
                      </div>
                    );
                  })}
                </div>
                <AddTaskForm ver={ver} statusColors={colors} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── LAYOUT: ACCORDION — animated expand/collapse with progress bars ───────
  const renderAccordion = () => (
    <div className={sectionSpacing}>
      {versions.map(ver => {
        const colors = sc(ver.status);
        const isOpen = accordionOpen[ver.id] !== false; // default open
        const total = ver.items?.length || 0;
        const done = ver.items?.filter(i => i.status === 'completed').length || 0;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        return (
          <div key={ver.id} className="rounded-2xl overflow-hidden transition-all"
            style={{ backgroundColor: cardBg, border: `1px solid ${colors.border}20` }}>
            <button className="w-full p-5 flex items-center justify-between text-left transition-all hover:opacity-90"
              onClick={() => setAccordionOpen(p => ({ ...p, [ver.id]: !isOpen }))}>
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}40` }}>
                  <span className="text-lg font-black" style={{ color: colors.border }}>{pct}%</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className={`${settings.versionTitleSize || 'text-lg'} font-bold`} style={{ color: text }}>{ver.version_name}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: withOpacity(border, 0.2) }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: colors.border }} />
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: colors.border }}>{done}/{total}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.bg, color: colors.text }}>{ver.status.replace('_', ' ')}</span>
                <div className="w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300"
                  style={{ backgroundColor: withOpacity(colors.border, 0.15), transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <ChevronDown className="w-3.5 h-3.5" style={{ color: colors.border }} />
                </div>
              </div>
            </button>
            {isOpen && (
              <div className="border-t" style={{ borderColor: colors.border + '20' }}>
                {ver.description && <p className="px-5 pt-3 text-sm opacity-60" style={{ color: textMuted }}>{ver.description}</p>}
                {isOwner && (
                  <div className="flex gap-2 px-5 pt-3">
                    <select value={ver.status} onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)}
                      className="rounded-lg px-3 py-1.5 text-sm border"
                      style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: text, borderColor: colors.border }}>
                      <option value="backlog">Backlog</option><option value="in_progress">In Progress</option>
                      <option value="qa">QA</option><option value="completed">Completed</option>
                    </select>
                    <Button size="sm" variant="ghost" onClick={() => deleteVersion(ver.id)} className="text-red-400">Delete</Button>
                  </div>
                )}
                <div className="p-5 space-y-2">
                  {ver.items?.map(item => {
                    const ic = sc(item.status);
                    const isEdit = editingTaskId === item.id;
                    const StatusIcon = STATUS_ICONS[item.status] || Circle;
                    return (
                      <div key={item.id} className="rounded-xl p-3 group transition-all flex items-center gap-3"
                        style={{ backgroundColor: withOpacity(surface, 0.5), border: `1px solid ${ic.border}20` }}>
                        {isEdit ? <div className="flex-1"><TaskEditForm item={item} statusColors={ic} /></div> : (
                          <>
                            <StatusIcon className="w-4 h-4 flex-shrink-0" style={{ color: ic.border }} />
                            <div className="flex-1 min-w-0">
                              <p className={`${settings.taskTitleSize || 'text-sm'} font-medium`} style={{ color: text }}>{item.title}</p>
                              {item.description && <p className="text-xs opacity-50 mt-0.5" style={{ color: textMuted }}>{item.description}</p>}
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: ic.bg, color: ic.text }}>{item.status.replace('_', ' ')}</span>
                            {isOwner && (
                              <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }}
                                className="opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: textMuted }}>
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                            <TaskOwnerControls item={item} />
                          </>
                        )}
                      </div>
                    );
                  })}
                  <AddTaskForm ver={ver} statusColors={colors} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── LAYOUT: ORBIT — radial layout, versions as orbital nodes ─────────────
  const renderOrbit = () => {
    const activeVer = versions.find(v => v.id === (sidebarActiveId || versions[0]?.id)) || versions[0];
    return (
      <div>
        {/* Orbital ring selector */}
        <div className="relative flex items-center justify-center mb-8" style={{ minHeight: '200px' }}>
          <div className="absolute w-48 h-48 rounded-full" style={{ border: `1px solid ${accent}20` }} />
          <div className="absolute w-72 h-72 rounded-full" style={{ border: `1px dashed ${accent}10` }} />
          {/* Center hub */}
          <div className="relative z-10 w-20 h-20 rounded-full flex flex-col items-center justify-center"
            style={{ backgroundColor: withOpacity(accent, 0.15), border: `2px solid ${accent}60`, boxShadow: `0 0 30px ${accent}30` }}>
            <span className="text-xs font-bold" style={{ color: accent }}>{versions.length}</span>
            <span className="text-[10px] opacity-60" style={{ color: textMuted }}>versions</span>
          </div>
          {/* Orbital nodes */}
          {versions.map((ver, idx) => {
            const angle = (idx / versions.length) * 2 * Math.PI - Math.PI / 2;
            const r = 110;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            const colors = sc(ver.status);
            const isActive = (sidebarActiveId || versions[0]?.id) === ver.id;
            return (
              <button key={ver.id}
                onClick={() => setSidebarActiveId(ver.id)}
                className="absolute z-10 transition-all"
                style={{ transform: `translate(${x}px, ${y}px)` }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                  style={{ backgroundColor: isActive ? colors.border : withOpacity(colors.border, 0.2), border: `2px solid ${colors.border}`, boxShadow: isActive ? `0 0 16px ${colors.border}60` : 'none', transform: isActive ? 'scale(1.2)' : 'scale(1)' }}>
                  <span className="text-[9px] font-bold text-center leading-tight px-1" style={{ color: isActive ? bg : colors.border }}>
                    {ver.version_name.slice(0, 4)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        {/* Selected version detail */}
        {activeVer && (() => {
          const colors = sc(activeVer.status);
          return (
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: cardBg, border: `1px solid ${colors.border}25` }}>
              <div className="p-6 border-b" style={{ borderColor: colors.border + '20', background: `linear-gradient(135deg, ${colors.border}10 0%, transparent 60%)` }}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: colors.bg, color: colors.text }}>{activeVer.status.replace('_', ' ')}</span>
                    <h2 className={`${settings.versionTitleSize || 'text-2xl'} font-bold mt-2`} style={{ color: text }}>{activeVer.version_name}</h2>
                    {activeVer.description && <p className="text-sm opacity-60 mt-1" style={{ color: textMuted }}>{activeVer.description}</p>}
                  </div>
                  {isOwner && (
                    <div className="flex gap-2">
                      <select value={activeVer.status} onChange={e => updateStatus('roadmap_versions', activeVer.id, e.target.value)}
                        className="rounded-lg px-2 py-1 text-xs border"
                        style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: text, borderColor: colors.border }}>
                        <option value="backlog">Backlog</option><option value="in_progress">In Progress</option>
                        <option value="qa">QA</option><option value="completed">Completed</option>
                      </select>
                      <Button size="sm" variant="ghost" onClick={() => deleteVersion(activeVer.id)} className="text-red-400 text-xs">Delete</Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 space-y-2">
                {activeVer.items?.map(item => {
                  const ic = sc(item.status);
                  const isEdit = editingTaskId === item.id;
                  const StatusIcon = STATUS_ICONS[item.status] || Circle;
                  return (
                    <div key={item.id} className="rounded-xl p-3 group transition-all flex items-center gap-3"
                      style={{ backgroundColor: withOpacity(surface, 0.5), border: `1px solid ${ic.border}20` }}>
                      {isEdit ? <div className="flex-1"><TaskEditForm item={item} statusColors={ic} /></div> : (
                        <>
                          <StatusIcon className="w-4 h-4 flex-shrink-0" style={{ color: ic.border }} />
                          <div className="flex-1 min-w-0">
                            <p className={`${settings.taskTitleSize || 'text-sm'} font-medium`} style={{ color: text }}>{item.title}</p>
                            {item.description && <p className="text-xs opacity-50 mt-0.5" style={{ color: textMuted }}>{item.description}</p>}
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: ic.bg, color: ic.text }}>{item.status.replace('_', ' ')}</span>
                          {isOwner && (
                            <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }}
                              className="opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: textMuted }}>
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                          <TaskOwnerControls item={item} />
                        </>
                      )}
                    </div>
                  );
                })}
                {activeVer.items?.length === 0 && (
                  <div className="text-center py-8 opacity-30" style={{ color: textMuted }}>
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No tasks yet</p>
                  </div>
                )}
                <AddTaskForm ver={activeVer} statusColors={colors} />
              </div>
            </div>
          );
        })()}
        {isOwner && (
          <div className="mt-4">
            <Input value={newVersion} onChange={e => setNewVersion(e.target.value)} placeholder="New version name..."
              onKeyDown={e => e.key === 'Enter' && addVersion()}
              className="rounded-xl" style={{ backgroundColor: withOpacity(surface, 0.6), borderColor: accent + '40', color: text }} />
          </div>
        )}
      </div>
    );
  };

  // ── Layout dispatch ───────────────────────────────────────────────────────
  const renderLayout = () => {
    switch (layout) {
      case 'ghost':      return renderGhost();
      case 'kanban':     return renderKanban();
      case 'timeline':   return renderTimeline();
      case 'terminal':   return renderTerminal();
      case 'spotlight':  return renderSpotlight();
      case 'bento':      return renderBento();
      case 'glass':      return renderGlass();
      case 'brutalist':  return renderBrutalist();
      case 'accordion':  return renderAccordion();
      case 'orbit':      return renderOrbit();
      default:           return renderGhost();
    }
  };

  const FORUM_STATUS_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
    open:        { bg: withOpacity(theme.status.backlog, 0.2),     text: theme.status.backlog,     border: theme.status.backlog,     label: 'Open' },
    planned:     { bg: withOpacity(theme.status.in_progress, 0.2), text: theme.status.in_progress, border: theme.status.in_progress, label: 'Planned' },
    in_progress: { bg: withOpacity(theme.status.in_progress, 0.3), text: theme.status.in_progress, border: theme.status.in_progress, label: 'In Progress' },
    completed:   { bg: withOpacity(theme.status.completed, 0.2),   text: theme.status.completed,   border: theme.status.completed,   label: 'Completed' },
    declined:    { bg: 'rgba(239,68,68,0.15)',                      text: '#ef4444',                border: '#ef4444',                label: 'Declined' },
  };

  const sortedSuggestions = [...suggestions].sort((a, b) => {
    if (sortBy === 'upvotes') return b.upvotes - a.upvotes;
    if (sortBy === 'newest') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    return (b.reply_count || 0) - (a.reply_count || 0);
  });

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ ...bgStyle, fontFamily: settings.fontFamily || theme.font || 'Inter, sans-serif' }}>
      <div className={`${settings.roadmapWidth || 'max-w-6xl'} mx-auto px-4 py-10`}>

        {/* Header */}
        {settings.showHeader !== false && (
          <div className="mb-10 text-center">
            {settings.showLogo && storeLogo && (
              <img src={storeLogo} alt={storeName} className="w-16 h-16 rounded-2xl mx-auto mb-4 object-cover" />
            )}
            {onBack && (
              <button onClick={onBack} className="flex items-center gap-2 text-sm mb-4 mx-auto opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: textMuted }}>
                <ArrowLeft className="w-4 h-4" />Back
              </button>
            )}
            <h1 className={`${settings.mainTitleSize || 'text-5xl'} font-black tracking-tight`} style={{ color: text }}>
              {settings.title || 'Development Roadmap'}
            </h1>
            {settings.subtitle && (
              <p className="mt-3 text-lg opacity-60 max-w-2xl mx-auto" style={{ color: textMuted }}>{settings.subtitle}</p>
            )}
          </div>
        )}

        {/* Owner controls — add version */}
        {isOwner && layout !== 'orbit' && (
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <div className="flex gap-2 flex-1 min-w-0">
              <Input value={newVersion} onChange={e => setNewVersion(e.target.value)}
                placeholder="New version name..." onKeyDown={e => e.key === 'Enter' && addVersion()}
                className="rounded-xl flex-1" style={{ backgroundColor: withOpacity(surface, 0.6), borderColor: accent + '40', color: text }} />
              <Button onClick={addVersion} disabled={!newVersion.trim()} style={{ backgroundColor: accent, color: '#fff' }}>
                <Plus className="w-4 h-4 mr-1" />Add
              </Button>
            </div>
          </div>
        )}

        {/* Layout content */}
        {renderLayout()}

        {/* Suggestions section */}
        {settings.showSuggestions && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: text }}>
                  <Lightbulb className="w-6 h-6" style={{ color: accent }} />Feature Requests
                </h2>
                <p className="text-sm opacity-50 mt-1" style={{ color: textMuted }}>
                  {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1 rounded-xl overflow-hidden" style={{ border: `1px solid ${border}30` }}>
                  {(['upvotes', 'newest', 'discussed'] as const).map(s => (
                    <button key={s} onClick={() => setSortBy(s)}
                      className="px-3 py-1.5 text-xs font-medium transition-all capitalize"
                      style={{ backgroundColor: sortBy === s ? accent + '25' : 'transparent', color: sortBy === s ? accent : textMuted }}>
                      {s}
                    </button>
                  ))}
                </div>
                {user && (
                  <Button onClick={() => setShowModal(true)} size="sm" style={{ backgroundColor: accent, color: '#fff' }}>
                    <Plus className="w-3.5 h-3.5 mr-1" />Suggest
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {sortedSuggestions.slice(0, settings.suggestionsLimit || 10).map(sug => {
                const fsc = FORUM_STATUS_COLORS[sug.forum_status || 'open'] || FORUM_STATUS_COLORS.open;
                return (
                  <div key={sug.id} className="rounded-2xl p-4 transition-all cursor-pointer hover:scale-[1.005]"
                    style={{ backgroundColor: withOpacity(surface, 0.6), border: `1px solid ${border}20`, boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}
                    onClick={() => { setSelectedSuggestion(sug); fetchReplies(sug.id); }}>
                    <div className="flex items-start gap-4">
                      <button onClick={e => { e.stopPropagation(); toggleUpvote(sug.id, sug.user_upvoted || false); }}
                        className="flex flex-col items-center px-2.5 py-2 rounded-xl transition-all flex-shrink-0"
                        style={{ backgroundColor: sug.user_upvoted ? accent + '25' : withOpacity(surface, 0.4), color: sug.user_upvoted ? accent : textMuted, border: sug.user_upvoted ? `1px solid ${accent}50` : `1px solid ${border}20` }}>
                        <ThumbsUp className="w-3.5 h-3.5 mb-0.5" />
                        <span className="text-xs font-bold">{sug.upvotes}</span>
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-sm font-semibold" style={{ color: text }}>{sug.title}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: fsc.bg, color: fsc.text, border: `1px solid ${fsc.border}40` }}>
                            {fsc.label}
                          </span>
                        </div>
                        {sug.description && <p className="text-xs opacity-60 mb-2 line-clamp-2" style={{ color: textMuted }}>{sug.description}</p>}
                        <div className="flex items-center gap-3 text-xs opacity-50" style={{ color: textMuted }}>
                          <span>{sug.author?.display_name || 'Anonymous'}</span>
                          <span>·</span>
                          <span>{fmtRelative(sug.created_at)}</span>
                          {(sug.reply_count || 0) > 0 && (
                            <><span>·</span><span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{sug.reply_count}</span></>
                          )}
                        </div>
                      </div>
                      {isOwner && (
                        <div className="flex flex-col gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          <select value={sug.forum_status || 'open'} onChange={e => updateSuggestionStatus(sug.id, e.target.value)}
                            className="rounded-lg px-2 py-1 text-xs border"
                            style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: text, borderColor: border }}>
                            <option value="open">Open</option>
                            <option value="planned">Planned</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="declined">Declined</option>
                          </select>
                          <button onClick={() => deleteSuggestion(sug.id)} className="text-red-400 hover:text-red-300 text-xs text-center">Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {suggestions.length === 0 && (
                <div className="text-center py-12 rounded-2xl" style={{ backgroundColor: withOpacity(surface, 0.3), border: `1px dashed ${border}30` }}>
                  <Lightbulb className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: accent }} />
                  <p className="text-sm opacity-40" style={{ color: textMuted }}>No suggestions yet. Be the first!</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Thread drawer */}
      {selectedSuggestion && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => { setSelectedSuggestion(null); setSuggestionReplies([]); }}>
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl overflow-hidden"
            style={{ backgroundColor: bg, border: `1px solid ${border}30`, boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex items-start justify-between gap-4" style={{ borderColor: border + '20' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {(() => {
                    const fsc = FORUM_STATUS_COLORS[selectedSuggestion.forum_status || 'open'] || FORUM_STATUS_COLORS.open;
                    return <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: fsc.bg, color: fsc.text, border: `1px solid ${fsc.border}40` }}>{fsc.label}</span>;
                  })()}
                  <span className="text-xs opacity-40" style={{ color: textMuted }}>{fmtRelative(selectedSuggestion.created_at)}</span>
                </div>
                <h3 className="text-lg font-bold" style={{ color: text }}>{selectedSuggestion.title}</h3>
                {selectedSuggestion.description && <p className="text-sm opacity-60 mt-1" style={{ color: textMuted }}>{selectedSuggestion.description}</p>}
                <div className="flex items-center gap-3 mt-3">
                  <button onClick={() => toggleUpvote(selectedSuggestion.id, selectedSuggestion.user_upvoted || false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-all"
                    style={{ backgroundColor: selectedSuggestion.user_upvoted ? accent + '25' : withOpacity(surface, 0.5), color: selectedSuggestion.user_upvoted ? accent : textMuted, border: `1px solid ${selectedSuggestion.user_upvoted ? accent + '50' : border + '30'}` }}>
                    <ThumbsUp className="w-3.5 h-3.5" />{selectedSuggestion.upvotes}
                  </button>
                  <span className="text-xs opacity-40" style={{ color: textMuted }}>by {selectedSuggestion.author?.display_name || 'Anonymous'}</span>
                </div>
              </div>
              <button onClick={() => { setSelectedSuggestion(null); setSuggestionReplies([]); }}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: withOpacity(surface, 0.5), color: textMuted }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingReplies ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: accent }} /></div>
              ) : suggestionReplies.length === 0 ? (
                <div className="text-center py-8 opacity-30" style={{ color: textMuted }}>
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No replies yet</p>
                </div>
              ) : (
                suggestionReplies.map(reply => (
                  <div key={reply.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ backgroundColor: reply.is_creator ? accent + '30' : withOpacity(surface, 0.6), color: reply.is_creator ? accent : textMuted, border: reply.is_creator ? `1px solid ${accent}50` : `1px solid ${border}20` }}>
                      {(reply.author?.display_name || 'A')[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold" style={{ color: text }}>{reply.author?.display_name || 'Anonymous'}</span>
                        {reply.is_creator && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: accent + '20', color: accent }}>Creator</span>}
                        <span className="text-xs opacity-40" style={{ color: textMuted }}>{fmtRelative(reply.created_at)}</span>
                      </div>
                      <p className="text-sm" style={{ color: text }}>{reply.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {user && (
              <div className="p-4 border-t flex gap-3" style={{ borderColor: border + '20' }}>
                <Input value={replyContent} onChange={e => setReplyContent(e.target.value)}
                  placeholder="Write a reply..." onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitReply()}
                  className="flex-1 rounded-xl" style={{ backgroundColor: withOpacity(surface, 0.5), borderColor: accent + '30', color: text }} />
                <Button onClick={submitReply} disabled={!replyContent.trim() || submitting} size="sm"
                  style={{ backgroundColor: accent, color: '#fff' }}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New suggestion modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md rounded-3xl p-6 space-y-4"
            style={{ backgroundColor: bg, border: `1px solid ${border}30`, boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold" style={{ color: text }}>Submit a Suggestion</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: withOpacity(surface, 0.5), color: textMuted }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <Input value={suggestionTitle} onChange={e => setSuggestionTitle(e.target.value)}
              placeholder="Feature title..." className="rounded-xl"
              style={{ backgroundColor: withOpacity(surface, 0.5), borderColor: accent + '30', color: text }} />
            <Textarea value={suggestionDesc} onChange={e => setSuggestionDesc(e.target.value)}
              placeholder="Describe your idea..." rows={3} className="rounded-xl"
              style={{ backgroundColor: withOpacity(surface, 0.5), borderColor: accent + '30', color: text }} />
            <div className="flex gap-3">
              <Button onClick={submitSuggestion} disabled={!suggestionTitle.trim() || submitting}
                className="flex-1" style={{ backgroundColor: accent, color: '#fff' }}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Submit
              </Button>
              <Button variant="ghost" onClick={() => setShowModal(false)} style={{ color: textMuted }}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
