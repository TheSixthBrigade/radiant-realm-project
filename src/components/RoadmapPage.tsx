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
  Edit2, MessageCircle, ArrowLeft, ArrowUp, Vote,
} from 'lucide-react';
import { toast } from 'sonner';
import { RoadmapSettings, getTheme } from '@/lib/roadmapThemes';

interface RoadmapVersion {
  id: string; creator_id: string; version_name: string; description?: string;
  status: string; sort_order: number; is_expanded: boolean;
  status_changed_at?: string; created_at?: string; items?: RoadmapItem[];
}
interface RoadmapItem {
  id: string; version_id: string; title: string; description?: string;
  status: string; sort_order: number; status_changed_at?: string; created_at?: string;
  vote_count?: number; user_has_voted?: boolean; voting_enabled?: boolean;
}
interface SuggestionAuthor { id: string; display_name?: string; avatar_url?: string; }
interface RoadmapSuggestion {
  id: string; creator_id: string; user_id: string; title: string; description?: string;
  upvotes: number; user_upvoted?: boolean;
  forum_status?: 'open' | 'planned' | 'in_progress' | 'completed' | 'declined';
  status_changed_at?: string; created_at?: string; reply_count?: number; author?: SuggestionAuthor;
}
interface SuggestionReply {
  id: string; suggestion_id: string; user_id: string; content: string;
  created_at: string; updated_at?: string; author?: SuggestionAuthor; is_creator?: boolean;
}
interface GlobalBackgroundSettings {
  enabled?: boolean; type?: 'solid' | 'gradient' | 'image';
  color?: string; gradientStart?: string; gradientEnd?: string; image?: string; overlay?: number;
}
interface RoadmapPageProps {
  creatorId: string; isOwner: boolean; settings: RoadmapSettings;
  storeName?: string; storeLogo?: string; productId?: string; onBack?: () => void;
  votingEnabled?: boolean; sortByVotes?: boolean; storeSlug?: string;
  globalBackground?: GlobalBackgroundSettings;
}

