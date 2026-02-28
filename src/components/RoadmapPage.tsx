import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  ChevronDown, ChevronUp, Plus, Lightbulb,
  Sparkles, ThumbsUp, Send, X, Loader2,
  Circle, CheckCircle2, PlayCircle, TestTube2,
  Edit2, MessageCircle, ArrowLeft, Clock, ArrowUp,
  Vote, Users, Zap, Terminal, Grid3X3, Layers, BookOpen
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

// ─── Utility: hex → rgba ────────────────────────────────────────────────────
function hexToRgba(hex: string, opacity: number): string {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return `rgba(128,128,128,${opacity})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// ─── Utility: extract rgba from any color string ─────────────────────────────
function withOpacity(color: string, opacity: number): string {
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

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  in_progress: 'In Progress',
  qa: 'QA',
  completed: 'Completed',
};

export const RoadmapPage = ({
  creatorId, isOwner, settings, storeName, storeLogo, productId,
  onBack, votingEnabled = false, sortByVotes = false, storeSlug, globalBackground
}: RoadmapPageProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = getTheme(settings);

  const getCardBg = () => {
    const base = settings.useCustomColors && settings.customCardBackground ? settings.customCardBackground : theme.cardBackground;
    return withOpacity(base, (settings.cardOpacity ?? 80) / 100);
  };

  const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    backlog:     { bg: withOpacity(theme.statusColors.backlog, 0.25),     border: theme.statusColors.backlog,     text: theme.statusColors.backlog },
    in_progress: { bg: withOpacity(theme.statusColors.in_progress, 0.25), border: theme.statusColors.in_progress, text: theme.statusColors.in_progress },
    qa:          { bg: withOpacity(theme.statusColors.qa, 0.25),          border: theme.statusColors.qa,          text: theme.statusColors.qa },
    completed:   { bg: withOpacity(theme.statusColors.completed, 0.25),   border: theme.statusColors.completed,   text: theme.statusColors.completed },
  };
  const sc = (status: string) => STATUS_COLORS[status] || STATUS_COLORS.backlog;

  // ── State ──────────────────────────────────────────────────────────────────
  const [versions, setVersions] = useState<RoadmapVersion[]>([]);
  const [suggestions, setSuggestions] = useState<RoadmapSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
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

  // ── Helpers ────────────────────────────────────────────────────────────────
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

  // ── Data fetching ──────────────────────────────────────────────────────────
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
          if (sortBy === 'newest') enriched.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          else if (sortBy === 'discussed') enriched.sort((a: any, b: any) => (b.reply_count || 0) - (a.reply_count || 0));
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

  // ── Mutations ──────────────────────────────────────────────────────────────
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

  const toggleVotingSettings = async (field: 'voting_enabled' | 'sort_by_votes', value: boolean) => {
    if (!productId || !isOwner) return;
    try {
      await (supabase as any).from('products').update({ [field]: value }).eq('id', productId);
      if (field === 'voting_enabled') setItemVotingEnabled(value);
      if (field === 'sort_by_votes') setItemSortByVotes(value);
      fetchData(); toast.success(value ? 'Enabled!' : 'Disabled!');
    } catch { toast.error('Failed'); }
  };

  const toggleItemVotingEnabled = async (itemId: string, current: boolean) => {
    if (!isOwner) return;
    try {
      await (supabase as any).from('roadmap_items').update({ voting_enabled: !current }).eq('id', itemId);
      fetchData(); toast.success(!current ? 'Voting enabled!' : 'Voting disabled!');
    } catch { toast.error('Failed'); }
  };

  // ── Background style ───────────────────────────────────────────────────────
  let bgStyle: React.CSSProperties = {};
  const hasOwnBg = settings.backgroundType && settings.backgroundType !== 'default';
  if (hasOwnBg) {
    if (settings.backgroundType === 'image' && settings.backgroundImage) {
      const op = (settings.backgroundOverlayOpacity || 70) / 100;
      bgStyle = { backgroundImage: `linear-gradient(rgba(0,0,0,${op}),rgba(0,0,0,${op})),url(${settings.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' };
    } else if (settings.backgroundType === 'gradient') {
      const s = settings.useCustomColors ? settings.customBackgroundGradientStart : (theme.backgroundGradient?.start || theme.backgroundColor);
      const e = settings.useCustomColors ? settings.customBackgroundGradientEnd : (theme.backgroundGradient?.end || theme.backgroundColor);
      bgStyle = { background: `linear-gradient(135deg, ${s} 0%, ${e} 100%)` };
    } else {
      bgStyle = { backgroundColor: settings.customBackgroundColor || theme.backgroundColor };
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
  } else if (theme.backgroundGradient) {
    const s = settings.useCustomColors ? settings.customBackgroundGradientStart : theme.backgroundGradient.start;
    const e = settings.useCustomColors ? settings.customBackgroundGradientEnd : theme.backgroundGradient.end;
    bgStyle = { background: `linear-gradient(135deg, ${s} 0%, ${e} 100%)` };
  } else {
    bgStyle = { backgroundColor: settings.useCustomColors ? settings.customBackgroundColor : theme.backgroundColor };
  }

  const layout = settings.layoutVariant || 'stacked';
  const cardBg = getCardBg();
  const accent = theme.accentColor;
  const spacingMap: Record<string, string> = { compact: 'space-y-3', normal: 'space-y-5', relaxed: 'space-y-8' };
  const sectionSpacing = spacingMap[settings.sectionSpacing || 'normal'] || 'space-y-5';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={bgStyle}>
      <Loader2 className="w-12 h-12 animate-spin" style={{ color: accent }} />
    </div>
  );

  // ── Shared sub-components ──────────────────────────────────────────────────

  const TaskEditForm = ({ item, statusColors }: { item: RoadmapItem; statusColors: { border: string } }) => (
    <div className="space-y-3">
      <Input value={editingTaskTitle} onChange={e => setEditingTaskTitle(e.target.value)}
        placeholder="Task title..." className="w-full rounded-lg"
        style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderColor: statusColors.border, color: theme.textPrimary }} autoFocus />
      <Textarea value={editingTaskDesc} onChange={e => setEditingTaskDesc(e.target.value)}
        placeholder="Description (optional)..." rows={2} className="w-full rounded-lg"
        style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderColor: statusColors.border, color: theme.textPrimary }} />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => updateTask(item.id, editingTaskTitle, editingTaskDesc)}
          disabled={!editingTaskTitle.trim()} style={{ backgroundColor: accent, color: '#fff' }}>Save</Button>
        <Button size="sm" variant="ghost" onClick={() => setEditingTaskId(null)} style={{ color: theme.textSecondary }}>Cancel</Button>
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
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: theme.textPrimary, borderColor: theme.cardBorder }}
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
            className="w-full" style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderColor: statusColors.border, color: theme.textPrimary }} autoFocus />
          <Textarea placeholder="Description (optional)..." value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} rows={2}
            className="w-full" style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderColor: statusColors.border, color: theme.textPrimary }} />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => addItem(ver.id)} disabled={!newItem.trim()} style={{ backgroundColor: accent, color: '#fff' }}>Add Task</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAddingTo(null); setNewItem(''); setNewItemDesc(''); }} style={{ color: theme.textSecondary }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAddingTo(ver.id)}
          className="w-full p-2.5 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-80 mt-3"
          style={{ borderColor: statusColors.border + '50', color: theme.textSecondary }}>
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
          style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderColor: statusColors.border, color: theme.textPrimary }} autoFocus />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => updateVersionDescription(ver.id, editingVersionDesc)} style={{ backgroundColor: accent, color: '#fff' }}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditingVersionId(null)} style={{ color: theme.textSecondary }}>Cancel</Button>
        </div>
      </div>
    ) : (
      <>
        {ver.description && <p className="mt-2 text-sm opacity-70" style={{ color: theme.textSecondary }}>{ver.description}</p>}
        {isOwner && (
          <button onClick={() => { setEditingVersionId(ver.id); setEditingVersionDesc(ver.description || ''); }}
            className="mt-1 text-xs flex items-center gap-1 opacity-40 hover:opacity-80 transition-opacity" style={{ color: theme.textSecondary }}>
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
          style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: theme.textPrimary, borderColor: colors.border }}>
          <option value="backlog">Backlog</option>
          <option value="in_progress">In Progress</option>
          <option value="qa">QA</option>
          <option value="completed">Completed</option>
        </select>
        <Button size="sm" variant="ghost" onClick={() => deleteVersion(ver.id)} className="text-red-400 hover:text-red-300">Delete</Button>
      </div>
    ) : null;
  };

  // ── LAYOUT: STACKED (kinetic, forge) ──────────────────────────────────────
  const renderStacked = () => (
    <div className={`${sectionSpacing} px-1`}>
      {versions.map(ver => {
        const colors = sc(ver.status);
        const isExp = expanded[ver.id];
        const br = (settings.cardBorderRadius || 12) + 'px';
        return (
          <div key={ver.id} className="backdrop-blur-xl transition-all duration-300"
            style={{ backgroundColor: cardBg, borderRadius: br, boxShadow: `inset 4px 0 0 0 ${colors.border}, inset 0 0 0 1px ${colors.border}20, 0 8px 32px rgba(0,0,0,0.4)` }}>
            <div className={settings.cardPadding || 'p-6'}>
              <div className="flex items-center justify-between">
                <button className="flex-1 text-left" onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className={`${settings.versionTitleSize || 'text-2xl'} font-bold`} style={{ color: theme.textPrimary }}>{ver.version_name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider"
                      style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}50` }}>
                      {ver.status.replace('_', ' ')}
                    </span>
                    {ver.status === 'completed' && ver.status_changed_at && (
                      <span className="text-xs flex items-center gap-1 opacity-60" style={{ color: theme.textSecondary }}>
                        <CheckCircle2 className="w-3 h-3" />Completed {fmtDate(ver.status_changed_at)}
                      </span>
                    )}
                  </div>
                </button>
                <div className="flex items-center gap-3 ml-4">
                  <span className="text-xs opacity-50" style={{ color: theme.textSecondary }}>{ver.items?.length || 0} tasks</span>
                  <button onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
                    {isExp ? <ChevronUp className="w-5 h-5" style={{ color: theme.textSecondary }} /> : <ChevronDown className="w-5 h-5" style={{ color: theme.textSecondary }} />}
                  </button>
                </div>
              </div>
              <VersionDescEditor ver={ver} statusColors={colors} />
            </div>
            <VersionOwnerControls ver={ver} />
            {isExp && (
              <div className="px-6 pb-6 space-y-2 border-t" style={{ borderColor: colors.border + '15' }}>
                <div className="pt-4 space-y-2">
                  {ver.items?.map(item => {
                    const ic = sc(item.status);
                    const isEdit = editingTaskId === item.id;
                    return (
                      <div key={item.id} className={`rounded-xl ${settings.taskCardPadding || 'p-3'} transition-all group backdrop-blur-sm`}
                        style={{ backgroundColor: withOpacity(theme.cardBackground, 0.5), border: `1px solid ${ic.border}30` }}>
                        {isEdit ? <TaskEditForm item={item} statusColors={ic} /> : (
                          <div className="flex items-center gap-3">
                            {itemVotingEnabled && item.voting_enabled !== false && (
                              <button onClick={() => toggleItemVote(item.id, item.user_has_voted || false)}
                                className="flex flex-col items-center px-2 py-1.5 rounded-lg transition-all hover:scale-105 flex-shrink-0"
                                style={{ backgroundColor: item.user_has_voted ? accent + '30' : 'rgba(0,0,0,0.2)', color: item.user_has_voted ? accent : theme.textSecondary, border: item.user_has_voted ? `2px solid ${accent}` : '2px solid transparent' }}>
                                <ArrowUp className="w-3 h-3 mb-0.5" /><span className="text-xs font-bold">{item.vote_count || 0}</span>
                              </button>
                            )}
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ic.border }} />
                            <div className="flex-1 min-w-0">
                              <h3 className={`${settings.taskTitleSize || 'text-sm'} font-medium`} style={{ color: theme.textPrimary }}>{item.title}</h3>
                              {item.description && <p className="text-xs mt-0.5 opacity-60" style={{ color: theme.textSecondary }}>{item.description}</p>}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {isOwner && (
                                <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }}
                                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-1" style={{ color: theme.textSecondary }}>
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                              <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: ic.bg, color: ic.text }}>{item.status.replace('_', ' ')}</span>
                            </div>
                          </div>
                        )}
                        {!isEdit && item.status_changed_at && (
                          <div className="flex items-center gap-1 text-xs mt-1.5 pl-5 opacity-40" style={{ color: theme.textSecondary }}>
                            <Clock className="w-2.5 h-2.5" />
                            {item.status === 'completed' ? fmtDate(item.status_changed_at) : fmtRelative(item.status_changed_at)}
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

  // ── LAYOUT: TIMELINE (ghost) ───────────────────────────────────────────────
  const renderTimeline = () => (
    <div className="px-1 relative">
      <div className="absolute left-[30px] top-0 bottom-0 w-px" style={{ background: `linear-gradient(to bottom, transparent, ${accent}60, transparent)` }} />
      <div className={sectionSpacing}>
        {versions.map((ver, idx) => {
          const colors = sc(ver.status);
          const isExp = expanded[ver.id];
          return (
            <div key={ver.id} className="relative pl-16">
              {/* Timeline node */}
              <div className="absolute left-[22px] top-5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center z-10 transition-all"
                style={{ backgroundColor: isExp ? colors.border : theme.backgroundColor, borderColor: colors.border, boxShadow: isExp ? `0 0 12px ${colors.border}80` : 'none' }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isExp ? '#fff' : colors.border }} />
              </div>
              {/* Connector line to card */}
              <div className="absolute left-[40px] top-[30px] h-px w-6" style={{ backgroundColor: colors.border + '40' }} />
              <div className="rounded-2xl backdrop-blur-xl transition-all duration-300"
                style={{ backgroundColor: cardBg, border: `1px solid ${colors.border}25`, boxShadow: isExp ? `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px ${colors.border}15` : '0 2px 12px rgba(0,0,0,0.2)' }}>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <button className="flex-1 text-left" onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className={`${settings.versionTitleSize || 'text-xl'} font-semibold`} style={{ color: theme.textPrimary }}>{ver.version_name}</h2>
                        <span className="text-xs px-2 py-0.5 rounded-full border"
                          style={{ color: colors.text, borderColor: colors.border + '60', backgroundColor: colors.bg }}>
                          {ver.status.replace('_', ' ')}
                        </span>
                        {ver.status === 'completed' && ver.status_changed_at && (
                          <span className="text-xs opacity-50" style={{ color: theme.textSecondary }}>· {fmtDate(ver.status_changed_at)}</span>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-xs opacity-40" style={{ color: theme.textSecondary }}>{ver.items?.length || 0}</span>
                      <button onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
                        {isExp ? <ChevronUp className="w-4 h-4" style={{ color: theme.textSecondary }} /> : <ChevronDown className="w-4 h-4" style={{ color: theme.textSecondary }} />}
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
                            style={{ backgroundColor: withOpacity(theme.cardBackground, 0.4), borderLeft: `2px solid ${ic.border}60` }}>
                            {isEdit ? <TaskEditForm item={item} statusColors={ic} /> : (
                              <div className="flex items-center gap-3">
                                <StatusIcon className="w-4 h-4 flex-shrink-0" style={{ color: ic.border }} />
                                <div className="flex-1 min-w-0">
                                  <h3 className={`${settings.taskTitleSize || 'text-sm'} font-medium`} style={{ color: theme.textPrimary }}>{item.title}</h3>
                                  {item.description && <p className="text-xs mt-0.5 opacity-60" style={{ color: theme.textSecondary }}>{item.description}</p>}
                                </div>
                                {isOwner && (
                                  <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }}
                                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-1" style={{ color: theme.textSecondary }}>
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

  // ── Terminal Layout ────────────────────────────────────────────────────────
  const renderTerminal = () => (
    <div className="font-mono text-sm">
      <div className="mb-4 px-1" style={{ color: accent }}>
        <span className="opacity-60">$ </span>
        <span>roadmap --list-versions --product="{productName}"</span>
      </div>
      <div className={sectionSpacing}>
        {versions.map((ver, idx) => {
          const colors = sc(ver.status);
          const isExp = expanded[ver.id];
          const statusChar = ver.status === 'completed' ? '✓' : ver.status === 'in_progress' ? '~' : ver.status === 'qa' ? '?' : '·';
          return (
            <div key={ver.id} className="rounded-none" style={{ borderLeft: `3px solid ${colors.border}`, paddingLeft: '1rem' }}>
              <button className="w-full text-left py-2" onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
                <div className="flex items-center gap-3">
                  <span style={{ color: colors.border }}>[{statusChar}]</span>
                  <span className={`${settings.versionTitleSize || 'text-base'} font-bold`} style={{ color: theme.textPrimary }}>{ver.version_name}</span>
                  <span className="text-xs opacity-40" style={{ color: theme.textSecondary }}>// {ver.status.replace('_', ' ')}</span>
                  {ver.status === 'completed' && ver.status_changed_at && (
                    <span className="text-xs opacity-30" style={{ color: theme.textSecondary }}>{fmtDate(ver.status_changed_at)}</span>
                  )}
                  <span className="ml-auto text-xs opacity-30" style={{ color: theme.textSecondary }}>{isExp ? '[-]' : '[+]'}</span>
                </div>
              </button>
              <VersionDescEditor ver={ver} statusColors={colors} />
              <VersionOwnerControls ver={ver} />
              {isExp && (
                <div className="pb-3 space-y-1 pl-2">
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
                              <span className={`${settings.taskTitleSize || 'text-sm'}`} style={{ color: item.status === 'completed' ? theme.textSecondary : theme.textPrimary, textDecoration: item.status === 'completed' ? 'line-through' : 'none', opacity: item.status === 'completed' ? 0.6 : 1 }}>{item.title}</span>
                              {item.description && <div className="text-xs opacity-40 mt-0.5" style={{ color: theme.textSecondary }}>  # {item.description}</div>}
                            </div>
                            {isOwner && (
                              <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }}
                                className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity" style={{ color: theme.textSecondary }}>
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

  // ── Grid Layout ────────────────────────────────────────────────────────────
  const renderGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {versions.map(ver => {
        const colors = sc(ver.status);
        const isExp = expanded[ver.id];
        return (
          <div key={ver.id} className="rounded-2xl overflow-hidden flex flex-col"
            style={{ backgroundColor: cardBg, border: `1px solid ${colors.border}20`, boxShadow: `0 4px 20px rgba(0,0,0,0.3)` }}>
            {/* Gradient header bar */}
            <div className="px-5 py-4" style={{ background: `linear-gradient(135deg, ${colors.border}30 0%, ${colors.border}08 100%)`, borderBottom: `1px solid ${colors.border}25` }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`${settings.versionTitleSize || 'text-lg'} font-bold`} style={{ color: theme.textPrimary }}>{ver.version_name}</h2>
                  <span className="text-xs mt-1 inline-block px-2 py-0.5 rounded-full"
                    style={{ color: colors.text, backgroundColor: colors.bg, border: `1px solid ${colors.border}40` }}>
                    {ver.status.replace('_', ' ')}
                  </span>
                </div>
                <button onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                  style={{ backgroundColor: colors.border + '20', color: colors.border }}>
                  {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
              <VersionDescEditor ver={ver} statusColors={colors} />
            </div>
            <VersionOwnerControls ver={ver} />
            {isExp && (
              <div className="p-4 space-y-2 flex-1">
                {ver.items?.map(item => {
                  const ic = sc(item.status);
                  const isEdit = editingTaskId === item.id;
                  const StatusIcon = STATUS_ICONS[item.status] || Circle;
                  return (
                    <div key={item.id} className={`rounded-xl ${settings.taskCardPadding || 'p-3'} group transition-all`}
                      style={{ backgroundColor: withOpacity(theme.cardBackground, 0.5), borderLeft: `3px solid ${ic.border}` }}>
                      {isEdit ? <TaskEditForm item={item} statusColors={ic} /> : (
                        <div className="flex items-center gap-2">
                          <StatusIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: ic.border }} />
                          <div className="flex-1 min-w-0">
                            <p className={`${settings.taskTitleSize || 'text-sm'} font-medium`} style={{ color: theme.textPrimary }}>{item.title}</p>
                            {item.description && <p className="text-xs opacity-50 mt-0.5" style={{ color: theme.textSecondary }}>{item.description}</p>}
                          </div>
                          {isOwner && (
                            <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }}
                              className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity" style={{ color: theme.textSecondary }}>
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
            {!isExp && (
              <div className="px-4 pb-3">
                <div className="flex gap-1 flex-wrap">
                  {(['backlog','in_progress','qa','completed'] as const).map(s => {
                    const count = ver.items?.filter(i => i.status === s).length || 0;
                    if (!count) return null;
                    const c = sc(s);
                    return <span key={s} className="text-xs px-2 py-0.5 rounded-full" style={{ color: c.text, backgroundColor: c.bg }}>{count} {s.replace('_',' ')}</span>;
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Kanban Layout ──────────────────────────────────────────────────────────
  const renderKanban = () => {
    const columns = [
      { key: 'backlog', label: 'Backlog' },
      { key: 'in_progress', label: 'In Progress' },
      { key: 'qa', label: 'QA' },
      { key: 'completed', label: 'Done' },
    ] as const;
    // Flatten all items across versions, tagged with version name
    const allItems = versions.flatMap(ver =>
      (ver.items || []).map(item => ({ ...item, _verName: ver.version_name, _verColors: sc(ver.status) }))
    );
    return (
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {columns.map(col => {
            const colColors = sc(col.key);
            const items = allItems.filter(i => i.status === col.key);
            return (
              <div key={col.key} className="w-72 flex-shrink-0 rounded-2xl flex flex-col"
                style={{ backgroundColor: withOpacity(theme.cardBackground, 0.4), border: `1px solid ${colColors.border}20` }}>
                {/* Column header */}
                <div className="px-4 py-3 flex items-center justify-between rounded-t-2xl"
                  style={{ borderBottom: `2px solid ${colColors.border}50`, background: `linear-gradient(135deg, ${colColors.border}15 0%, transparent 100%)` }}>
                  <span className="text-sm font-semibold tracking-wide uppercase" style={{ color: colColors.border }}>{col.label}</span>
                  <span className="text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold"
                    style={{ backgroundColor: colColors.bg, color: colColors.text }}>{items.length}</span>
                </div>
                {/* Cards */}
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
                              <p className={`${settings.taskTitleSize || 'text-sm'} font-medium leading-snug`} style={{ color: theme.textPrimary }}>{item.title}</p>
                              {isOwner && (
                                <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }}
                                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity flex-shrink-0" style={{ color: theme.textSecondary }}>
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            {item.description && <p className="text-xs opacity-50 mt-1" style={{ color: theme.textSecondary }}>{item.description}</p>}
                            <div className="mt-2">
                              <span className="text-xs opacity-40" style={{ color: theme.textSecondary }}>{item._verName}</span>
                            </div>
                          </div>
                        )}
                        {!isEdit && <TaskOwnerControls item={item} />}
                      </div>
                    );
                  })}
                  {items.length === 0 && (
                    <div className="text-center py-8 opacity-20" style={{ color: theme.textSecondary }}>
                      <div className="text-2xl mb-1">·</div>
                      <div className="text-xs">empty</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {/* Add task forms per version below kanban */}
        {isOwner && (
          <div className="mt-6 space-y-2">
            {versions.map(ver => (
              <div key={ver.id} className="flex items-center gap-3">
                <span className="text-xs opacity-40 w-24 text-right" style={{ color: theme.textSecondary }}>{ver.version_name}</span>
                <div className="flex-1"><AddTaskForm ver={ver} statusColors={sc(ver.status)} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Magazine Layout ────────────────────────────────────────────────────────
  const renderMagazine = () => (
    <div className={sectionSpacing}>
      {versions.map((ver, idx) => {
        const colors = sc(ver.status);
        const isExp = expanded[ver.id];
        const isEven = idx % 2 === 0;
        return (
          <div key={ver.id} className="rounded-3xl overflow-hidden"
            style={{ backgroundColor: cardBg, border: `1px solid ${colors.border}15`, boxShadow: `0 8px 40px rgba(0,0,0,0.35)` }}>
            {/* Large editorial header */}
            <div className={`p-8 ${isEven ? '' : ''}`} style={{ background: `linear-gradient(${isEven ? '135deg' : '225deg'}, ${colors.border}20 0%, transparent 60%)` }}>
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full"
                      style={{ color: colors.text, backgroundColor: colors.bg, border: `1px solid ${colors.border}40` }}>
                      {ver.status.replace('_', ' ')}
                    </span>
                    {ver.status === 'completed' && ver.status_changed_at && (
                      <span className="text-xs opacity-40" style={{ color: theme.textSecondary }}>{fmtDate(ver.status_changed_at)}</span>
                    )}
                  </div>
                  <h2 className="text-3xl font-black tracking-tight leading-none mb-3" style={{ color: theme.textPrimary }}>{ver.version_name}</h2>
                  <VersionDescEditor ver={ver} statusColors={colors} />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <div className="text-3xl font-black" style={{ color: colors.border }}>{ver.items?.length || 0}</div>
                    <div className="text-xs opacity-40" style={{ color: theme.textSecondary }}>tasks</div>
                  </div>
                  <button onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}
                    className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
                    style={{ backgroundColor: colors.border + '20', color: colors.border, border: `1px solid ${colors.border}40` }}>
                    {isExp ? 'Collapse' : 'Expand'}
                  </button>
                </div>
              </div>
            </div>
            <VersionOwnerControls ver={ver} />
            {isExp && (
              <div className="px-8 pb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ver.items?.map(item => {
                    const ic = sc(item.status);
                    const isEdit = editingTaskId === item.id;
                    const StatusIcon = STATUS_ICONS[item.status] || Circle;
                    return (
                      <div key={item.id} className={`rounded-2xl ${settings.taskCardPadding || 'p-4'} group transition-all`}
                        style={{ backgroundColor: withOpacity(theme.cardBackground, 0.6), border: `1px solid ${ic.border}15` }}>
                        {isEdit ? <TaskEditForm item={item} statusColors={ic} /> : (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                              style={{ backgroundColor: ic.bg, border: `1px solid ${ic.border}40` }}>
                              <StatusIcon className="w-4 h-4" style={{ color: ic.border }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`${settings.taskTitleSize || 'text-sm'} font-semibold`} style={{ color: theme.textPrimary }}>{item.title}</p>
                              {item.description && <p className="text-xs opacity-50 mt-1 leading-relaxed" style={{ color: theme.textSecondary }}>{item.description}</p>}
                            </div>
                            {isOwner && (
                              <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }}
                                className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity" style={{ color: theme.textSecondary }}>
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
                <div className="mt-4"><AddTaskForm ver={ver} statusColors={colors} /></div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Layout switcher icons ──────────────────────────────────────────────────
  const LAYOUT_ICONS: Record<string, React.ReactNode> = {
    stacked:  <Layers className="w-3.5 h-3.5" />,
    timeline: <Clock className="w-3.5 h-3.5" />,
    terminal: <Terminal className="w-3.5 h-3.5" />,
    grid:     <Grid3X3 className="w-3.5 h-3.5" />,
    kanban:   <Zap className="w-3.5 h-3.5" />,
    magazine: <BookOpen className="w-3.5 h-3.5" />,
  };

  const LAYOUT_LABELS: Record<string, string> = {
    stacked: 'Stacked', timeline: 'Timeline', terminal: 'Terminal',
    grid: 'Grid', kanban: 'Kanban', magazine: 'Magazine',
  };

  // ── Sorted suggestions ─────────────────────────────────────────────────────
  const sortedSuggestions = [...suggestions].sort((a, b) => {
    if (sortBy === 'upvotes') return (b.upvotes || 0) - (a.upvotes || 0);
    if (sortBy === 'newest') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    if (sortBy === 'discussed') return (b.reply_count || 0) - (a.reply_count || 0);
    return 0;
  });

  const FORUM_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    open:        { bg: withOpacity(theme.statusColors.backlog, 0.2),      text: theme.statusColors.backlog,      border: theme.statusColors.backlog },
    planned:     { bg: withOpacity(theme.statusColors.in_progress, 0.2),  text: theme.statusColors.in_progress,  border: theme.statusColors.in_progress },
    in_progress: { bg: withOpacity(theme.statusColors.in_progress, 0.25), text: theme.statusColors.in_progress,  border: theme.statusColors.in_progress },
    completed:   { bg: withOpacity(theme.statusColors.completed, 0.2),    text: theme.statusColors.completed,    border: theme.statusColors.completed },
    declined:    { bg: 'rgba(239,68,68,0.15)',                             text: '#ef4444',                       border: '#ef4444' },
  };

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ ...bgStyle, fontFamily: settings.fontFamily || theme.layout.fontFamily || 'inherit' }}>
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Back button */}
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-2 mb-6 text-sm opacity-60 hover:opacity-100 transition-opacity" style={{ color: theme.textSecondary }}>
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-2">
            {storeLogo && <img src={storeLogo} alt="" className="w-10 h-10 rounded-xl object-cover" />}
            <div>
              {storeName && <p className="text-xs font-semibold tracking-widest uppercase opacity-50 mb-0.5" style={{ color: theme.textSecondary }}>{storeName}</p>}
              <h1 className={`${settings.mainTitleSize || 'text-4xl'} font-black tracking-tight`} style={{ color: theme.textPrimary }}>
                {settings.title || 'Roadmap'}
              </h1>
            </div>
          </div>
          {settings.subtitle && (
            <p className="mt-3 text-base opacity-60 max-w-2xl" style={{ color: theme.textSecondary }}>{settings.subtitle}</p>
          )}
        </div>

        {/* Owner controls panel */}
        {isOwner && (
          <div className="mb-8 rounded-2xl p-5" style={{ backgroundColor: withOpacity(theme.cardBackground, 0.5), border: `1px solid ${accent}20` }}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-widest opacity-50" style={{ color: theme.textSecondary }}>Owner</span>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Input value={newVersion} onChange={e => setNewVersion(e.target.value)}
                  placeholder="New version name..." className="h-8 text-sm rounded-lg flex-1 min-w-0"
                  style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderColor: accent + '40', color: theme.textPrimary }}
                  onKeyDown={e => e.key === 'Enter' && addVersion()} />
                <Button size="sm" onClick={addVersion} className="h-8 px-3 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: accent, color: '#000' }}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Version
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleVotingSettings('voting_enabled', !itemVotingEnabled)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all"
                  style={{ backgroundColor: itemVotingEnabled ? accent + '20' : 'rgba(0,0,0,0.2)', color: itemVotingEnabled ? accent : theme.textSecondary, border: `1px solid ${itemVotingEnabled ? accent + '40' : 'transparent'}` }}>
                  <Vote className="w-3 h-3" /> Voting {itemVotingEnabled ? 'On' : 'Off'}
                </button>
                {itemVotingEnabled && (
                  <button onClick={() => toggleVotingSettings('sort_by_votes', !itemSortByVotes)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all"
                    style={{ backgroundColor: itemSortByVotes ? accent + '20' : 'rgba(0,0,0,0.2)', color: itemSortByVotes ? accent : theme.textSecondary, border: `1px solid ${itemSortByVotes ? accent + '40' : 'transparent'}` }}>
                    <ArrowUp className="w-3 h-3" /> Sort by votes
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Layout switcher */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {Object.keys(LAYOUT_ICONS).map(lk => (
            <button key={lk} onClick={() => {/* layout is from settings, read-only here — owner changes via settings panel */}}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all"
              style={{
                backgroundColor: layout === lk ? accent + '25' : withOpacity(theme.cardBackground, 0.4),
                color: layout === lk ? accent : theme.textSecondary,
                border: `1px solid ${layout === lk ? accent + '50' : 'transparent'}`,
                cursor: 'default',
              }}>
              {LAYOUT_ICONS[lk]}
              <span className="hidden sm:inline">{LAYOUT_LABELS[lk]}</span>
            </button>
          ))}
        </div>

        {/* Versions — dispatch to layout */}
        {versions.length === 0 ? (
          <div className="text-center py-20 opacity-30" style={{ color: theme.textSecondary }}>
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-semibold">No versions yet</p>
            {isOwner && <p className="text-sm mt-1">Add a version above to get started</p>}
          </div>
        ) : (
          <>
            {layout === 'timeline' && renderTimeline()}
            {layout === 'terminal' && renderTerminal()}
            {layout === 'grid'     && renderGrid()}
            {layout === 'kanban'   && renderKanban()}
            {layout === 'magazine' && renderMagazine()}
            {(layout === 'stacked' || !layout) && renderStacked()}
          </>
        )}

        {/* Suggestions section */}
        {settings.showSuggestions !== false && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Lightbulb className="w-5 h-5" style={{ color: accent }} />
                <h2 className="text-xl font-bold" style={{ color: theme.textPrimary }}>Suggestions</h2>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: accent + '20', color: accent }}>{suggestions.length}</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Sort controls */}
                {(['upvotes','newest','discussed'] as const).map(s => (
                  <button key={s} onClick={() => setSortBy(s)}
                    className="text-xs px-3 py-1.5 rounded-full transition-all capitalize"
                    style={{ backgroundColor: sortBy === s ? accent + '20' : withOpacity(theme.cardBackground, 0.4), color: sortBy === s ? accent : theme.textSecondary, border: `1px solid ${sortBy === s ? accent + '40' : 'transparent'}` }}>
                    {s}
                  </button>
                ))}
                <button onClick={() => setShowModal(true)}
                  className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-full font-semibold transition-all"
                  style={{ backgroundColor: accent, color: '#000' }}>
                  <Plus className="w-3.5 h-3.5" /> Suggest
                </button>
              </div>
            </div>

            {sortedSuggestions.length === 0 ? (
              <div className="text-center py-12 opacity-30" style={{ color: theme.textSecondary }}>
                <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No suggestions yet — be the first</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedSuggestions.map(sug => {
                  const fsc = FORUM_STATUS_COLORS[sug.forum_status || 'open'] || FORUM_STATUS_COLORS.open;
                  return (
                    <div key={sug.id} className="rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.005]"
                      style={{ backgroundColor: cardBg, border: `1px solid ${accent}15`, boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}
                      onClick={() => { setSelectedSuggestion(sug); fetchReplies(sug.id); }}>
                      <div className="flex items-start gap-4">
                        {/* Upvote */}
                        <button className="flex flex-col items-center gap-0.5 flex-shrink-0 pt-0.5"
                          onClick={e => { e.stopPropagation(); toggleUpvote(sug.id, sug.user_upvoted || false); }}>
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                            style={{ backgroundColor: sug.user_upvoted ? accent + '25' : withOpacity(theme.cardBackground, 0.6), border: `1px solid ${sug.user_upvoted ? accent + '60' : accent + '20'}` }}>
                            <ThumbsUp className="w-3.5 h-3.5" style={{ color: sug.user_upvoted ? accent : theme.textSecondary }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color: sug.user_upvoted ? accent : theme.textSecondary }}>{sug.upvotes || 0}</span>
                        </button>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{sug.title}</h3>
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: fsc.bg, color: fsc.text, border: `1px solid ${fsc.border}40` }}>
                              {(sug.forum_status || 'open').replace('_', ' ')}
                            </span>
                          </div>
                          {sug.description && <p className="text-xs opacity-60 line-clamp-2" style={{ color: theme.textSecondary }}>{sug.description}</p>}
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs opacity-40" style={{ color: theme.textSecondary }}>{sug.author?.display_name || 'Anonymous'}</span>
                            <span className="text-xs opacity-30" style={{ color: theme.textSecondary }}>·</span>
                            <span className="text-xs opacity-40" style={{ color: theme.textSecondary }}>{fmtRelative(sug.created_at)}</span>
                            <span className="text-xs opacity-30" style={{ color: theme.textSecondary }}>·</span>
                            <span className="flex items-center gap-1 text-xs opacity-40" style={{ color: theme.textSecondary }}>
                              <MessageCircle className="w-3 h-3" />{sug.reply_count || 0}
                            </span>
                          </div>
                        </div>
                        {/* Owner controls */}
                        {isOwner && (
                          <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                            <select value={sug.forum_status || 'open'} onChange={e => updateSuggestionStatus(sug.id, e.target.value)}
                              className="text-xs rounded-lg px-2 py-1 border-0 outline-none"
                              style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: theme.textSecondary }}>
                              {['open','planned','in_progress','completed','declined'].map(s => (
                                <option key={s} value={s}>{s.replace('_',' ')}</option>
                              ))}
                            </select>
                            <button onClick={() => deleteSuggestion(sug.id)} className="p-1 opacity-40 hover:opacity-100 transition-opacity" style={{ color: '#ef4444' }}>
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Suggestion thread drawer */}
      {selectedSuggestion && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-lg rounded-3xl flex flex-col max-h-[85vh]"
            style={{ backgroundColor: theme.backgroundColor, border: `1px solid ${accent}20`, boxShadow: `0 24px 80px rgba(0,0,0,0.6)` }}>
            {/* Thread header */}
            <div className="p-6 border-b flex items-start justify-between gap-4" style={{ borderColor: accent + '15' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: FORUM_STATUS_COLORS[selectedSuggestion.forum_status || 'open']?.bg, color: FORUM_STATUS_COLORS[selectedSuggestion.forum_status || 'open']?.text }}>
                    {(selectedSuggestion.forum_status || 'open').replace('_', ' ')}
                  </span>
                  <span className="text-xs opacity-40" style={{ color: theme.textSecondary }}>{fmtRelative(selectedSuggestion.created_at)}</span>
                </div>
                <h3 className="text-lg font-bold" style={{ color: theme.textPrimary }}>{selectedSuggestion.title}</h3>
                {selectedSuggestion.description && <p className="text-sm opacity-60 mt-1" style={{ color: theme.textSecondary }}>{selectedSuggestion.description}</p>}
              </div>
              <button onClick={() => { setSelectedSuggestion(null); setSuggestionReplies([]); }}
                className="p-2 rounded-xl opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
                style={{ backgroundColor: withOpacity(theme.cardBackground, 0.5), color: theme.textSecondary }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Replies */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingReplies ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: accent }} /></div>
              ) : suggestionReplies.length === 0 ? (
                <div className="text-center py-8 opacity-30" style={{ color: theme.textSecondary }}>
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No replies yet</p>
                </div>
              ) : (
                suggestionReplies.map(reply => (
                  <div key={reply.id} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ backgroundColor: reply.is_creator ? accent + '30' : withOpacity(theme.cardBackground, 0.6), color: reply.is_creator ? accent : theme.textSecondary, border: `1px solid ${reply.is_creator ? accent + '40' : 'transparent'}` }}>
                      {reply.author?.display_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold" style={{ color: theme.textPrimary }}>{reply.author?.display_name || 'Anonymous'}</span>
                        {reply.is_creator && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: accent + '20', color: accent }}>creator</span>}
                        <span className="text-xs opacity-40" style={{ color: theme.textSecondary }}>{fmtRelative(reply.created_at)}</span>
                      </div>
                      <p className="text-sm" style={{ color: theme.textSecondary }}>{reply.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Reply input */}
            {user && (
              <div className="p-4 border-t flex gap-3" style={{ borderColor: accent + '15' }}>
                <Input value={replyContent} onChange={e => setReplyContent(e.target.value)}
                  placeholder="Write a reply..." className="flex-1 rounded-xl text-sm"
                  style={{ backgroundColor: withOpacity(theme.cardBackground, 0.5), borderColor: accent + '30', color: theme.textPrimary }}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitReply()} />
                <Button size="sm" onClick={submitReply} disabled={!replyContent.trim() || submitting}
                  className="rounded-xl px-4" style={{ backgroundColor: accent, color: '#000' }}>
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New suggestion modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-3xl p-6"
            style={{ backgroundColor: theme.backgroundColor, border: `1px solid ${accent}20`, boxShadow: `0 24px 80px rgba(0,0,0,0.6)` }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ color: theme.textPrimary }}>New Suggestion</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-xl opacity-60 hover:opacity-100 transition-opacity"
                style={{ backgroundColor: withOpacity(theme.cardBackground, 0.5), color: theme.textSecondary }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-xs mb-1.5 block opacity-60" style={{ color: theme.textSecondary }}>Title</Label>
                <Input value={suggestionTitle} onChange={e => setSuggestionTitle(e.target.value)}
                  placeholder="What would you like to see?" className="rounded-xl"
                  style={{ backgroundColor: withOpacity(theme.cardBackground, 0.5), borderColor: accent + '30', color: theme.textPrimary }} />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block opacity-60" style={{ color: theme.textSecondary }}>Description (optional)</Label>
                <Textarea value={suggestionDesc} onChange={e => setSuggestionDesc(e.target.value)}
                  placeholder="More details..." rows={3} className="rounded-xl resize-none"
                  style={{ backgroundColor: withOpacity(theme.cardBackground, 0.5), borderColor: accent + '30', color: theme.textPrimary }} />
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1 rounded-xl"
                  style={{ borderColor: accent + '30', color: theme.textSecondary }}>Cancel</Button>
                <Button onClick={submitSuggestion} disabled={!suggestionTitle.trim() || submitting} className="flex-1 rounded-xl font-semibold"
                  style={{ backgroundColor: accent, color: '#000' }}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-3.5 h-3.5 mr-1.5" /> Submit</>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoadmapPage;