function hexToRgba(hex: string, opacity: number): string {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return `rgba(128,128,128,${opacity})`;
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${opacity})`;
}
function withOpacity(color: string, opacity: number): string {
  if (!color) return `rgba(128,128,128,${opacity})`;
  if (color.startsWith('#')) return hexToRgba(color, opacity);
  if (color.includes('rgba')) {
    const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) return `rgba(${m[1]},${m[2]},${m[3]},${opacity})`;
  }
  return color;
}
const STATUS_ICONS: Record<string, React.ElementType> = {
  backlog: Circle, in_progress: PlayCircle, qa: TestTube2, completed: CheckCircle2,
};

export const RoadmapPage = ({
  creatorId, isOwner, settings, storeName, storeLogo, productId,
  onBack, votingEnabled = false, sortByVotes = false, globalBackground,
}: RoadmapPageProps) => {
  const { user } = useAuth();
  const theme = getTheme(settings);
  const accent = theme.accent, bg = theme.bg, surface = theme.surface;
  const border = theme.border, text = theme.text, textMuted = theme.textMuted;

  const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    backlog:     { bg: withOpacity(theme.status.backlog, 0.25),     border: theme.status.backlog,     text: theme.status.backlog },
    in_progress: { bg: withOpacity(theme.status.in_progress, 0.25), border: theme.status.in_progress, text: theme.status.in_progress },
    qa:          { bg: withOpacity(theme.status.qa, 0.25),          border: theme.status.qa,          text: theme.status.qa },
    completed:   { bg: withOpacity(theme.status.completed, 0.25),   border: theme.status.completed,   text: theme.status.completed },
  };
  const sc = (status: string) => STATUS_COLORS[status] || STATUS_COLORS.backlog;

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
  const [spotlightIdx, setSpotlightIdx] = useState(0);
  const [accordionOpen, setAccordionOpen] = useState<Record<string, boolean>>({});
  const [sidebarActiveId, setSidebarActiveId] = useState<string>('');

  const fmtRelative = (d?: string) => {
    if (!d) return '';
    const ms = Date.now() - new Date(d).getTime();
    const m = Math.floor(ms/60000), h = Math.floor(ms/3600000), day = Math.floor(ms/86400000);
    if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`; if (day < 7) return `${day}d ago`;
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
      if (combined.length > 0 && !sidebarActiveId) setSidebarActiveId(combined[0].id);
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
      bgStyle = { background: theme.bgGradient || `linear-gradient(135deg, ${settings.customBackgroundGradientStart} 0%, ${settings.customBackgroundGradientEnd} 100%)` };
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

  // ── Shared sub-components ────────────────────────────────────────────────

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
          className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${item.voting_enabled !== false ? 'bg-green-900/40 text-green-500 border border-green-800' : 'bg-neutral-800 text-neutral-500 border border-neutral-700'}`}>
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
      <button onClick={() => deleteItem(item.id)} className="text-red-600 hover:text-red-400 p-0.5"><X className="w-3.5 h-3.5" /></button>
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
          className="w-full p-2.5 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-70 mt-3"
          style={{ borderColor: statusColors.border + '40', color: textMuted }}>
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
        {ver.description && <p className="mt-2 text-sm opacity-60" style={{ color: textMuted }}>{ver.description}</p>}
        {isOwner && (
          <button onClick={() => { setEditingVersionId(ver.id); setEditingVersionDesc(ver.description || ''); }}
            className="mt-1 text-xs flex items-center gap-1 opacity-30 hover:opacity-70 transition-opacity" style={{ color: textMuted }}>
            <Edit2 className="w-3 h-3" />{ver.description ? 'Edit description' : 'Add description'}
          </button>
        )}
      </>
    )
  );

  const VersionOwnerControls = ({ ver }: { ver: RoadmapVersion }) => {
    const colors = sc(ver.status);
    return isOwner && expanded[ver.id] ? (
      <div className="flex gap-2 px-6 pb-3 border-t pt-3" style={{ borderColor: colors.border + '20' }}>
        <select value={ver.status} onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)}
          className="rounded-lg px-3 py-1.5 text-sm border"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: text, borderColor: colors.border }}>
          <option value="backlog">Backlog</option>
          <option value="in_progress">In Progress</option>
          <option value="qa">QA</option>
          <option value="completed">Completed</option>
        </select>
        <Button size="sm" variant="ghost" onClick={() => deleteVersion(ver.id)} className="text-red-600 hover:text-red-400">Delete</Button>
      </div>
    ) : null;
  };

  // ── LAYOUT: GHOST — pure text list, no cards ─────────────────────────────
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
                <div className="w-2 h-2 rounded-full flex-shrink-0 transition-all" style={{ backgroundColor: colors.border, boxShadow: isExp ? `0 0 6px ${colors.border}` : 'none' }} />
                <span className={`${settings.versionTitleSize || 'text-xl'} font-semibold tracking-tight`} style={{ color: text }}>{ver.version_name}</span>
                <span className="text-xs font-mono uppercase tracking-widest opacity-60" style={{ color: colors.border }}>{ver.status.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono opacity-25" style={{ color: textMuted }}>{ver.items?.length || 0}</span>
                {isExp ? <ChevronUp className="w-4 h-4 opacity-30" style={{ color: textMuted }} /> : <ChevronDown className="w-4 h-4 opacity-30" style={{ color: textMuted }} />}
              </div>
            </button>
            {isOwner && isExp && (
              <div className="flex gap-2 pb-3 pl-6">
                <select value={ver.status} onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)}
                  className="rounded px-2 py-1 text-xs border" style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: text, borderColor: border }}>
                  <option value="backlog">Backlog</option><option value="in_progress">In Progress</option>
                  <option value="qa">QA</option><option value="completed">Completed</option>
                </select>
                <Button size="sm" variant="ghost" onClick={() => deleteVersion(ver.id)} className="text-red-600 text-xs">Delete</Button>
              </div>
            )}
            {isExp && (
              <div className="pl-6 pb-6">
                <VersionDescEditor ver={ver} statusColors={colors} />
                <div className="mt-4 space-y-0">
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
                            <span className="text-xs font-mono opacity-35 flex-shrink-0" style={{ color: ic.border }}>{item.status.replace('_', ' ')}</span>
                            {isOwner && (
                              <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }}
                                className="opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: textMuted }}>
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

  // ── LAYOUT: KANBAN — status columns board ────────────────────────────────
  const renderKanban = () => {
    const columns = [
      { key: 'backlog', label: 'Backlog' },
      { key: 'in_progress', label: 'In Progress' },
      { key: 'qa', label: 'QA' },
      { key: 'completed', label: 'Done' },
    ] as const;
    const allItems = versions.flatMap(ver => (ver.items || []).map(item => ({ ...item, _verName: ver.version_name })));
    return (
      <div className="overflow-x-auto pb-4" style={{ fontFamily: theme.font }}>
        <div className="flex gap-3 min-w-max">
          {columns.map(col => {
            const cc = sc(col.key);
            const items = allItems.filter(i => i.status === col.key);
            return (
              <div key={col.key} className="w-68 flex-shrink-0 rounded-xl flex flex-col" style={{ width: '272px', backgroundColor: withOpacity(surface, 0.4), border: `1px solid ${cc.border}20` }}>
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${cc.border}30` }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cc.border }} />
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: cc.border }}>{col.label}</span>
                  </div>
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: cc.bg, color: cc.text }}>{items.length}</span>
                </div>
                <div className="flex-1 p-3 space-y-2 min-h-32">
                  {items.map(item => {
                    const ic = sc(item.status);
                    return (
                      <div key={item.id} className="group rounded-lg p-3" style={{ backgroundColor: withOpacity(surface, 0.8), border: `1px solid ${border}` }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-snug" style={{ color: text }}>{item.title}</p>
                            {item._verName && <p className="text-xs mt-1 opacity-40" style={{ color: textMuted }}>{item._verName}</p>}
                          </div>
                          {isOwner && (
                            <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }}
                              className="opacity-0 group-hover:opacity-50 flex-shrink-0" style={{ color: textMuted }}>
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {editingTaskId === item.id && <div className="mt-2"><TaskEditForm item={item} statusColors={ic} /></div>}
                        {itemVotingEnabled && item.voting_enabled !== false && (
                          <button onClick={() => toggleItemVote(item.id, item.user_has_voted || false)}
                            className="mt-2 flex items-center gap-1 text-xs transition-all"
                            style={{ color: item.user_has_voted ? accent : textMuted }}>
                            <ArrowUp className="w-3 h-3" />{item.vote_count || 0}
                          </button>
                        )}
                        {isOwner && (
                          <div className="mt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <select value={item.status} onChange={e => updateStatus('roadmap_items', item.id, e.target.value)}
                              className="rounded px-1.5 py-0.5 text-xs border flex-1"
                              style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: text, borderColor: border }}>
                              <option value="backlog">Backlog</option><option value="in_progress">In Progress</option>
                              <option value="qa">QA</option><option value="completed">Completed</option>
                            </select>
                            <button onClick={() => deleteItem(item.id)} className="text-red-600 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        {isOwner && (
          <div className="mt-6 flex gap-3 items-center">
            <Input value={newVersion} onChange={e => setNewVersion(e.target.value)} placeholder="New version name..."
              className="max-w-xs" style={{ backgroundColor: withOpacity(surface, 0.5), borderColor: border, color: text }} />
            <Button onClick={addVersion} disabled={!newVersion.trim()} style={{ backgroundColor: accent, color: '#fff' }}>
              <Plus className="w-4 h-4 mr-1" />Add Version
            </Button>
          </div>
        )}
      </div>
    );
  };

  // ── LAYOUT: TIMELINE — vertical spine, alternating sides ─────────────────
  const renderTimeline = () => (
    <div className="relative" style={{ fontFamily: theme.font }}>
      <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2" style={{ background: `linear-gradient(180deg, transparent, ${accent}40 10%, ${accent}40 90%, transparent)` }} />
      <div className={sectionSpacing}>
        {versions.map((ver, idx) => {
          const colors = sc(ver.status);
          const isLeft = idx % 2 === 0;
          const isExp = expanded[ver.id];
          return (
            <div key={ver.id} className={`flex items-start gap-8 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
              <div className="flex-1">
                <div className="rounded-xl p-5 transition-all" style={{ backgroundColor: cardBg, border: `1px solid ${colors.border}25`, backdropFilter: 'blur(8px)' }}>
                  <button className="w-full text-left" onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono uppercase tracking-widest mb-1 block" style={{ color: colors.border }}>{ver.status.replace('_', ' ')}</span>
                        <h3 className={`${settings.versionTitleSize || 'text-lg'} font-semibold`} style={{ color: text }}>{ver.version_name}</h3>
                      </div>
                      {isExp ? <ChevronUp className="w-4 h-4 opacity-30" style={{ color: textMuted }} /> : <ChevronDown className="w-4 h-4 opacity-30" style={{ color: textMuted }} />}
                    </div>
                  </button>
                  {isExp && (
                    <div className="mt-4">
                      <VersionDescEditor ver={ver} statusColors={colors} />
                      {isOwner && (
                        <div className="flex gap-2 mt-3 mb-3">
                          <select value={ver.status} onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)}
                            className="rounded px-2 py-1 text-xs border" style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: text, borderColor: border }}>
                            <option value="backlog">Backlog</option><option value="in_progress">In Progress</option>
                            <option value="qa">QA</option><option value="completed">Completed</option>
                          </select>
                          <Button size="sm" variant="ghost" onClick={() => deleteVersion(ver.id)} className="text-red-600 text-xs">Delete</Button>
                        </div>
                      )}
                      <div className="space-y-2 mt-3">
                        {ver.items?.map(item => {
                          const ic = sc(item.status);
                          return (
                            <div key={item.id} className="group flex items-start gap-3 p-2.5 rounded-lg" style={{ backgroundColor: withOpacity(surface, 0.5), border: `1px solid ${border}` }}>
                              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: ic.border }} />
                              <div className="flex-1 min-w-0">
                                {editingTaskId === item.id ? <TaskEditForm item={item} statusColors={ic} /> : (
                                  <>
                                    <span className="text-sm" style={{ color: item.status === 'completed' ? textMuted : text, textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>{item.title}</span>
                                    {item.description && <p className="text-xs opacity-40 mt-0.5" style={{ color: textMuted }}>{item.description}</p>}
                                  </>
                                )}
                              </div>
                              {isOwner && editingTaskId !== item.id && (
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }} style={{ color: textMuted }}><Edit2 className="w-3 h-3" /></button>
                                  <button onClick={() => deleteItem(item.id)} className="text-red-600"><X className="w-3 h-3" /></button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <AddTaskForm ver={ver} statusColors={colors} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 flex flex-col items-center" style={{ width: '32px' }}>
                <div className="w-4 h-4 rounded-full border-2 mt-5 transition-all" style={{ backgroundColor: isExp ? colors.border : bg, borderColor: colors.border, boxShadow: isExp ? `0 0 10px ${colors.border}60` : 'none' }} />
              </div>
              <div className="flex-1" />
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── LAYOUT: TERMINAL — fake CLI output, no cards ─────────────────────────
  const renderTerminal = () => (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#000', border: '1px solid #1a1a1a', fontFamily: theme.font }}>
      <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: '#111', borderBottom: '1px solid #1a1a1a' }}>
        <div className="w-3 h-3 rounded-full bg-red-900" /><div className="w-3 h-3 rounded-full bg-yellow-900" /><div className="w-3 h-3 rounded-full bg-green-900" />
        <span className="text-xs ml-2 opacity-40" style={{ color: theme.text }}>roadmap.sh</span>
      </div>
      <div className="p-6 space-y-6">
        <div>
          <span style={{ color: theme.textMuted }}>$ </span>
          <span style={{ color: theme.accent }}>roadmap</span>
          <span style={{ color: theme.text }}> --list-versions</span>
        </div>
        {versions.map((ver, vi) => {
          const colors = sc(ver.status);
          const isExp = expanded[ver.id];
          const statusSym = ver.status === 'completed' ? '[✓]' : ver.status === 'in_progress' ? '[~]' : ver.status === 'qa' ? '[?]' : '[ ]';
          return (
            <div key={ver.id}>
              <button className="w-full text-left" onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
                <div className="flex items-center gap-3">
                  <span style={{ color: theme.textMuted }}>{String(vi + 1).padStart(2, '0')}.</span>
                  <span style={{ color: colors.border }}>{statusSym}</span>
                  <span className="font-bold" style={{ color: theme.text }}>{ver.version_name}</span>
                  <span className="text-xs opacity-50" style={{ color: theme.textMuted }}>({ver.items?.length || 0} tasks)</span>
                </div>
              </button>
              {isExp && (
                <div className="mt-2 ml-8 space-y-1">
                  {ver.description && <p className="text-xs opacity-50 mb-2" style={{ color: theme.textMuted }}># {ver.description}</p>}
                  {isOwner && (
                    <div className="flex gap-2 mb-2">
                      <select value={ver.status} onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)}
                        className="rounded px-2 py-0.5 text-xs border" style={{ backgroundColor: '#111', color: theme.text, borderColor: '#333' }}>
                        <option value="backlog">backlog</option><option value="in_progress">in_progress</option>
                        <option value="qa">qa</option><option value="completed">completed</option>
                      </select>
                      <button onClick={() => deleteVersion(ver.id)} className="text-xs opacity-50 hover:opacity-100" style={{ color: '#f87171' }}>rm -rf</button>
                    </div>
                  )}
                  {ver.items?.map((item, ii) => {
                    const ic = sc(item.status);
                    const sym = item.status === 'completed' ? '[✓]' : item.status === 'in_progress' ? '[~]' : item.status === 'qa' ? '[?]' : '[ ]';
                    return (
                      <div key={item.id} className="group flex items-start gap-2">
                        <span className="text-xs opacity-30" style={{ color: theme.textMuted }}>{String(ii + 1).padStart(2, '0')}.</span>
                        <span className="text-xs" style={{ color: ic.border }}>{sym}</span>
                        <div className="flex-1">
                          {editingTaskId === item.id ? <TaskEditForm item={item} statusColors={ic} /> : (
                            <span className="text-sm" style={{ color: item.status === 'completed' ? theme.textMuted : theme.text, textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>{item.title}</span>
                          )}
                        </div>
                        {isOwner && editingTaskId !== item.id && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }} style={{ color: theme.textMuted }}><Edit2 className="w-3 h-3" /></button>
                            <button onClick={() => deleteItem(item.id)} style={{ color: '#f87171' }}><X className="w-3 h-3" /></button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {isOwner && addingTo === ver.id ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span style={{ color: theme.textMuted }}>$ touch </span>
                      <Input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="task-name"
                        className="flex-1 h-6 text-sm" style={{ backgroundColor: 'transparent', borderColor: '#333', color: theme.text }} autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') addItem(ver.id); if (e.key === 'Escape') { setAddingTo(null); setNewItem(''); } }} />
                      <button onClick={() => addItem(ver.id)} style={{ color: theme.accent }}>↵</button>
                      <button onClick={() => { setAddingTo(null); setNewItem(''); }} style={{ color: theme.textMuted }}>✕</button>
                    </div>
                  ) : isOwner ? (
                    <button onClick={() => setAddingTo(ver.id)} className="text-xs opacity-30 hover:opacity-70 mt-1" style={{ color: theme.textMuted }}>$ touch new-task</button>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
        <div className="flex items-center gap-2">
          <span style={{ color: theme.textMuted }}>$ </span>
          <span className="w-2 h-4 animate-pulse" style={{ backgroundColor: theme.accent }} />
        </div>
      </div>
    </div>
  );

  // ── LAYOUT: SPOTLIGHT — one version at a time, full hero ─────────────────
  const renderSpotlight = () => {
    const ver = versions[spotlightIdx];
    if (!ver) return <div style={{ color: textMuted, fontFamily: theme.font }}>No versions yet.</div>;
    const colors = sc(ver.status);
    const completedCount = ver.items?.filter(i => i.status === 'completed').length || 0;
    const totalCount = ver.items?.length || 0;
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    return (
      <div style={{ fontFamily: theme.font }}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-2">
            {versions.map((v, i) => (
              <button key={v.id} onClick={() => setSpotlightIdx(i)}
                className="w-2 h-2 rounded-full transition-all"
                style={{ backgroundColor: i === spotlightIdx ? accent : withOpacity(accent, 0.25), transform: i === spotlightIdx ? 'scale(1.4)' : 'scale(1)' }} />
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setSpotlightIdx(i => Math.max(0, i - 1))} disabled={spotlightIdx === 0}
              className="px-4 py-1.5 rounded-lg text-sm transition-all disabled:opacity-20"
              style={{ backgroundColor: withOpacity(surface, 0.6), color: text, border: `1px solid ${border}` }}>← Prev</button>
            <button onClick={() => setSpotlightIdx(i => Math.min(versions.length - 1, i + 1))} disabled={spotlightIdx === versions.length - 1}
              className="px-4 py-1.5 rounded-lg text-sm transition-all disabled:opacity-20"
              style={{ backgroundColor: withOpacity(surface, 0.6), color: text, border: `1px solid ${border}` }}>Next →</button>
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${colors.border}30`, backgroundColor: cardBg, backdropFilter: 'blur(12px)' }}>
          <div className="p-8 pb-6" style={{ background: `linear-gradient(135deg, ${withOpacity(colors.border, 0.08)} 0%, transparent 60%)` }}>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest mb-3 block" style={{ color: colors.border }}>{ver.status.replace('_', ' ')}</span>
                <h2 className="text-4xl font-bold mb-2" style={{ color: text }}>{ver.version_name}</h2>
                {ver.description && <p className="text-base opacity-60 mt-2" style={{ color: textMuted }}>{ver.description}</p>}
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold tabular-nums" style={{ color: accent }}>{pct}<span className="text-2xl">%</span></div>
                <div className="text-xs mt-1" style={{ color: textMuted }}>{completedCount}/{totalCount} done</div>
              </div>
            </div>
            <div className="mt-6 h-1 rounded-full overflow-hidden" style={{ backgroundColor: withOpacity(accent, 0.15) }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: accent }} />
            </div>
          </div>
          {isOwner && (
            <div className="flex gap-2 px-8 py-3" style={{ borderBottom: `1px solid ${border}` }}>
              <select value={ver.status} onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)}
                className="rounded px-2 py-1 text-xs border" style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: text, borderColor: border }}>
                <option value="backlog">Backlog</option><option value="in_progress">In Progress</option>
                <option value="qa">QA</option><option value="completed">Completed</option>
              </select>
              <Button size="sm" variant="ghost" onClick={() => deleteVersion(ver.id)} className="text-red-600 text-xs">Delete</Button>
            </div>
          )}
          <div className="p-8 pt-6 space-y-2">
            {ver.items?.map(item => {
              const ic = sc(item.status);
              return (
                <div key={item.id} className="group flex items-start gap-4 p-3 rounded-xl transition-all hover:bg-white/5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: ic.bg, border: `1px solid ${ic.border}` }}>
                    {item.status === 'completed' && <CheckCircle2 className="w-3 h-3" style={{ color: ic.border }} />}
                    {item.status === 'in_progress' && <PlayCircle className="w-3 h-3" style={{ color: ic.border }} />}
                    {item.status === 'qa' && <TestTube2 className="w-3 h-3" style={{ color: ic.border }} />}
                    {item.status === 'backlog' && <Circle className="w-3 h-3" style={{ color: ic.border }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingTaskId === item.id ? <TaskEditForm item={item} statusColors={ic} /> : (
                      <>
                        <span className="text-sm font-medium" style={{ color: item.status === 'completed' ? textMuted : text, textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>{item.title}</span>
                        {item.description && <p className="text-xs opacity-40 mt-0.5" style={{ color: textMuted }}>{item.description}</p>}
                      </>
                    )}
                  </div>
                  {itemVotingEnabled && item.voting_enabled !== false && (
                    <button onClick={() => toggleItemVote(item.id, item.user_has_voted || false)}
                      className="flex items-center gap-1 text-xs transition-all flex-shrink-0"
                      style={{ color: item.user_has_voted ? accent : textMuted }}>
                      <ArrowUp className="w-3 h-3" />{item.vote_count || 0}
                    </button>
                  )}
                  {isOwner && editingTaskId !== item.id && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }} style={{ color: textMuted }}><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteItem(item.id)} className="text-red-600"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
              );
            })}
            <AddTaskForm ver={ver} statusColors={colors} />
          </div>
        </div>
      </div>
    );
  };

  // ── LAYOUT: BENTO — CSS grid mosaic, varying tile sizes ──────────────────
  const renderBento = () => (
    <div style={{ fontFamily: theme.font }}>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {versions.map((ver, idx) => {
          const colors = sc(ver.status);
          const isWide = idx % 5 === 0 || idx % 5 === 3;
          const isTall = idx % 7 === 1;
          const completedCount = ver.items?.filter(i => i.status === 'completed').length || 0;
          const pct = ver.items?.length ? Math.round((completedCount / ver.items.length) * 100) : 0;
          return (
            <div key={ver.id} className="rounded-2xl p-5 flex flex-col transition-all hover:scale-[1.01]"
              style={{ gridColumn: isWide ? 'span 2' : 'span 1', gridRow: isTall ? 'span 2' : 'span 1', backgroundColor: cardBg, border: `1px solid ${colors.border}20`, backdropFilter: 'blur(8px)', minHeight: '160px' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="w-2 h-2 rounded-full mb-2" style={{ backgroundColor: colors.border }} />
                  <h3 className="font-semibold text-base leading-tight" style={{ color: text }}>{ver.version_name}</h3>
                  <span className="text-xs font-mono uppercase tracking-wider mt-1 block opacity-60" style={{ color: colors.border }}>{ver.status.replace('_', ' ')}</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold tabular-nums" style={{ color: withOpacity(colors.border, 0.7) }}>{pct}%</span>
                </div>
              </div>
              <div className="h-0.5 rounded-full mb-3" style={{ backgroundColor: withOpacity(colors.border, 0.15) }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: colors.border }} />
              </div>
              {ver.description && <p className="text-xs opacity-50 mb-3" style={{ color: textMuted }}>{ver.description}</p>}
              <div className="flex-1 space-y-1.5">
                {(expanded[ver.id] ? ver.items : ver.items?.slice(0, isWide ? 4 : 2))?.map(item => {
                  const ic = sc(item.status);
                  return (
                    <div key={item.id} className="group flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ic.border }} />
                      <span className="text-xs flex-1 truncate" style={{ color: item.status === 'completed' ? textMuted : text, textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>{item.title}</span>
                      {isOwner && (
                        <button onClick={() => deleteItem(item.id)} className="opacity-0 group-hover:opacity-60 text-red-600"><X className="w-3 h-3" /></button>
                      )}
                    </div>
                  );
                })}
                {(ver.items?.length || 0) > (isWide ? 4 : 2) && !expanded[ver.id] && (
                  <button onClick={() => setExpanded(p => ({ ...p, [ver.id]: true }))} className="text-xs opacity-40 hover:opacity-70" style={{ color: textMuted }}>
                    +{(ver.items?.length || 0) - (isWide ? 4 : 2)} more
                  </button>
                )}
              </div>
              {isOwner && (
                <div className="mt-3 flex gap-1 pt-3" style={{ borderTop: `1px solid ${border}` }}>
                  <select value={ver.status} onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)}
                    className="rounded px-1.5 py-0.5 text-xs border flex-1"
                    style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: text, borderColor: border }}>
                    <option value="backlog">Backlog</option><option value="in_progress">In Progress</option>
                    <option value="qa">QA</option><option value="completed">Completed</option>
                  </select>
                  <button onClick={() => setAddingTo(addingTo === ver.id ? null : ver.id)} style={{ color: accent }}><Plus className="w-4 h-4" /></button>
                  <button onClick={() => deleteVersion(ver.id)} className="text-red-600"><X className="w-4 h-4" /></button>
                </div>
              )}
              {addingTo === ver.id && isOwner && (
                <div className="mt-2 space-y-1">
                  <Input placeholder="Task..." value={newItem} onChange={e => setNewItem(e.target.value)}
                    className="w-full text-xs" style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderColor: border, color: text }} autoFocus />
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => addItem(ver.id)} disabled={!newItem.trim()} style={{ backgroundColor: accent, color: '#fff' }} className="text-xs">Add</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setAddingTo(null); setNewItem(''); }} style={{ color: textMuted }} className="text-xs">Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── LAYOUT: GLASS — frosted panels ───────────────────────────────────────
  const renderGlass = () => (
    <div className={sectionSpacing} style={{ fontFamily: theme.font }}>
      {versions.map(ver => {
        const colors = sc(ver.status);
        const isExp = expanded[ver.id];
        return (
          <div key={ver.id} className="rounded-2xl overflow-hidden transition-all"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.08)`, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
            <button className="w-full text-left px-6 py-5 flex items-center justify-between"
              onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: withOpacity(colors.border, 0.15), border: `1px solid ${withOpacity(colors.border, 0.3)}` }}>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.border }} />
                </div>
                <div>
                  <h3 className={`${settings.versionTitleSize || 'text-lg'} font-semibold`} style={{ color: text }}>{ver.version_name}</h3>
                  <span className="text-xs opacity-50" style={{ color: colors.border }}>{ver.status.replace('_', ' ')} · {ver.items?.length || 0} tasks</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-16 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full" style={{ width: `${ver.items?.length ? Math.round((ver.items.filter(i => i.status === 'completed').length / ver.items.length) * 100) : 0}%`, backgroundColor: colors.border }} />
                </div>
                {isExp ? <ChevronUp className="w-4 h-4 opacity-30" style={{ color: textMuted }} /> : <ChevronDown className="w-4 h-4 opacity-30" style={{ color: textMuted }} />}
              </div>
            </button>
            {isExp && (
              <div className="px-6 pb-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <VersionDescEditor ver={ver} statusColors={colors} />
                {isOwner && (
                  <div className="flex gap-2 mt-3 mb-4">
                    <select value={ver.status} onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)}
                      className="rounded px-2 py-1 text-xs border" style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: text, borderColor: 'rgba(255,255,255,0.1)' }}>
                      <option value="backlog">Backlog</option><option value="in_progress">In Progress</option>
                      <option value="qa">QA</option><option value="completed">Completed</option>
                    </select>
                    <Button size="sm" variant="ghost" onClick={() => deleteVersion(ver.id)} className="text-red-600 text-xs">Delete</Button>
                  </div>
                )}
                <div className="space-y-2 mt-4">
                  {ver.items?.map(item => {
                    const ic = sc(item.status);
                    return (
                      <div key={item.id} className="group flex items-start gap-3 p-3 rounded-xl transition-all"
                        style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: withOpacity(ic.border, 0.15), border: `1px solid ${withOpacity(ic.border, 0.4)}` }}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ic.border }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingTaskId === item.id ? <TaskEditForm item={item} statusColors={ic} /> : (
                            <>
                              <span className="text-sm" style={{ color: item.status === 'completed' ? textMuted : text, textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>{item.title}</span>
                              {item.description && <p className="text-xs opacity-40 mt-0.5" style={{ color: textMuted }}>{item.description}</p>}
                            </>
                          )}
                        </div>
                        {isOwner && editingTaskId !== item.id && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }} style={{ color: textMuted }}><Edit2 className="w-3 h-3" /></button>
                            <button onClick={() => deleteItem(item.id)} className="text-red-600"><X className="w-3 h-3" /></button>
                          </div>
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

  // ── LAYOUT: BRUTALIST — thick borders, zero radius, uppercase ────────────
  const renderBrutalist = () => (
    <div className={sectionSpacing} style={{ fontFamily: theme.font }}>
      {versions.map(ver => {
        const colors = sc(ver.status);
        const isExp = expanded[ver.id];
        return (
          <div key={ver.id} style={{ border: `3px solid ${text}`, backgroundColor: bg }}>
            <button className="w-full text-left px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: isExp ? `3px solid ${text}` : 'none' }}
              onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
              <div className="flex items-center gap-4">
                <span className="text-xs font-black uppercase tracking-widest px-2 py-0.5" style={{ backgroundColor: colors.border, color: bg }}>{ver.status.replace('_', ' ')}</span>
                <span className={`${settings.versionTitleSize || 'text-xl'} font-black uppercase tracking-tight`} style={{ color: text }}>{ver.version_name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-black" style={{ color: textMuted }}>{ver.items?.length || 0} TASKS</span>
                <span className="font-black text-lg" style={{ color: text }}>{isExp ? '−' : '+'}</span>
              </div>
            </button>
            {isExp && (
              <div className="px-5 pb-5">
                {ver.description && <p className="text-sm mt-4 mb-3 uppercase font-bold opacity-50" style={{ color: textMuted }}>{ver.description}</p>}
                {isOwner && (
                  <div className="flex gap-2 mt-3 mb-4">
                    <select value={ver.status} onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)}
                      className="px-2 py-1 text-xs font-bold uppercase" style={{ backgroundColor: bg, color: text, border: `2px solid ${text}` }}>
                      <option value="backlog">BACKLOG</option><option value="in_progress">IN PROGRESS</option>
                      <option value="qa">QA</option><option value="completed">COMPLETED</option>
                    </select>
                    <button onClick={() => deleteVersion(ver.id)} className="px-3 py-1 text-xs font-black uppercase" style={{ border: `2px solid #f87171`, color: '#f87171' }}>DELETE</button>
                  </div>
                )}
                <div className="mt-4 space-y-0">
                  {ver.items?.map(item => {
                    const ic = sc(item.status);
                    return (
                      <div key={item.id} className="group flex items-start gap-4 py-3" style={{ borderBottom: `1px solid ${text}20` }}>
                        <span className="text-xs font-black uppercase px-1.5 py-0.5 flex-shrink-0" style={{ border: `1px solid ${ic.border}`, color: ic.border }}>{item.status.replace('_', ' ')}</span>
                        <div className="flex-1 min-w-0">
                          {editingTaskId === item.id ? <TaskEditForm item={item} statusColors={ic} /> : (
                            <span className="text-sm font-bold uppercase" style={{ color: item.status === 'completed' ? textMuted : text, textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>{item.title}</span>
                          )}
                        </div>
                        {isOwner && editingTaskId !== item.id && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }} style={{ color: textMuted }}><Edit2 className="w-3 h-3" /></button>
                            <button onClick={() => deleteItem(item.id)} style={{ color: '#f87171' }}><X className="w-3 h-3" /></button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {isOwner && (
                    addingTo === ver.id ? (
                      <div className="mt-3 space-y-2">
                        <Input placeholder="TASK TITLE" value={newItem} onChange={e => setNewItem(e.target.value)}
                          className="w-full font-bold uppercase" style={{ backgroundColor: bg, borderColor: text, color: text, borderWidth: '2px' }} autoFocus />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => addItem(ver.id)} disabled={!newItem.trim()} style={{ backgroundColor: text, color: bg }} className="font-black uppercase">ADD</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setAddingTo(null); setNewItem(''); }} style={{ color: textMuted, border: `1px solid ${textMuted}` }} className="font-black uppercase">CANCEL</Button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAddingTo(ver.id)} className="mt-3 w-full py-2 font-black uppercase text-sm transition-all hover:opacity-70"
                        style={{ border: `2px dashed ${text}30`, color: textMuted }}>+ ADD TASK</button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── LAYOUT: ACCORDION — animated expand with progress bars ───────────────
  const renderAccordion = () => (
    <div className={sectionSpacing} style={{ fontFamily: theme.font }}>
      {versions.map(ver => {
        const colors = sc(ver.status);
        const isOpen = accordionOpen[ver.id] ?? (settings.defaultExpanded ?? true);
        const completedCount = ver.items?.filter(i => i.status === 'completed').length || 0;
        const totalCount = ver.items?.length || 0;
        const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        const statusCounts = { backlog: 0, in_progress: 0, qa: 0, completed: 0 };
        ver.items?.forEach(i => { if (i.status in statusCounts) statusCounts[i.status as keyof typeof statusCounts]++; });
        return (
          <div key={ver.id} className="rounded-2xl overflow-hidden transition-all" style={{ backgroundColor: cardBg, border: `1px solid ${border}` }}>
            <button className="w-full text-left px-6 py-5 flex items-center gap-4"
              onClick={() => setAccordionOpen(p => ({ ...p, [ver.id]: !isOpen }))}>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className={`${settings.versionTitleSize || 'text-lg'} font-semibold`} style={{ color: text }}>{ver.version_name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: colors.bg, color: colors.border, border: `1px solid ${colors.border}40` }}>{ver.status.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: withOpacity(accent, 0.12) }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: accent }} />
                  </div>
                  <span className="text-xs font-mono flex-shrink-0" style={{ color: textMuted }}>{pct}% · {completedCount}/{totalCount}</span>
                </div>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                {Object.entries(statusCounts).map(([s, c]) => c > 0 && (
                  <div key={s} className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sc(s).border }} />
                    <span className="text-xs font-mono" style={{ color: textMuted }}>{c}</span>
                  </div>
                ))}
                <div className="transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <ChevronDown className="w-4 h-4 opacity-40" style={{ color: textMuted }} />
                </div>
              </div>
            </button>
            {isOpen && (
              <div className="px-6 pb-6" style={{ borderTop: `1px solid ${border}` }}>
                <VersionDescEditor ver={ver} statusColors={colors} />
                {isOwner && (
                  <div className="flex gap-2 mt-3 mb-4">
                    <select value={ver.status} onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)}
                      className="rounded-lg px-2 py-1 text-xs border" style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: text, borderColor: border }}>
                      <option value="backlog">Backlog</option><option value="in_progress">In Progress</option>
                      <option value="qa">QA</option><option value="completed">Completed</option>
                    </select>
                    <Button size="sm" variant="ghost" onClick={() => deleteVersion(ver.id)} className="text-red-600 text-xs">Delete</Button>
                  </div>
                )}
                <div className="mt-4 space-y-2">
                  {ver.items?.map(item => {
                    const ic = sc(item.status);
                    return (
                      <div key={item.id} className="group flex items-start gap-3 p-3 rounded-xl transition-all hover:bg-white/5" style={{ border: `1px solid ${border}` }}>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: ic.bg, border: `1px solid ${ic.border}50` }}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ic.border }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingTaskId === item.id ? <TaskEditForm item={item} statusColors={ic} /> : (
                            <>
                              <span className="text-sm" style={{ color: item.status === 'completed' ? textMuted : text, textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>{item.title}</span>
                              {item.description && <p className="text-xs opacity-40 mt-0.5" style={{ color: textMuted }}>{item.description}</p>}
                            </>
                          )}
                        </div>
                        <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: ic.bg, color: ic.border, border: `1px solid ${ic.border}30` }}>{item.status.replace('_', ' ')}</span>
                        {isOwner && editingTaskId !== item.id && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }} style={{ color: textMuted }}><Edit2 className="w-3 h-3" /></button>
                            <button onClick={() => deleteItem(item.id)} className="text-red-600"><X className="w-3 h-3" /></button>
                          </div>
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

  // ── LAYOUT: ORBIT — radial layout, versions orbit a center hub ───────────
  const renderOrbit = () => {
    const activeVer = versions.find(v => v.id === sidebarActiveId) || versions[0];
    const colors = activeVer ? sc(activeVer.status) : sc('backlog');
    const radius = 160;
    const cx = 200, cy = 200;
    return (
      <div className="flex gap-8 items-start" style={{ fontFamily: theme.font }}>
        <div className="flex-shrink-0 relative" style={{ width: '400px', height: '400px' }}>
          <svg width="400" height="400" className="absolute inset-0">
            <circle cx={cx} cy={cy} r={radius} fill="none" stroke={withOpacity(accent, 0.08)} strokeWidth="1" strokeDasharray="4 4" />
            <circle cx={cx} cy={cy} r={radius * 0.55} fill="none" stroke={withOpacity(accent, 0.05)} strokeWidth="1" />
          </svg>
          <div className="absolute rounded-full flex flex-col items-center justify-center text-center"
            style={{ width: '80px', height: '80px', left: cx - 40, top: cy - 40, backgroundColor: withOpacity(accent, 0.1), border: `1px solid ${withOpacity(accent, 0.3)}`, backdropFilter: 'blur(8px)' }}>
            <span className="text-xs font-bold" style={{ color: accent }}>v{versions.length}</span>
            <span className="text-[9px] opacity-60" style={{ color: textMuted }}>versions</span>
          </div>
          {versions.map((ver, i) => {
            const angle = (i / versions.length) * 2 * Math.PI - Math.PI / 2;
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);
            const vc = sc(ver.status);
            const isActive = ver.id === sidebarActiveId;
            return (
              <button key={ver.id} onClick={() => setSidebarActiveId(ver.id)}
                className="absolute rounded-full flex items-center justify-center transition-all"
                style={{ width: isActive ? '52px' : '44px', height: isActive ? '52px' : '44px', left: x - (isActive ? 26 : 22), top: y - (isActive ? 26 : 22), backgroundColor: isActive ? withOpacity(vc.border, 0.2) : withOpacity(surface, 0.8), border: `2px solid ${isActive ? vc.border : withOpacity(vc.border, 0.4)}`, backdropFilter: 'blur(8px)', boxShadow: isActive ? `0 0 16px ${withOpacity(vc.border, 0.3)}` : 'none', zIndex: isActive ? 10 : 1 }}>
                <span className="text-[9px] font-bold text-center leading-tight px-1" style={{ color: isActive ? vc.border : textMuted }}>{ver.version_name.slice(0, 6)}</span>
              </button>
            );
          })}
        </div>
        <div className="flex-1 min-w-0">
          {activeVer ? (
            <div className="rounded-2xl p-6" style={{ backgroundColor: cardBg, border: `1px solid ${colors.border}25`, backdropFilter: 'blur(12px)' }}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest mb-1 block" style={{ color: colors.border }}>{activeVer.status.replace('_', ' ')}</span>
                  <h3 className="text-2xl font-bold" style={{ color: text }}>{activeVer.version_name}</h3>
                  {activeVer.description && <p className="text-sm opacity-50 mt-1" style={{ color: textMuted }}>{activeVer.description}</p>}
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold" style={{ color: colors.border }}>
                    {activeVer.items?.filter(i => i.status === 'completed').length || 0}
                    <span className="text-base opacity-40">/{activeVer.items?.length || 0}</span>
                  </div>
                </div>
              </div>
              {isOwner && (
                <div className="flex gap-2 mb-4">
                  <select value={activeVer.status} onChange={e => updateStatus('roadmap_versions', activeVer.id, e.target.value)}
                    className="rounded px-2 py-1 text-xs border" style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: text, borderColor: border }}>
                    <option value="backlog">Backlog</option><option value="in_progress">In Progress</option>
                    <option value="qa">QA</option><option value="completed">Completed</option>
                  </select>
                  <Button size="sm" variant="ghost" onClick={() => deleteVersion(activeVer.id)} className="text-red-600 text-xs">Delete</Button>
                </div>
              )}
              <div className="space-y-2">
                {activeVer.items?.map(item => {
                  const ic = sc(item.status);
                  return (
                    <div key={item.id} className="group flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: withOpacity(surface, 0.5), border: `1px solid ${border}` }}>
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: ic.border }} />
                      <div className="flex-1 min-w-0">
                        {editingTaskId === item.id ? <TaskEditForm item={item} statusColors={ic} /> : (
                          <span className="text-sm" style={{ color: item.status === 'completed' ? textMuted : text, textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>{item.title}</span>
                        )}
                      </div>
                      {isOwner && editingTaskId !== item.id && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }} style={{ color: textMuted }}><Edit2 className="w-3 h-3" /></button>
                          <button onClick={() => deleteItem(item.id)} className="text-red-600"><X className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>
                  );
                })}
                <AddTaskForm ver={activeVer} statusColors={colors} />
              </div>
            </div>
          ) : <div style={{ color: textMuted }}>Select a version</div>}
        </div>
      </div>
    );
  };

  // ── LAYOUT: NEWSPAPER — editorial columns, typographic, no cards ─────────
  const renderNewspaper = () => (
    <div style={{ fontFamily: theme.font }}>
      <div className="grid gap-8" style={{ gridTemplateColumns: '1fr 1px 1fr' }}>
        {versions.map((ver, idx) => {
          const colors = sc(ver.status);
          const isExp = expanded[ver.id];
          const isRight = idx % 2 === 1;
          if (idx % 2 === 1) return null; // handled in pairs
          const rightVer = versions[idx + 1];
          return (
            <div key={ver.id} className="contents">
              {/* Left column */}
              <div className="py-6" style={{ borderTop: `2px solid ${text}` }}>
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.border }}>{ver.status.replace('_', ' ')}</span>
                  <span className="text-xs opacity-30" style={{ color: textMuted }}>{ver.items?.length || 0} items</span>
                </div>
                <button className="w-full text-left" onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
                  <h2 className="text-2xl font-bold leading-tight mb-2" style={{ color: text, fontFamily: theme.font }}>{ver.version_name}</h2>
                </button>
                {ver.description && <p className="text-sm leading-relaxed mb-4 opacity-60" style={{ color: textMuted }}>{ver.description}</p>}
                {isOwner && (
                  <div className="flex gap-2 mb-3">
                    <select value={ver.status} onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)}
                      className="rounded px-2 py-0.5 text-xs border" style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: text, borderColor: border }}>
                      <option value="backlog">Backlog</option><option value="in_progress">In Progress</option>
                      <option value="qa">QA</option><option value="completed">Completed</option>
                    </select>
                    <button onClick={() => deleteVersion(ver.id)} className="text-xs opacity-50 hover:opacity-100" style={{ color: '#f87171' }}>Delete</button>
                  </div>
                )}
                <div className="space-y-3">
                  {ver.items?.map((item, ii) => {
                    const ic = sc(item.status);
                    return (
                      <div key={item.id} className="group">
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-mono opacity-30 mt-0.5 flex-shrink-0" style={{ color: textMuted }}>{String(ii + 1).padStart(2, '0')}.</span>
                          <div className="flex-1">
                            {editingTaskId === item.id ? <TaskEditForm item={item} statusColors={ic} /> : (
                              <p className="text-sm leading-snug" style={{ color: item.status === 'completed' ? textMuted : text, textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>{item.title}</p>
                            )}
                          </div>
                          <span className="text-[10px] uppercase tracking-wider flex-shrink-0 opacity-50" style={{ color: ic.border }}>{item.status.replace('_', ' ')}</span>
                          {isOwner && editingTaskId !== item.id && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }} style={{ color: textMuted }}><Edit2 className="w-3 h-3" /></button>
                              <button onClick={() => deleteItem(item.id)} style={{ color: '#f87171' }}><X className="w-3 h-3" /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <AddTaskForm ver={ver} statusColors={colors} />
                </div>
              </div>
              {/* Divider */}
              <div style={{ backgroundColor: withOpacity(text, 0.08) }} />
              {/* Right column */}
              {rightVer ? (
                <div className="py-6" style={{ borderTop: `2px solid ${text}` }}>
                  <div className="flex items-baseline gap-3 mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: sc(rightVer.status).border }}>{rightVer.status.replace('_', ' ')}</span>
                    <span className="text-xs opacity-30" style={{ color: textMuted }}>{rightVer.items?.length || 0} items</span>
                  </div>
                  <button className="w-full text-left" onClick={() => setExpanded(p => ({ ...p, [rightVer.id]: !p[rightVer.id] }))}>
                    <h2 className="text-2xl font-bold leading-tight mb-2" style={{ color: text }}>{rightVer.version_name}</h2>
                  </button>
                  {rightVer.description && <p className="text-sm leading-relaxed mb-4 opacity-60" style={{ color: textMuted }}>{rightVer.description}</p>}
                  {isOwner && (
                    <div className="flex gap-2 mb-3">
                      <select value={rightVer.status} onChange={e => updateStatus('roadmap_versions', rightVer.id, e.target.value)}
                        className="rounded px-2 py-0.5 text-xs border" style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: text, borderColor: border }}>
                        <option value="backlog">Backlog</option><option value="in_progress">In Progress</option>
                        <option value="qa">QA</option><option value="completed">Completed</option>
                      </select>
                      <button onClick={() => deleteVersion(rightVer.id)} className="text-xs opacity-50 hover:opacity-100" style={{ color: '#f87171' }}>Delete</button>
                    </div>
                  )}
                  <div className="space-y-3">
                    {rightVer.items?.map((item, ii) => {
                      const ic = sc(item.status);
                      return (
                        <div key={item.id} className="group">
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-mono opacity-30 mt-0.5 flex-shrink-0" style={{ color: textMuted }}>{String(ii + 1).padStart(2, '0')}.</span>
                            <div className="flex-1">
                              {editingTaskId === item.id ? <TaskEditForm item={item} statusColors={ic} /> : (
                                <p className="text-sm leading-snug" style={{ color: item.status === 'completed' ? textMuted : text, textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>{item.title}</p>
                              )}
                            </div>
                            <span className="text-[10px] uppercase tracking-wider flex-shrink-0 opacity-50" style={{ color: ic.border }}>{item.status.replace('_', ' ')}</span>
                            {isOwner && editingTaskId !== item.id && (
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }} style={{ color: textMuted }}><Edit2 className="w-3 h-3" /></button>
                                <button onClick={() => deleteItem(item.id)} style={{ color: '#f87171' }}><X className="w-3 h-3" /></button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <AddTaskForm ver={rightVer} statusColors={sc(rightVer.status)} />
                  </div>
                </div>
              ) : <div />}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── LAYOUT: MINIMAL — huge numbers, ultra-sparse, no decoration ──────────
  const renderMinimal = () => (
    <div style={{ fontFamily: theme.font }}>
      {versions.map((ver, idx) => {
        const colors = sc(ver.status);
        const isExp = expanded[ver.id];
        return (
          <div key={ver.id} className="py-12" style={{ borderTop: `1px solid ${border}` }}>
            <button className="w-full text-left flex items-start gap-8 group"
              onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
              <span className="text-8xl font-bold tabular-nums leading-none flex-shrink-0 transition-opacity group-hover:opacity-60"
                style={{ color: withOpacity(text, 0.08), fontVariantNumeric: 'tabular-nums' }}>
                {String(idx + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 pt-2">
                <div className="flex items-center gap-4 mb-1">
                  <h2 className="text-3xl font-light tracking-tight" style={{ color: text }}>{ver.version_name}</h2>
                  <span className="text-xs font-mono uppercase tracking-widest opacity-40" style={{ color: colors.border }}>{ver.status.replace('_', ' ')}</span>
                </div>
                {ver.description && <p className="text-sm opacity-30 mt-1" style={{ color: textMuted }}>{ver.description}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-mono opacity-25" style={{ color: textMuted }}>{ver.items?.length || 0} tasks</span>
                  <span className="text-xs font-mono opacity-25" style={{ color: textMuted }}>·</span>
                  <span className="text-xs font-mono opacity-25" style={{ color: textMuted }}>{ver.items?.filter(i => i.status === 'completed').length || 0} done</span>
                </div>
              </div>
              <div className="pt-3 opacity-0 group-hover:opacity-30 transition-opacity" style={{ color: textMuted }}>
                {isExp ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </button>
            {isExp && (
              <div className="ml-32 mt-8">
                {isOwner && (
                  <div className="flex gap-2 mb-6">
                    <select value={ver.status} onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)}
                      className="rounded px-2 py-1 text-xs border" style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: text, borderColor: border }}>
                      <option value="backlog">Backlog</option><option value="in_progress">In Progress</option>
                      <option value="qa">QA</option><option value="completed">Completed</option>
                    </select>
                    <Button size="sm" variant="ghost" onClick={() => deleteVersion(ver.id)} className="text-red-600 text-xs">Delete</Button>
                  </div>
                )}
                <div className="space-y-4">
                  {ver.items?.map((item, ii) => {
                    const ic = sc(item.status);
                    return (
                      <div key={item.id} className="group flex items-start gap-6">
                        <span className="text-xs font-mono opacity-20 mt-1 w-6 flex-shrink-0" style={{ color: textMuted }}>{String(ii + 1).padStart(2, '0')}</span>
                        <div className="flex-1 min-w-0">
                          {editingTaskId === item.id ? <TaskEditForm item={item} statusColors={ic} /> : (
                            <>
                              <span className="text-base font-light" style={{ color: item.status === 'completed' ? withOpacity(text, 0.25) : text, textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>{item.title}</span>
                              {item.description && <p className="text-xs opacity-25 mt-0.5" style={{ color: textMuted }}>{item.description}</p>}
                            </>
                          )}
                        </div>
                        <span className="text-xs font-mono opacity-20 mt-1 flex-shrink-0" style={{ color: ic.border }}>{item.status.replace('_', ' ')}</span>
                        {isOwner && editingTaskId !== item.id && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-40 transition-opacity">
                            <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }} style={{ color: textMuted }}><Edit2 className="w-3 h-3" /></button>
                            <button onClick={() => deleteItem(item.id)} className="text-red-600"><X className="w-3 h-3" /></button>
                          </div>
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

  // ── LAYOUT: SIDEBAR — fixed left nav, right panel shows tasks ────────────
  const renderSidebar = () => {
    const activeVer = versions.find(v => v.id === sidebarActiveId) || versions[0];
    const colors = activeVer ? sc(activeVer.status) : sc('backlog');
    return (
      <div className="flex gap-0 rounded-2xl overflow-hidden" style={{ fontFamily: theme.font, border: `1px solid ${border}`, minHeight: '500px' }}>
        {/* Left nav */}
        <div className="flex-shrink-0 flex flex-col" style={{ width: '220px', backgroundColor: withOpacity(surface, 0.6), borderRight: `1px solid ${border}` }}>
          <div className="px-4 py-4" style={{ borderBottom: `1px solid ${border}` }}>
            <span className="text-xs font-semibold uppercase tracking-widest opacity-40" style={{ color: textMuted }}>Versions</span>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {versions.map(ver => {
              const vc = sc(ver.status);
              const isActive = ver.id === (sidebarActiveId || versions[0]?.id);
              return (
                <button key={ver.id} onClick={() => setSidebarActiveId(ver.id)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 transition-all"
                  style={{ backgroundColor: isActive ? withOpacity(vc.border, 0.1) : 'transparent', borderLeft: isActive ? `2px solid ${vc.border}` : '2px solid transparent' }}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: vc.border }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: isActive ? text : textMuted }}>{ver.version_name}</p>
                    <p className="text-xs opacity-50 truncate" style={{ color: vc.border }}>{ver.status.replace('_', ' ')}</p>
                  </div>
                  <span className="text-xs font-mono opacity-40 flex-shrink-0" style={{ color: textMuted }}>{ver.items?.length || 0}</span>
                </button>
              );
            })}
          </div>
          {isOwner && (
            <div className="p-3" style={{ borderTop: `1px solid ${border}` }}>
              {addingTo === 'new-version' ? (
                <div className="space-y-2">
                  <Input value={newVersion} onChange={e => setNewVersion(e.target.value)} placeholder="Version name..."
                    className="w-full text-xs" style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderColor: border, color: text }} autoFocus />
                  <div className="flex gap-1">
                    <Button size="sm" onClick={addVersion} disabled={!newVersion.trim()} style={{ backgroundColor: accent, color: '#fff' }} className="text-xs flex-1">Add</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAddingTo(null)} style={{ color: textMuted }} className="text-xs">✕</Button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingTo('new-version')} className="w-full py-2 text-xs flex items-center justify-center gap-1 rounded-lg transition-all hover:opacity-70"
                  style={{ border: `1px dashed ${border}`, color: textMuted }}>
                  <Plus className="w-3 h-3" />New Version
                </button>
              )}
            </div>
          )}
        </div>
        {/* Right panel */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: withOpacity(surface, 0.3) }}>
          {activeVer ? (
            <>
              <div className="px-6 py-5 flex items-start justify-between" style={{ borderBottom: `1px solid ${border}` }}>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className={`${settings.versionTitleSize || 'text-xl'} font-semibold`} style={{ color: text }}>{activeVer.version_name}</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.bg, color: colors.border, border: `1px solid ${colors.border}40` }}>{activeVer.status.replace('_', ' ')}</span>
                  </div>
                  {activeVer.description && <p className="text-sm opacity-50" style={{ color: textMuted }}>{activeVer.description}</p>}
                </div>
                {isOwner && (
                  <div className="flex gap-2">
                    <select value={activeVer.status} onChange={e => updateStatus('roadmap_versions', activeVer.id, e.target.value)}
                      className="rounded px-2 py-1 text-xs border" style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: text, borderColor: border }}>
                      <option value="backlog">Backlog</option><option value="in_progress">In Progress</option>
                      <option value="qa">QA</option><option value="completed">Completed</option>
                    </select>
                    <Button size="sm" variant="ghost" onClick={() => deleteVersion(activeVer.id)} className="text-red-600 text-xs">Delete</Button>
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-2">
                  {activeVer.items?.map(item => {
                    const ic = sc(item.status);
                    return (
                      <div key={item.id} className="group flex items-start gap-3 p-3 rounded-xl transition-all hover:bg-white/5" style={{ border: `1px solid ${border}` }}>
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: ic.border }} />
                        <div className="flex-1 min-w-0">
                          {editingTaskId === item.id ? <TaskEditForm item={item} statusColors={ic} /> : (
                            <>
                              <span className="text-sm" style={{ color: item.status === 'completed' ? textMuted : text, textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>{item.title}</span>
                              {item.description && <p className="text-xs opacity-40 mt-0.5" style={{ color: textMuted }}>{item.description}</p>}
                            </>
                          )}
                        </div>
                        <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: ic.bg, color: ic.border, border: `1px solid ${ic.border}30` }}>{item.status.replace('_', ' ')}</span>
                        {isOwner && editingTaskId !== item.id && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }} style={{ color: textMuted }}><Edit2 className="w-3 h-3" /></button>
                            <button onClick={() => deleteItem(item.id)} className="text-red-600"><X className="w-3 h-3" /></button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <AddTaskForm ver={activeVer} statusColors={colors} />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center" style={{ color: textMuted }}>Select a version</div>
          )}
        </div>
      </div>
    );
  };

  // ── LAYOUT: TABLE — spreadsheet rows with inline status badges ───────────
  const renderTable = () => {
    const allItems = versions.flatMap(ver => (ver.items || []).map(item => ({ ...item, _verName: ver.version_name, _ver: ver })));
    return (
      <div style={{ fontFamily: theme.font }}>
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: withOpacity(surface, 0.8), borderBottom: `1px solid ${border}` }}>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: textMuted }}>Task</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: textMuted }}>Version</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: textMuted }}>Status</th>
                {itemVotingEnabled && <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: textMuted }}>Votes</th>}
                {isOwner && <th className="px-4 py-3 w-16" />}
              </tr>
            </thead>
            <tbody>
              {versions.map((ver, vi) => {
                const vc = sc(ver.status);
                return (
                  <>
                    <tr key={`ver-${ver.id}`} style={{ backgroundColor: withOpacity(surface, 0.4), borderBottom: `1px solid ${border}` }}>
                      <td colSpan={isOwner ? (itemVotingEnabled ? 5 : 4) : (itemVotingEnabled ? 4 : 3)} className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: vc.border }} />
                          <span className="text-sm font-semibold" style={{ color: text }}>{ver.version_name}</span>
                          <span className="text-xs font-mono opacity-40" style={{ color: vc.border }}>{ver.status.replace('_', ' ')}</span>
                          {isOwner && (
                            <div className="flex gap-2 ml-auto">
                              <select value={ver.status} onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)}
                                className="rounded px-1.5 py-0.5 text-xs border" style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: text, borderColor: border }}>
                                <option value="backlog">Backlog</option><option value="in_progress">In Progress</option>
                                <option value="qa">QA</option><option value="completed">Completed</option>
                              </select>
                              <button onClick={() => deleteVersion(ver.id)} className="text-red-600 text-xs opacity-60 hover:opacity-100">Delete</button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                    {ver.items?.map(item => {
                      const ic = sc(item.status);
                      return (
                        <tr key={item.id} className="group transition-colors hover:bg-white/5" style={{ borderBottom: `1px solid ${border}20` }}>
                          <td className="px-4 py-3">
                            {editingTaskId === item.id ? (
                              <TaskEditForm item={item} statusColors={ic} />
                            ) : (
                              <span className="text-sm" style={{ color: item.status === 'completed' ? textMuted : text, textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>{item.title}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-mono opacity-40" style={{ color: textMuted }}>{ver.version_name}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 rounded font-mono" style={{ backgroundColor: ic.bg, color: ic.border, border: `1px solid ${ic.border}40` }}>{item.status.replace('_', ' ')}</span>
                          </td>
                          {itemVotingEnabled && (
                            <td className="px-4 py-3">
                              {item.voting_enabled !== false && (
                                <button onClick={() => toggleItemVote(item.id, item.user_has_voted || false)}
                                  className="flex items-center gap-1 text-xs transition-all"
                                  style={{ color: item.user_has_voted ? accent : textMuted }}>
                                  <ArrowUp className="w-3 h-3" />{item.vote_count || 0}
                                </button>
                              )}
                            </td>
                          )}
                          {isOwner && (
                            <td className="px-4 py-3">
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                {editingTaskId !== item.id && <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }} style={{ color: textMuted }}><Edit2 className="w-3.5 h-3.5" /></button>}
                                <button onClick={() => deleteItem(item.id)} className="text-red-600"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {isOwner && (
                      <tr key={`add-${ver.id}`} style={{ borderBottom: `1px solid ${border}` }}>
                        <td colSpan={isOwner ? (itemVotingEnabled ? 5 : 4) : (itemVotingEnabled ? 4 : 3)} className="px-4 py-2">
                          {addingTo === ver.id ? (
                            <div className="flex gap-2 items-center">
                              <Input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Task title..."
                                className="flex-1 h-7 text-sm" style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderColor: border, color: text }} autoFocus />
                              <Button size="sm" onClick={() => addItem(ver.id)} disabled={!newItem.trim()} style={{ backgroundColor: accent, color: '#fff' }} className="h-7 text-xs">Add</Button>
                              <Button size="sm" variant="ghost" onClick={() => { setAddingTo(null); setNewItem(''); }} style={{ color: textMuted }} className="h-7 text-xs">Cancel</Button>
                            </div>
                          ) : (
                            <button onClick={() => setAddingTo(ver.id)} className="text-xs flex items-center gap-1 opacity-30 hover:opacity-70 transition-opacity" style={{ color: textMuted }}>
                              <Plus className="w-3 h-3" />Add task
                            </button>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
        {isOwner && (
          <div className="mt-4 flex gap-3 items-center">
            <Input value={newVersion} onChange={e => setNewVersion(e.target.value)} placeholder="New version name..."
              className="max-w-xs" style={{ backgroundColor: withOpacity(surface, 0.5), borderColor: border, color: text }} />
            <Button onClick={addVersion} disabled={!newVersion.trim()} style={{ backgroundColor: accent, color: '#fff' }}>
              <Plus className="w-4 h-4 mr-1" />Add Version
            </Button>
          </div>
        )}
      </div>
    );
  };

  // ── LAYOUT: CARDS 3D — stacked cards with depth/shadow illusion ──────────
  const renderCards3d = () => (
    <div className={sectionSpacing} style={{ fontFamily: theme.font }}>
      {versions.map((ver, idx) => {
        const colors = sc(ver.status);
        const isExp = expanded[ver.id];
        const completedCount = ver.items?.filter(i => i.status === 'completed').length || 0;
        const totalCount = ver.items?.length || 0;
        return (
          <div key={ver.id} className="relative" style={{ paddingBottom: '8px' }}>
            {/* Shadow layers for 3D effect */}
            <div className="absolute inset-0 rounded-2xl" style={{ transform: 'translate(6px, 6px)', backgroundColor: withOpacity(colors.border, 0.06), borderRadius: '16px' }} />
            <div className="absolute inset-0 rounded-2xl" style={{ transform: 'translate(3px, 3px)', backgroundColor: withOpacity(colors.border, 0.1), borderRadius: '16px' }} />
            {/* Main card */}
            <div className="relative rounded-2xl overflow-hidden transition-all"
              style={{ backgroundColor: cardBg, border: `1px solid ${colors.border}25`, backdropFilter: 'blur(8px)' }}>
              <div className="px-6 py-5" style={{ background: `linear-gradient(135deg, ${withOpacity(colors.border, 0.06)} 0%, transparent 50%)` }}>
                <button className="w-full text-left flex items-start justify-between"
                  onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-0.5"
                      style={{ backgroundColor: withOpacity(colors.border, 0.12), border: `1px solid ${withOpacity(colors.border, 0.25)}` }}>
                      <span className="text-xs font-bold font-mono" style={{ color: colors.border }}>{String(idx + 1).padStart(2, '0')}</span>
                    </div>
                    <div>
                      <h3 className={`${settings.versionTitleSize || 'text-lg'} font-semibold leading-tight`} style={{ color: text }}>{ver.version_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.bg, color: colors.border, border: `1px solid ${colors.border}40` }}>{ver.status.replace('_', ' ')}</span>
                        <span className="text-xs opacity-40" style={{ color: textMuted }}>{completedCount}/{totalCount} done</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {totalCount > 0 && (
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-mono" style={{ color: colors.border }}>{Math.round((completedCount / totalCount) * 100)}%</span>
                        <div className="w-20 h-1 rounded-full overflow-hidden" style={{ backgroundColor: withOpacity(colors.border, 0.15) }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.round((completedCount / totalCount) * 100)}%`, backgroundColor: colors.border }} />
                        </div>
                      </div>
                    )}
                    {isExp ? <ChevronUp className="w-4 h-4 opacity-30" style={{ color: textMuted }} /> : <ChevronDown className="w-4 h-4 opacity-30" style={{ color: textMuted }} />}
                  </div>
                </button>
              </div>
              {isExp && (
                <div className="px-6 pb-6" style={{ borderTop: `1px solid ${colors.border}15` }}>
                  <VersionDescEditor ver={ver} statusColors={colors} />
                  {isOwner && (
                    <div className="flex gap-2 mt-3 mb-4">
                      <select value={ver.status} onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)}
                        className="rounded-lg px-2 py-1 text-xs border" style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: text, borderColor: border }}>
                        <option value="backlog">Backlog</option><option value="in_progress">In Progress</option>
                        <option value="qa">QA</option><option value="completed">Completed</option>
                      </select>
                      <Button size="sm" variant="ghost" onClick={() => deleteVersion(ver.id)} className="text-red-600 text-xs">Delete</Button>
                    </div>
                  )}
                  <div className="mt-4 space-y-2">
                    {ver.items?.map(item => {
                      const ic = sc(item.status);
                      return (
                        <div key={item.id} className="group flex items-start gap-3 p-3 rounded-xl transition-all"
                          style={{ backgroundColor: withOpacity(surface, 0.5), border: `1px solid ${border}` }}>
                          <div className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ backgroundColor: withOpacity(ic.border, 0.12), border: `1px solid ${withOpacity(ic.border, 0.3)}` }}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ic.border }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            {editingTaskId === item.id ? <TaskEditForm item={item} statusColors={ic} /> : (
                              <>
                                <span className="text-sm" style={{ color: item.status === 'completed' ? textMuted : text, textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>{item.title}</span>
                                {item.description && <p className="text-xs opacity-40 mt-0.5" style={{ color: textMuted }}>{item.description}</p>}
                              </>
                            )}
                          </div>
                          {itemVotingEnabled && item.voting_enabled !== false && (
                            <button onClick={() => toggleItemVote(item.id, item.user_has_voted || false)}
                              className="flex items-center gap-1 text-xs flex-shrink-0 transition-all"
                              style={{ color: item.user_has_voted ? accent : textMuted }}>
                              <ArrowUp className="w-3 h-3" />{item.vote_count || 0}
                            </button>
                          )}
                          {isOwner && editingTaskId !== item.id && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }} style={{ color: textMuted }}><Edit2 className="w-3 h-3" /></button>
                              <button onClick={() => deleteItem(item.id)} className="text-red-600"><X className="w-3 h-3" /></button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <AddTaskForm ver={ver} statusColors={colors} />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── Suggestions panel ────────────────────────────────────────────────────
  const renderSuggestions = () => {
    const sorted = [...suggestions].sort((a, b) => {
      if (sortBy === 'upvotes') return b.upvotes - a.upvotes;
      if (sortBy === 'newest') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      return (b.reply_count || 0) - (a.reply_count || 0);
    });
    return (
      <div className="mt-16 pt-12" style={{ borderTop: `1px solid ${border}` }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: text }}>Suggestions</h2>
            <p className="text-sm mt-1 opacity-50" style={{ color: textMuted }}>Feature requests and feedback from the community</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
              className="rounded-lg px-3 py-1.5 text-sm border" style={{ backgroundColor: withOpacity(surface, 0.6), color: text, borderColor: border }}>
              <option value="upvotes">Top</option>
              <option value="newest">Newest</option>
              <option value="discussed">Most discussed</option>
            </select>
            {user && (
              <Button onClick={() => setShowModal(true)} style={{ backgroundColor: accent, color: '#fff' }}>
                <Lightbulb className="w-4 h-4 mr-2" />Suggest
              </Button>
            )}
          </div>
        </div>
        {selectedSuggestion ? (
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: cardBg, border: `1px solid ${border}` }}>
            <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${border}` }}>
              <button onClick={() => { setSelectedSuggestion(null); setSuggestionReplies([]); }}
                className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70" style={{ color: textMuted }}>
                <ArrowLeft className="w-4 h-4" />Back
              </button>
              {isOwner && (
                <div className="ml-auto flex gap-2">
                  {(['open','planned','in_progress','completed','declined'] as const).map(s => (
                    <button key={s} onClick={() => updateSuggestionStatus(selectedSuggestion.id, s)}
                      className="text-xs px-2 py-0.5 rounded transition-all"
                      style={{ backgroundColor: selectedSuggestion.forum_status === s ? accent : withOpacity(surface, 0.5), color: selectedSuggestion.forum_status === s ? '#fff' : textMuted, border: `1px solid ${border}` }}>
                      {s}
                    </button>
                  ))}
                  <button onClick={() => deleteSuggestion(selectedSuggestion.id)} className="text-red-600 text-xs px-2 py-0.5 rounded" style={{ border: `1px solid ${border}` }}>Delete</button>
                </div>
              )}
            </div>
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <button onClick={() => toggleUpvote(selectedSuggestion.id, selectedSuggestion.user_upvoted || false)}
                  className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all flex-shrink-0"
                  style={{ backgroundColor: selectedSuggestion.user_upvoted ? withOpacity(accent, 0.15) : withOpacity(surface, 0.5), border: `1px solid ${selectedSuggestion.user_upvoted ? accent : border}`, color: selectedSuggestion.user_upvoted ? accent : textMuted }}>
                  <ThumbsUp className="w-4 h-4" />
                  <span className="text-xs font-bold">{selectedSuggestion.upvotes}</span>
                </button>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2" style={{ color: text }}>{selectedSuggestion.title}</h3>
                  {selectedSuggestion.description && <p className="text-sm opacity-70 mb-3" style={{ color: textMuted }}>{selectedSuggestion.description}</p>}
                  <div className="flex items-center gap-3 text-xs" style={{ color: textMuted }}>
                    <span>{selectedSuggestion.author?.display_name || 'Anonymous'}</span>
                    <span>·</span>
                    <span>{fmtRelative(selectedSuggestion.created_at)}</span>
                    {selectedSuggestion.forum_status && <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: withOpacity(accent, 0.15), color: accent }}>{selectedSuggestion.forum_status}</span>}
                  </div>
                </div>
              </div>
              <div className="space-y-4 mb-6" style={{ borderTop: `1px solid ${border}`, paddingTop: '24px' }}>
                {loadingReplies ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: accent }} /> : (
                  suggestionReplies.map(reply => (
                    <div key={reply.id} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{ backgroundColor: reply.is_creator ? withOpacity(accent, 0.2) : withOpacity(surface, 0.8), color: reply.is_creator ? accent : textMuted, border: `1px solid ${reply.is_creator ? accent : border}` }}>
                        {(reply.author?.display_name || 'A')[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold" style={{ color: text }}>{reply.author?.display_name || 'Anonymous'}</span>
                          {reply.is_creator && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: withOpacity(accent, 0.15), color: accent }}>Creator</span>}
                          <span className="text-xs opacity-40" style={{ color: textMuted }}>{fmtRelative(reply.created_at)}</span>
                        </div>
                        <p className="text-sm" style={{ color: textMuted }}>{reply.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {user && (
                <div className="flex gap-3">
                  <Textarea value={replyContent} onChange={e => setReplyContent(e.target.value)} placeholder="Write a reply..."
                    rows={2} className="flex-1 rounded-xl" style={{ backgroundColor: withOpacity(surface, 0.5), borderColor: border, color: text }} />
                  <Button onClick={submitReply} disabled={submitting || !replyContent.trim()} style={{ backgroundColor: accent, color: '#fff' }}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map(sug => (
              <button key={sug.id} onClick={() => { setSelectedSuggestion(sug); fetchReplies(sug.id); }}
                className="w-full text-left rounded-2xl p-5 transition-all hover:scale-[1.005]"
                style={{ backgroundColor: cardBg, border: `1px solid ${border}` }}>
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-1 flex-shrink-0 px-2 py-1 rounded-lg"
                    style={{ backgroundColor: sug.user_upvoted ? withOpacity(accent, 0.1) : withOpacity(surface, 0.5), border: `1px solid ${sug.user_upvoted ? withOpacity(accent, 0.3) : border}` }}>
                    <ThumbsUp className="w-3.5 h-3.5" style={{ color: sug.user_upvoted ? accent : textMuted }} />
                    <span className="text-xs font-bold" style={{ color: sug.user_upvoted ? accent : textMuted }}>{sug.upvotes}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold" style={{ color: text }}>{sug.title}</h4>
                      {sug.forum_status && sug.forum_status !== 'open' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: withOpacity(accent, 0.12), color: accent }}>{sug.forum_status}</span>
                      )}
                    </div>
                    {sug.description && <p className="text-xs opacity-50 mt-1 line-clamp-2" style={{ color: textMuted }}>{sug.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: textMuted }}>
                      <span className="opacity-50">{sug.author?.display_name || 'Anonymous'}</span>
                      <span className="opacity-30">·</span>
                      <span className="opacity-50">{fmtRelative(sug.created_at)}</span>
                      {(sug.reply_count || 0) > 0 && (
                        <><span className="opacity-30">·</span>
                        <span className="flex items-center gap-1 opacity-50"><MessageCircle className="w-3 h-3" />{sug.reply_count}</span></>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
            {sorted.length === 0 && (
              <div className="text-center py-12 opacity-40" style={{ color: textMuted }}>
                <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No suggestions yet. Be the first!</p>
              </div>
            )}
          </div>
        )}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: surface, border: `1px solid ${border}` }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: text }}>Submit a suggestion</h3>
                <button onClick={() => setShowModal(false)} style={{ color: textMuted }}><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <Input value={suggestionTitle} onChange={e => setSuggestionTitle(e.target.value)} placeholder="What would you like to see?"
                  className="w-full" style={{ backgroundColor: withOpacity(bg, 0.5), borderColor: border, color: text }} autoFocus />
                <Textarea value={suggestionDesc} onChange={e => setSuggestionDesc(e.target.value)} placeholder="More details (optional)..."
                  rows={3} className="w-full" style={{ backgroundColor: withOpacity(bg, 0.5), borderColor: border, color: text }} />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setShowModal(false)} style={{ color: textMuted }}>Cancel</Button>
                  <Button onClick={submitSuggestion} disabled={submitting || !suggestionTitle.trim()} style={{ backgroundColor: accent, color: '#fff' }}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}Submit
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── LAYOUT: CHANGELOG — date rail left, content right ───────────────────
  const renderChangelog = () => (
    <div style={{ fontFamily: theme.font }}>
      {versions.map((ver, idx) => {
        const colors = sc(ver.status);
        const isExp = expanded[ver.id];
        const dateStr = ver.status_changed_at ? new Date(ver.status_changed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : `v${idx + 1}`;
        return (
          <div key={ver.id} className="flex gap-0" style={{ borderBottom: `1px solid ${border}20` }}>
            {/* Left rail */}
            <div className="flex-shrink-0 flex flex-col items-end pt-6 pr-6" style={{ width: '140px' }}>
              <span className="text-xs font-mono opacity-50 text-right leading-tight" style={{ color: textMuted }}>{dateStr}</span>
              <div className="w-px flex-1 mt-3" style={{ backgroundColor: `${border}40`, minHeight: '20px' }} />
            </div>
            {/* Dot */}
            <div className="flex-shrink-0 flex flex-col items-center pt-7" style={{ width: '20px' }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors.border, boxShadow: `0 0 6px ${colors.border}60` }} />
            </div>
            {/* Content */}
            <div className="flex-1 pl-6 py-6">
              <button className="w-full text-left group" onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-mono uppercase tracking-widest" style={{ color: colors.border }}>{ver.status.replace('_', ' ')}</span>
                  {isOwner && isExp && (
                    <select value={ver.status} onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="rounded px-1.5 py-0.5 text-xs border" style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: text, borderColor: border }}>
                      <option value="backlog">Backlog</option><option value="in_progress">In Progress</option>
                      <option value="qa">QA</option><option value="completed">Completed</option>
                    </select>
                  )}
                </div>
                <h3 className="text-xl font-semibold mb-1 group-hover:opacity-80 transition-opacity" style={{ color: text }}>{ver.version_name}</h3>
                {ver.description && <p className="text-sm opacity-50 mb-2" style={{ color: textMuted }}>{ver.description}</p>}
              </button>
              {isExp && (
                <div className="mt-3 space-y-1.5">
                  {ver.items?.map(item => {
                    const ic = sc(item.status);
                    return (
                      <div key={item.id} className="group flex items-start gap-3 py-1.5">
                        <span className="w-1 h-1 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: ic.border }} />
                        <div className="flex-1 min-w-0">
                          {editingTaskId === item.id ? <TaskEditForm item={item} statusColors={ic} /> : (
                            <span className="text-sm" style={{ color: item.status === 'completed' ? textMuted : text, textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>{item.title}</span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono opacity-40 flex-shrink-0 mt-0.5" style={{ color: ic.border }}>{item.status.replace('_', ' ')}</span>
                        {isOwner && editingTaskId !== item.id && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-60 transition-opacity">
                            <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }} style={{ color: textMuted }}><Edit2 className="w-3 h-3" /></button>
                            <button onClick={() => deleteItem(item.id)} className="text-red-600"><X className="w-3 h-3" /></button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <AddTaskForm ver={ver} statusColors={colors} />
                  {isOwner && (
                    <Button size="sm" variant="ghost" onClick={() => deleteVersion(ver.id)} className="text-red-600 text-xs mt-2">Delete version</Button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── LAYOUT: MAGAZINE — hero version top, smaller tiles below ────────────
  const renderMagazine = () => {
    const [hero, ...rest] = versions;
    if (!hero) return <div style={{ color: textMuted }}>No versions yet.</div>;
    const heroColors = sc(hero.status);
    const heroDone = hero.items?.filter(i => i.status === 'completed').length || 0;
    const heroTotal = hero.items?.length || 0;
    const heroPct = heroTotal > 0 ? Math.round((heroDone / heroTotal) * 100) : 0;
    return (
      <div style={{ fontFamily: theme.font }}>
        {/* Hero tile */}
        <div className="rounded-2xl overflow-hidden mb-4" style={{ backgroundColor: cardBg, border: `1px solid ${heroColors.border}30` }}>
          <div className="p-8" style={{ background: `linear-gradient(135deg, ${withOpacity(heroColors.border, 0.1)} 0%, transparent 60%)` }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest mb-2 block" style={{ color: heroColors.border }}>{hero.status.replace('_', ' ')}</span>
                <h2 className="text-4xl font-bold leading-tight mb-2" style={{ color: text }}>{hero.version_name}</h2>
                {hero.description && <p className="text-base opacity-50" style={{ color: textMuted }}>{hero.description}</p>}
              </div>
              <div className="text-right flex-shrink-0 ml-8">
                <div className="text-6xl font-bold tabular-nums" style={{ color: withOpacity(heroColors.border, 0.6) }}>{heroPct}<span className="text-2xl">%</span></div>
                <div className="text-xs mt-1 opacity-50" style={{ color: textMuted }}>{heroDone} of {heroTotal} done</div>
              </div>
            </div>
            <div className="h-1 rounded-full overflow-hidden mb-6" style={{ backgroundColor: withOpacity(heroColors.border, 0.12) }}>
              <div className="h-full rounded-full" style={{ width: `${heroPct}%`, backgroundColor: heroColors.border }} />
            </div>
            {isOwner && (
              <div className="flex gap-2 mb-4">
                <select value={hero.status} onChange={e => updateStatus('roadmap_versions', hero.id, e.target.value)}
                  className="rounded px-2 py-1 text-xs border" style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: text, borderColor: border }}>
                  <option value="backlog">Backlog</option><option value="in_progress">In Progress</option>
                  <option value="qa">QA</option><option value="completed">Completed</option>
                </select>
                <Button size="sm" variant="ghost" onClick={() => deleteVersion(hero.id)} className="text-red-600 text-xs">Delete</Button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {(expanded[hero.id] ? hero.items : hero.items?.slice(0, 6))?.map(item => {
                const ic = sc(item.status);
                return (
                  <div key={item.id} className="group flex items-center gap-2 py-1.5">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ic.border }} />
                    <span className="text-sm flex-1 truncate" style={{ color: item.status === 'completed' ? textMuted : text, textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>{item.title}</span>
                    {isOwner && <button onClick={() => deleteItem(item.id)} className="opacity-0 group-hover:opacity-60 text-red-600 flex-shrink-0"><X className="w-3 h-3" /></button>}
                  </div>
                );
              })}
            </div>
            {(hero.items?.length || 0) > 6 && (
              <button onClick={() => setExpanded(p => ({ ...p, [hero.id]: !p[hero.id] }))} className="mt-3 text-xs opacity-40 hover:opacity-70" style={{ color: textMuted }}>
                {expanded[hero.id] ? 'Show less' : `+${(hero.items?.length || 0) - 6} more tasks`}
              </button>
            )}
            <AddTaskForm ver={hero} statusColors={heroColors} />
          </div>
        </div>
        {/* Secondary grid */}
        <div className="grid grid-cols-3 gap-3">
          {rest.map(ver => {
            const colors = sc(ver.status);
            const done = ver.items?.filter(i => i.status === 'completed').length || 0;
            const total = ver.items?.length || 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div key={ver.id} className="rounded-xl p-4 flex flex-col" style={{ backgroundColor: cardBg, border: `1px solid ${colors.border}20` }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-1" style={{ backgroundColor: colors.border }} />
                  <span className="text-xs font-mono tabular-nums" style={{ color: withOpacity(colors.border, 0.6) }}>{pct}%</span>
                </div>
                <button className="text-left mb-2" onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
                  <h4 className="text-sm font-semibold leading-tight" style={{ color: text }}>{ver.version_name}</h4>
                  <span className="text-[10px] font-mono uppercase tracking-wider opacity-50 mt-0.5 block" style={{ color: colors.border }}>{ver.status.replace('_', ' ')}</span>
                </button>
                <div className="h-0.5 rounded-full mb-3" style={{ backgroundColor: withOpacity(colors.border, 0.12) }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: colors.border }} />
                </div>
                <div className="flex-1 space-y-1">
                  {ver.items?.slice(0, 3).map(item => {
                    const ic = sc(item.status);
                    return (
                      <div key={item.id} className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: ic.border }} />
                        <span className="text-xs truncate" style={{ color: item.status === 'completed' ? textMuted : text, textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>{item.title}</span>
                      </div>
                    );
                  })}
                  {(ver.items?.length || 0) > 3 && <span className="text-[10px] opacity-30" style={{ color: textMuted }}>+{(ver.items?.length || 0) - 3} more</span>}
                </div>
                {isOwner && (
                  <div className="mt-3 pt-2 flex gap-1" style={{ borderTop: `1px solid ${border}` }}>
                    <select value={ver.status} onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)}
                      className="rounded px-1 py-0.5 text-xs border flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: text, borderColor: border }}>
                      <option value="backlog">Backlog</option><option value="in_progress">In Progress</option>
                      <option value="qa">QA</option><option value="completed">Completed</option>
                    </select>
                    <button onClick={() => setAddingTo(addingTo === ver.id ? null : ver.id)} style={{ color: accent }}><Plus className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteVersion(ver.id)} className="text-red-600"><X className="w-3.5 h-3.5" /></button>
                  </div>
                )}
                {addingTo === ver.id && isOwner && (
                  <div className="mt-2 space-y-1">
                    <Input placeholder="Task..." value={newItem} onChange={e => setNewItem(e.target.value)}
                      className="w-full text-xs" style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderColor: border, color: text }} autoFocus />
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => addItem(ver.id)} disabled={!newItem.trim()} style={{ backgroundColor: accent, color: '#fff' }} className="text-xs">Add</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setAddingTo(null); setNewItem(''); }} style={{ color: textMuted }} className="text-xs">✕</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── LAYOUT: SWIMLANE — horizontal scroll, each version is a lane ────────
  const renderSwimlane = () => (
    <div style={{ fontFamily: theme.font }}>
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-0" style={{ minWidth: `${versions.length * 320}px` }}>
          {versions.map((ver, idx) => {
            const colors = sc(ver.status);
            const isLast = idx === versions.length - 1;
            return (
              <div key={ver.id} className="flex-shrink-0 flex flex-col" style={{ width: '300px', borderRight: isLast ? 'none' : `1px solid ${border}` }}>
                {/* Lane header */}
                <div className="px-5 py-4 sticky top-0" style={{ backgroundColor: withOpacity(surface, 0.95), borderBottom: `2px solid ${colors.border}40`, backdropFilter: 'blur(8px)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.border }} />
                    <span className="text-sm font-semibold" style={{ color: text }}>{ver.version_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider opacity-50" style={{ color: colors.border }}>{ver.status.replace('_', ' ')}</span>
                    <span className="text-xs font-mono opacity-30" style={{ color: textMuted }}>{ver.items?.length || 0} tasks</span>
                  </div>
                  {/* Progress bar */}
                  {(ver.items?.length || 0) > 0 && (
                    <div className="mt-2 h-0.5 rounded-full overflow-hidden" style={{ backgroundColor: withOpacity(colors.border, 0.12) }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.round(((ver.items?.filter(i => i.status === 'completed').length || 0) / (ver.items?.length || 1)) * 100)}%`, backgroundColor: colors.border }} />
                    </div>
                  )}
                  {isOwner && (
                    <div className="flex gap-1 mt-2">
                      <select value={ver.status} onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)}
                        className="rounded px-1.5 py-0.5 text-xs border flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: text, borderColor: border }}>
                        <option value="backlog">Backlog</option><option value="in_progress">In Progress</option>
                        <option value="qa">QA</option><option value="completed">Completed</option>
                      </select>
                      <button onClick={() => deleteVersion(ver.id)} className="text-red-600 opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
                {/* Tasks */}
                <div className="flex-1 p-3 space-y-2">
                  {ver.items?.map(item => {
                    const ic = sc(item.status);
                    return (
                      <div key={item.id} className="group rounded-lg p-3" style={{ backgroundColor: withOpacity(surface, 0.6), border: `1px solid ${border}` }}>
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: ic.border }} />
                          <div className="flex-1 min-w-0">
                            {editingTaskId === item.id ? <TaskEditForm item={item} statusColors={ic} /> : (
                              <>
                                <p className="text-sm leading-snug" style={{ color: item.status === 'completed' ? textMuted : text, textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>{item.title}</p>
                                {item.description && <p className="text-xs opacity-40 mt-0.5" style={{ color: textMuted }}>{item.description}</p>}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: ic.bg, color: ic.border, border: `1px solid ${ic.border}30` }}>{item.status.replace('_', ' ')}</span>
                          {isOwner && editingTaskId !== item.id && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }} style={{ color: textMuted }}><Edit2 className="w-3 h-3" /></button>
                              <button onClick={() => deleteItem(item.id)} className="text-red-600"><X className="w-3 h-3" /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {isOwner && (
                    addingTo === ver.id ? (
                      <div className="space-y-2 p-2 rounded-lg" style={{ border: `1px dashed ${border}` }}>
                        <Input placeholder="Task title..." value={newItem} onChange={e => setNewItem(e.target.value)}
                          className="w-full text-xs" style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderColor: border, color: text }} autoFocus />
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => addItem(ver.id)} disabled={!newItem.trim()} style={{ backgroundColor: accent, color: '#fff' }} className="text-xs flex-1">Add</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setAddingTo(null); setNewItem(''); }} style={{ color: textMuted }} className="text-xs">✕</Button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAddingTo(ver.id)} className="w-full py-2 text-xs flex items-center justify-center gap-1 rounded-lg opacity-30 hover:opacity-60 transition-opacity"
                        style={{ border: `1px dashed ${border}`, color: textMuted }}>
                        <Plus className="w-3 h-3" />Add task
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
          {/* Add version column */}
          {isOwner && (
            <div className="flex-shrink-0 flex flex-col p-4" style={{ width: '200px' }}>
              {addingTo === 'new-version' ? (
                <div className="space-y-2">
                  <Input value={newVersion} onChange={e => setNewVersion(e.target.value)} placeholder="Version name..."
                    className="w-full text-xs" style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderColor: border, color: text }} autoFocus />
                  <Button size="sm" onClick={addVersion} disabled={!newVersion.trim()} style={{ backgroundColor: accent, color: '#fff' }} className="w-full text-xs">Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingTo(null)} style={{ color: textMuted }} className="w-full text-xs">Cancel</Button>
                </div>
              ) : (
                <button onClick={() => setAddingTo('new-version')} className="w-full py-3 text-xs flex items-center justify-center gap-1 rounded-xl opacity-30 hover:opacity-60 transition-opacity"
                  style={{ border: `1px dashed ${border}`, color: textMuted }}>
                  <Plus className="w-3 h-3" />New lane
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── LAYOUT: CODEBLOCK — looks like a code diff / PR review ──────────────
  const renderCodeblock = () => (
    <div className="rounded-xl overflow-hidden" style={{ fontFamily: theme.font, border: `1px solid ${border}`, backgroundColor: theme.bg }}>
      {/* File header bar */}
      <div className="flex items-center gap-3 px-4 py-2.5" style={{ backgroundColor: withOpacity(surface, 0.9), borderBottom: `1px solid ${border}` }}>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3a1a1a' }} />
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3a3a1a' }} />
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1a3a1a' }} />
        </div>
        <span className="text-xs font-mono opacity-50" style={{ color: textMuted }}>roadmap.json</span>
        <span className="ml-auto text-xs font-mono opacity-30" style={{ color: textMuted }}>{versions.length} versions · {versions.reduce((a, v) => a + (v.items?.length || 0), 0)} tasks</span>
      </div>
      {/* Code content */}
      <div className="p-0">
        {versions.map((ver, vi) => {
          const colors = sc(ver.status);
          const isExp = expanded[ver.id];
          const diffMarker = ver.status === 'completed' ? '+' : ver.status === 'in_progress' ? '~' : ' ';
          const diffBg = ver.status === 'completed' ? withOpacity('#00cc33', 0.05) : ver.status === 'in_progress' ? withOpacity(accent, 0.05) : 'transparent';
          return (
            <div key={ver.id} style={{ borderBottom: `1px solid ${border}20` }}>
              {/* Version line */}
              <button className="w-full text-left flex items-center hover:bg-white/5 transition-colors"
                onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
                <span className="w-12 text-right pr-4 text-xs font-mono opacity-20 flex-shrink-0 py-2.5" style={{ color: textMuted }}>{vi + 1}</span>
                <span className="w-5 text-center text-xs font-mono flex-shrink-0 py-2.5" style={{ color: colors.border, backgroundColor: diffBg }}>{diffMarker}</span>
                <div className="flex-1 px-3 py-2.5 flex items-center gap-3" style={{ backgroundColor: diffBg }}>
                  <span className="text-xs font-mono" style={{ color: withOpacity(accent, 0.6) }}>"version"</span>
                  <span className="text-xs font-mono opacity-40" style={{ color: textMuted }}>:</span>
                  <span className="text-sm font-mono font-semibold" style={{ color: text }}>"{ver.version_name}"</span>
                  <span className="text-xs font-mono opacity-40" style={{ color: textMuted }}>,</span>
                  <span className="text-xs font-mono ml-2" style={{ color: colors.border }}>// {ver.status.replace('_', ' ')} · {ver.items?.length || 0} tasks</span>
                </div>
                <span className="px-3 py-2.5 text-xs font-mono opacity-20" style={{ color: textMuted }}>{isExp ? '▾' : '▸'}</span>
              </button>
              {/* Expanded tasks */}
              {isExp && (
                <div>
                  {isOwner && (
                    <div className="flex items-center gap-2 px-4 py-2" style={{ backgroundColor: withOpacity(surface, 0.4), borderBottom: `1px solid ${border}20` }}>
                      <select value={ver.status} onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)}
                        className="rounded px-2 py-0.5 text-xs border" style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: text, borderColor: border }}>
                        <option value="backlog">backlog</option><option value="in_progress">in_progress</option>
                        <option value="qa">qa</option><option value="completed">completed</option>
                      </select>
                      <button onClick={() => deleteVersion(ver.id)} className="text-xs opacity-50 hover:opacity-100" style={{ color: '#f87171' }}>delete</button>
                    </div>
                  )}
                  {ver.items?.map((item, ii) => {
                    const ic = sc(item.status);
                    const itemMarker = item.status === 'completed' ? '+' : item.status === 'in_progress' ? '~' : ' ';
                    const itemBg = item.status === 'completed' ? withOpacity('#00cc33', 0.04) : item.status === 'in_progress' ? withOpacity(accent, 0.04) : 'transparent';
                    return (
                      <div key={item.id} className="group flex items-center hover:bg-white/5 transition-colors" style={{ backgroundColor: itemBg }}>
                        <span className="w-12 text-right pr-4 text-xs font-mono opacity-15 flex-shrink-0 py-2" style={{ color: textMuted }}>{vi + 1}.{ii + 1}</span>
                        <span className="w-5 text-center text-xs font-mono flex-shrink-0 py-2" style={{ color: ic.border }}>{itemMarker}</span>
                        <div className="flex-1 px-3 py-2 flex items-center gap-2">
                          <span className="text-xs font-mono opacity-40" style={{ color: textMuted }}>{"  "}</span>
                          {editingTaskId === item.id ? (
                            <div className="flex-1"><TaskEditForm item={item} statusColors={ic} /></div>
                          ) : (
                            <>
                              <span className="text-sm font-mono" style={{ color: item.status === 'completed' ? textMuted : text, textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>"{item.title}"</span>
                              <span className="text-xs font-mono opacity-30" style={{ color: textMuted }}>,</span>
                              <span className="text-xs font-mono opacity-40 ml-1" style={{ color: ic.border }}>// {item.status.replace('_', ' ')}</span>
                            </>
                          )}
                        </div>
                        {isOwner && editingTaskId !== item.id && (
                          <div className="flex gap-1 pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }} style={{ color: textMuted }}><Edit2 className="w-3 h-3" /></button>
                            <button onClick={() => deleteItem(item.id)} className="text-red-600"><X className="w-3 h-3" /></button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {isOwner && (
                    addingTo === ver.id ? (
                      <div className="flex items-center gap-2 px-4 py-2" style={{ borderTop: `1px solid ${border}20` }}>
                        <span className="w-5 text-center text-xs font-mono" style={{ color: accent }}>+</span>
                        <Input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder='"new task title"'
                          className="flex-1 h-7 text-sm font-mono" style={{ backgroundColor: 'transparent', borderColor: border, color: text }} autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') addItem(ver.id); if (e.key === 'Escape') { setAddingTo(null); setNewItem(''); } }} />
                        <button onClick={() => addItem(ver.id)} style={{ color: accent }} className="text-xs font-mono">↵</button>
                        <button onClick={() => { setAddingTo(null); setNewItem(''); }} style={{ color: textMuted }} className="text-xs">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setAddingTo(ver.id)} className="w-full text-left px-4 py-2 text-xs font-mono opacity-20 hover:opacity-50 transition-opacity" style={{ color: textMuted }}>
                        <span className="w-5 inline-block text-center mr-3">+</span>// add task...
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
        {/* Closing brace */}
        <div className="flex items-center px-4 py-3">
          <span className="w-12 text-right pr-4 text-xs font-mono opacity-15" style={{ color: textMuted }}>{versions.length + 1}</span>
          <span className="w-5" />
          <span className="text-sm font-mono opacity-30" style={{ color: text }}>{'}'}</span>
        </div>
      </div>
    </div>
  );

  // ── Layout dispatcher ────────────────────────────────────────────────────
  const renderLayout = () => {
    switch (layout) {
      case 'kanban':    return renderKanban();
      case 'timeline':  return renderTimeline();
      case 'terminal':  return renderTerminal();
      case 'spotlight': return renderSpotlight();
      case 'bento':     return renderBento();
      case 'glass':     return renderGlass();
      case 'brutalist': return renderBrutalist();
      case 'accordion': return renderAccordion();
      case 'orbit':     return renderOrbit();
      case 'newspaper': return renderNewspaper();
      case 'minimal':   return renderMinimal();
      case 'sidebar':   return renderSidebar();
      case 'table':     return renderTable();
      case 'cards3d':   return renderCards3d();
      case 'changelog': return renderChangelog();
      case 'magazine':  return renderMagazine();
      case 'swimlane':  return renderSwimlane();
      case 'codeblock': return renderCodeblock();
      default:          return renderGhost();
    }
  };

  // ── Main return ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ ...bgStyle, fontFamily: theme.font }}>
      <div className={`mx-auto px-4 py-12 ${settings.roadmapWidth || 'max-w-5xl'}`}>
        {/* Header */}
        {settings.showHeader !== false && (
          <div className="mb-12">
            {onBack && (
              <button onClick={onBack} className="flex items-center gap-2 text-sm mb-6 transition-opacity hover:opacity-70" style={{ color: textMuted }}>
                <ArrowLeft className="w-4 h-4" />Back
              </button>
            )}
            <div className="flex items-start gap-4">
              {settings.showLogo && storeLogo && (
                <img src={storeLogo} alt={storeName} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
              )}
              <div className="flex-1">
                <h1 className={`${settings.mainTitleSize || 'text-4xl'} font-bold leading-tight`} style={{ color: text }}>
                  {settings.title || 'Development Roadmap'}
                </h1>
                {settings.subtitle && <p className="mt-2 text-base opacity-50" style={{ color: textMuted }}>{settings.subtitle}</p>}
                {productName && <p className="mt-1 text-sm opacity-40" style={{ color: textMuted }}>{productName}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Add version (owner, non-kanban/table/sidebar layouts) */}
        {isOwner && !['kanban', 'table', 'sidebar', 'swimlane'].includes(layout) && (
          <div className="flex gap-3 mb-8">
            <Input value={newVersion} onChange={e => setNewVersion(e.target.value)} placeholder="New version name..."
              className="max-w-xs" style={{ backgroundColor: withOpacity(surface, 0.5), borderColor: border, color: text }}
              onKeyDown={e => { if (e.key === 'Enter') addVersion(); }} />
            <Button onClick={addVersion} disabled={!newVersion.trim()} style={{ backgroundColor: accent, color: '#fff' }}>
              <Plus className="w-4 h-4 mr-1" />Add Version
            </Button>
          </div>
        )}

        {/* Main layout */}
        {versions.length === 0 ? (
          <div className="text-center py-24 opacity-30" style={{ color: textMuted }}>
            <p className="text-lg">No versions yet{isOwner ? ' — add one above' : ''}.</p>
          </div>
        ) : renderLayout()}

        {/* Suggestions */}
        {settings.showSuggestions && renderSuggestions()}
      </div>
    </div>
  );
};
