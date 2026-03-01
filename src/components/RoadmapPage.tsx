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

const STATUS_LABEL: Record<string, string> = {
  backlog: 'BACKLOG', in_progress: 'IN PROGRESS', qa: 'QA', completed: 'COMPLETED',
};

export const RoadmapPage = ({
  creatorId, isOwner, settings, storeName, storeLogo, productId,
  onBack, votingEnabled = false, sortByVotes = false, globalBackground,
}: RoadmapPageProps) => {
  const { user } = useAuth();
  const theme = getTheme(settings);
  const { accent, bg, surface, border, text, textMuted } = theme;

  const sc = (status: string) => ({
    bg: withOpacity(theme.status[status as keyof typeof theme.status] || theme.status.backlog, 0.12),
    border: theme.status[status as keyof typeof theme.status] || theme.status.backlog,
    text: theme.status[status as keyof typeof theme.status] || theme.status.backlog,
  });

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
  const [activeVersionId, setActiveVersionId] = useState<string>('');

  const fmtRelative = (d?: string) => {
    if (!d) return '';
    const ms = Date.now() - new Date(d).getTime();
    const m = Math.floor(ms/60000), h = Math.floor(ms/3600000), day = Math.floor(ms/86400000);
    if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`; if (day < 7) return `${day}d ago`;
    return new Date(d).toLocaleDateString();
  };

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
        (votes || []).forEach((vt: any) => vcMap.set(vt.item_id, (vcMap.get(vt.item_id) || 0) + 1));
        let userVoted = new Set<string>();
        if (user) {
          const { data: uv } = await (supabase as any).from('roadmap_item_votes').select('item_id').eq('user_id', user.id).in('item_id', ids);
          userVoted = new Set((uv || []).map((vt: any) => vt.item_id));
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
      if (combined.length > 0 && !activeVersionId) setActiveVersionId(combined[0].id);
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

  // ── Background ────────────────────────────────────────────────────────────
  let bgStyle: React.CSSProperties = {};
  const hasOwnBg = settings.backgroundType && settings.backgroundType !== 'default';
  if (hasOwnBg) {
    if (settings.backgroundType === 'image' && settings.backgroundImage) {
      const op = (settings.backgroundOverlayOpacity || 70) / 100;
      bgStyle = { backgroundImage: `linear-gradient(rgba(0,0,0,${op}),rgba(0,0,0,${op})),url(${settings.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' };
    } else if (settings.backgroundType === 'gradient') {
      bgStyle = { background: theme.bgGradient || `linear-gradient(180deg, ${settings.customBackgroundGradientStart} 0%, ${settings.customBackgroundGradientEnd} 100%)` };
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

  const layout = settings.layoutVariant || theme.layout || 'tactical';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={bgStyle}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: accent }} />
    </div>
  );

  // ── Shared inline edit forms ──────────────────────────────────────────────
  const TaskEditForm = ({ item }: { item: RoadmapItem }) => {
    const c = sc(item.status);
    return (
      <div className="space-y-2 py-2">
        <Input value={editingTaskTitle} onChange={e => setEditingTaskTitle(e.target.value)}
          className="w-full text-sm" style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderColor: c.border, color: text, fontFamily: theme.font }} autoFocus />
        <Textarea value={editingTaskDesc} onChange={e => setEditingTaskDesc(e.target.value)}
          placeholder="Description..." rows={2} className="w-full text-xs"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderColor: c.border, color: text, fontFamily: theme.font }} />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => updateTask(item.id, editingTaskTitle, editingTaskDesc)}
            disabled={!editingTaskTitle.trim()} style={{ backgroundColor: accent, color: '#000', fontFamily: theme.font }}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditingTaskId(null)} style={{ color: textMuted }}>Cancel</Button>
        </div>
      </div>
    );
  };

  const VersionDescEdit = ({ ver }: { ver: RoadmapVersion }) => (
    editingVersionId === ver.id ? (
      <div className="mt-2 space-y-2">
        <Textarea value={editingVersionDesc} onChange={e => setEditingVersionDesc(e.target.value)}
          rows={2} className="w-full text-xs" style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderColor: border, color: text, fontFamily: theme.font }} autoFocus />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => updateVersionDescription(ver.id, editingVersionDesc)} style={{ backgroundColor: accent, color: '#000' }}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditingVersionId(null)} style={{ color: textMuted }}>Cancel</Button>
        </div>
      </div>
    ) : (
      <>
        {ver.description && <p className="text-xs mt-1 opacity-50" style={{ color: textMuted }}>{ver.description}</p>}
        {isOwner && (
          <button onClick={() => { setEditingVersionId(ver.id); setEditingVersionDesc(ver.description || ''); }}
            className="text-xs opacity-20 hover:opacity-50 transition-opacity mt-1 flex items-center gap-1" style={{ color: textMuted }}>
            <Edit2 className="w-3 h-3" />{ver.description ? 'Edit' : 'Add description'}
          </button>
        )}
      </>
    )
  );

  const AddTaskInline = ({ ver }: { ver: RoadmapVersion }) => {
    if (!isOwner) return null;
    if (addingTo !== ver.id) return (
      <button onClick={() => setAddingTo(ver.id)}
        className="w-full text-left text-xs opacity-20 hover:opacity-50 transition-opacity py-2 flex items-center gap-2"
        style={{ color: textMuted, fontFamily: theme.font }}>
        <Plus className="w-3 h-3" />add task
      </button>
    );
    return (
      <div className="pt-2 space-y-2">
        <Input placeholder="Task title..." value={newItem} onChange={e => setNewItem(e.target.value)}
          className="w-full text-sm" style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderColor: accent, color: text, fontFamily: theme.font }} autoFocus />
        <Textarea placeholder="Description (optional)..." value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} rows={2}
          className="w-full text-xs" style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderColor: border, color: text, fontFamily: theme.font }} />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => addItem(ver.id)} disabled={!newItem.trim()} style={{ backgroundColor: accent, color: '#000' }}>Add</Button>
          <Button size="sm" variant="ghost" onClick={() => { setAddingTo(null); setNewItem(''); setNewItemDesc(''); }} style={{ color: textMuted }}>Cancel</Button>
        </div>
      </div>
    );
  };

  const OwnerVersionControls = ({ ver }: { ver: RoadmapVersion }) => {
    if (!isOwner) return null;
    return (
      <div className="flex gap-2 mt-2 pt-2" style={{ borderTop: `1px solid ${border}` }}>
        <select value={ver.status} onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)}
          className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: text, border: `1px solid ${border}`, fontFamily: theme.font }}>
          <option value="backlog">Backlog</option>
          <option value="in_progress">In Progress</option>
          <option value="qa">QA</option>
          <option value="completed">Completed</option>
        </select>
        <button onClick={() => deleteVersion(ver.id)} className="text-xs text-red-600 hover:text-red-400 px-2">Delete</button>
      </div>
    );
  };


  // ══════════════════════════════════════════════════════════════════════════
  // LAYOUT: TACTICAL
  // Dark card per version. Rounded-xl. Monospace. Numbered tasks.
  // ══════════════════════════════════════════════════════════════════════════
  const renderTactical = () => (
    <div className="space-y-3" style={{ fontFamily: theme.font }}>
      {versions.map((ver, vIdx) => {
        const c = sc(ver.status);
        const isExp = expanded[ver.id];
        const ItemIcon = STATUS_ICONS[ver.status] || Circle;
        const done = ver.items?.filter(i => i.status === 'completed').length || 0;
        const total = ver.items?.length || 0;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        return (
          <div key={ver.id} className="overflow-hidden"
            style={{ backgroundColor: withOpacity(surface, 0.85), border: `1px solid ${withOpacity(border, 0.8)}`, borderRadius: '12px' }}>
            {/* Version header */}
            <button
              className="w-full text-left flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]"
              onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
              <span className="text-xs font-bold w-6 text-center flex-shrink-0 font-mono" style={{ color: textMuted }}>
                {String(vIdx + 1).padStart(2, '0')}
              </span>
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ border: `1.5px solid ${c.border}`, backgroundColor: withOpacity(c.border, 0.12) }}>
                <ItemIcon className="w-3 h-3" style={{ color: c.border }} />
              </div>
              <span className="text-sm font-bold tracking-tight flex-1" style={{ color: text }}>{ver.version_name}</span>
              {/* Progress bar */}
              <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                <div className="w-20 h-1 rounded-full overflow-hidden" style={{ backgroundColor: withOpacity(border, 0.5) }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.border }} />
                </div>
                <span className="text-[10px] font-mono w-7 text-right" style={{ color: textMuted }}>{pct}%</span>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full tracking-widest uppercase flex-shrink-0"
                style={{ color: c.border, border: `1px solid ${withOpacity(c.border, 0.5)}`, backgroundColor: withOpacity(c.border, 0.1) }}>
                {STATUS_LABEL[ver.status]}
              </span>
              {isExp
                ? <ChevronUp className="w-3.5 h-3.5 flex-shrink-0" style={{ color: textMuted }} />
                : <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: textMuted }} />}
            </button>

            {isExp && (
              <div style={{ borderTop: `1px solid ${withOpacity(border, 0.5)}` }}>
                {ver.description && (
                  <p className="px-5 py-2.5 text-xs" style={{ color: textMuted, borderBottom: `1px solid ${withOpacity(border, 0.3)}` }}>{ver.description}</p>
                )}
                {isOwner && (
                  <div className="px-5 py-1.5" style={{ borderBottom: `1px solid ${withOpacity(border, 0.2)}` }}>
                    <button onClick={() => { setEditingVersionId(ver.id); setEditingVersionDesc(ver.description || ''); }}
                      className="text-xs flex items-center gap-1 transition-opacity hover:opacity-80" style={{ color: textMuted }}>
                      <Edit2 className="w-3 h-3" />{ver.description ? 'Edit description' : 'Add description'}
                    </button>
                  </div>
                )}
                {editingVersionId === ver.id && (
                  <div className="px-5 py-3" style={{ borderBottom: `1px solid ${border}` }}>
                    <Textarea value={editingVersionDesc} onChange={e => setEditingVersionDesc(e.target.value)}
                      rows={2} className="w-full text-xs mb-2"
                      style={{ backgroundColor: 'rgba(0,0,0,0.4)', borderColor: border, color: text, fontFamily: theme.font }} autoFocus />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateVersionDescription(ver.id, editingVersionDesc)} style={{ backgroundColor: accent, color: '#000' }}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingVersionId(null)} style={{ color: textMuted }}>Cancel</Button>
                    </div>
                  </div>
                )}

                {ver.items?.map((item, iIdx) => {
                  const ic = sc(item.status);
                  const IIcon = STATUS_ICONS[item.status] || Circle;
                  if (editingTaskId === item.id) return (
                    <div key={item.id} className="px-5 py-3" style={{ borderBottom: `1px solid ${withOpacity(border, 0.3)}` }}>
                      <TaskEditForm item={item} />
                    </div>
                  );
                  return (
                    <div key={item.id} className="group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-white/[0.025]"
                      style={{ borderBottom: `1px solid ${withOpacity(border, 0.25)}` }}>
                      <span className="text-[10px] w-5 text-center flex-shrink-0 font-mono" style={{ color: textMuted }}>
                        {String(iIdx + 1).padStart(2, '0')}
                      </span>
                      {itemVotingEnabled && item.voting_enabled !== false && (
                        <button onClick={() => toggleItemVote(item.id, item.user_has_voted || false)}
                          className="flex flex-col items-center flex-shrink-0"
                          style={{ color: item.user_has_voted ? accent : textMuted }}>
                          <ArrowUp className="w-3 h-3" />
                          <span className="text-[9px] font-bold">{item.vote_count || 0}</span>
                        </button>
                      )}
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ border: `1.5px solid ${ic.border}`, backgroundColor: withOpacity(ic.border, 0.1) }}>
                        <IIcon className="w-2.5 h-2.5" style={{ color: ic.border }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold tracking-wide leading-snug"
                          style={{ color: item.status === 'completed' ? textMuted : text,
                            textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: textMuted }}>{item.description}</p>
                        )}
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 uppercase tracking-widest"
                        style={{ color: ic.border, border: `1px solid ${withOpacity(ic.border, 0.45)}`, backgroundColor: withOpacity(ic.border, 0.08) }}>
                        {STATUS_LABEL[item.status]}
                      </span>
                      {isOwner && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }}
                            className="p-1 hover:bg-white/10 rounded-lg" style={{ color: textMuted }}><Edit2 className="w-3 h-3" /></button>
                          <button onClick={() => deleteItem(item.id)} className="p-1 hover:bg-red-900/30 rounded-lg text-red-500"><X className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="px-5 py-3">
                  <AddTaskInline ver={ver} />
                </div>
                <OwnerVersionControls ver={ver} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );


  // ══════════════════════════════════════════════════════════════════════════
  // LAYOUT: CYBER
  // Deep navy. Neon glow. Rounded-xl panels with glowing left-border accent.
  // Progress bar in header. Tasks: glowing dot + text.
  // ══════════════════════════════════════════════════════════════════════════
  const renderCyber = () => (
    <div className="space-y-4" style={{ fontFamily: theme.font }}>
      {versions.map(ver => {
        const c = sc(ver.status);
        const isExp = expanded[ver.id];
        const done = ver.items?.filter(i => i.status === 'completed').length || 0;
        const total = ver.items?.length || 0;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        return (
          <div key={ver.id} style={{
            border: `1px solid ${withOpacity(c.border, 0.3)}`,
            backgroundColor: withOpacity(surface, 0.65),
            borderRadius: '14px',
            boxShadow: `0 0 24px ${withOpacity(c.border, 0.07)}, inset 0 1px 0 ${withOpacity(c.border, 0.08)}`,
            overflow: 'hidden',
          }}>
            {/* HUD header */}
            <button className="w-full text-left flex items-center gap-4 px-5 py-4"
              style={{ borderLeft: `3px solid ${c.border}`, borderBottom: isExp ? `1px solid ${withOpacity(c.border, 0.18)}` : 'none' }}
              onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
              {/* Glowing dot */}
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: c.border, boxShadow: `0 0 8px ${c.border}, 0 0 20px ${withOpacity(c.border, 0.5)}` }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-bold tracking-widest uppercase" style={{ color: text }}>{ver.version_name}</span>
                  <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full"
                    style={{ color: c.border, border: `1px solid ${withOpacity(c.border, 0.5)}`, backgroundColor: withOpacity(c.border, 0.1) }}>
                    {STATUS_LABEL[ver.status]}
                  </span>
                </div>
                {ver.description && (
                  <p className="text-xs mt-0.5" style={{ color: textMuted }}>{ver.description}</p>
                )}
              </div>
              {/* Progress */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: withOpacity(c.border, 0.15) }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: c.border, boxShadow: `0 0 8px ${c.border}` }} />
                  </div>
                  <span className="text-[11px] font-bold font-mono w-8 text-right" style={{ color: c.border }}>{pct}%</span>
                </div>
                {isExp
                  ? <ChevronUp className="w-3.5 h-3.5" style={{ color: textMuted }} />
                  : <ChevronDown className="w-3.5 h-3.5" style={{ color: textMuted }} />}
              </div>
            </button>

            {isExp && (
              <div className="px-5 pb-4">
                {isOwner && (
                  <div className="py-2" style={{ borderBottom: `1px solid ${withOpacity(border, 0.3)}` }}>
                    <button onClick={() => { setEditingVersionId(ver.id); setEditingVersionDesc(ver.description || ''); }}
                      className="text-xs flex items-center gap-1 transition-opacity hover:opacity-80" style={{ color: textMuted }}>
                      <Edit2 className="w-3 h-3" />{ver.description ? 'Edit description' : 'Add description'}
                    </button>
                  </div>
                )}
                {editingVersionId === ver.id && (
                  <div className="py-3" style={{ borderBottom: `1px solid ${border}` }}>
                    <Textarea value={editingVersionDesc} onChange={e => setEditingVersionDesc(e.target.value)}
                      rows={2} className="w-full text-xs mb-2"
                      style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderColor: border, color: text, fontFamily: theme.font }} autoFocus />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateVersionDescription(ver.id, editingVersionDesc)} style={{ backgroundColor: accent, color: '#000' }}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingVersionId(null)} style={{ color: textMuted }}>Cancel</Button>
                    </div>
                  </div>
                )}

                {ver.items?.map((item, idx) => {
                  const ic = sc(item.status);
                  if (editingTaskId === item.id) return (
                    <div key={item.id} className="py-3" style={{ borderBottom: `1px solid ${withOpacity(border, 0.25)}` }}>
                      <TaskEditForm item={item} />
                    </div>
                  );
                  return (
                    <div key={item.id} className="group flex items-center gap-4 py-3 transition-colors hover:bg-white/[0.025] rounded-lg"
                      style={{ borderBottom: `1px solid ${withOpacity(border, 0.2)}`, marginTop: idx === 0 ? '8px' : '0' }}>
                      {itemVotingEnabled && item.voting_enabled !== false && (
                        <button onClick={() => toggleItemVote(item.id, item.user_has_voted || false)}
                          className="flex flex-col items-center flex-shrink-0"
                          style={{ color: item.user_has_voted ? accent : textMuted }}>
                          <ArrowUp className="w-3 h-3" />
                          <span className="text-[9px] font-bold">{item.vote_count || 0}</span>
                        </button>
                      )}
                      {/* Glowing status dot */}
                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: ic.border, boxShadow: `0 0 6px ${ic.border}, 0 0 14px ${withOpacity(ic.border, 0.4)}` }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium" style={{ color: item.status === 'completed' ? textMuted : text,
                          textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>
                          {item.title}
                        </span>
                        {item.description && (
                          <p className="text-xs mt-0.5" style={{ color: textMuted }}>{item.description}</p>
                        )}
                      </div>
                      <span className="text-[10px] font-bold font-mono tracking-widest flex-shrink-0 px-2.5 py-0.5 rounded-full"
                        style={{ color: ic.border, backgroundColor: withOpacity(ic.border, 0.1), border: `1px solid ${withOpacity(ic.border, 0.3)}` }}>
                        {STATUS_LABEL[item.status]}
                      </span>
                      {isOwner && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }}
                            className="p-1 hover:bg-white/10 rounded-lg" style={{ color: textMuted }}><Edit2 className="w-3 h-3" /></button>
                          <button onClick={() => deleteItem(item.id)} className="p-1 hover:bg-red-900/30 rounded-lg text-red-500"><X className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="pt-2">
                  <AddTaskInline ver={ver} />
                </div>
                <OwnerVersionControls ver={ver} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
      {versions.map(ver => {
        const c = sc(ver.status);
        const isExp = expanded[ver.id];
        const done = ver.items?.filter(i => i.status === 'completed').length || 0;
        const total = ver.items?.length || 0;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        return (
          <div key={ver.id} style={{
            border: `1px solid ${withOpacity(c.border, 0.35)}`,
            backgroundColor: withOpacity(surface, 0.7),
            boxShadow: `0 0 20px ${withOpacity(c.border, 0.06)}`,
          }}>
            {/* HUD header */}
            <button className="w-full text-left flex items-center gap-4 px-5 py-4"
              style={{ borderLeft: `3px solid ${c.border}`, borderBottom: isExp ? `1px solid ${withOpacity(c.border, 0.2)}` : 'none' }}
              onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
              {/* Glowing dot */}
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: c.border, boxShadow: `0 0 8px ${c.border}, 0 0 20px ${withOpacity(c.border, 0.5)}` }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
  // ══════════════════════════════════════════════════════════════════════════
  // LAYOUT: GHOST
  // No cards. Pure typography. Version = large heading + thin rule.
  // Tasks = indented lines with colored dot. Clean and readable.
  // ══════════════════════════════════════════════════════════════════════════
  const renderGhost = () => (
    <div className="space-y-10" style={{ fontFamily: theme.font }}>
      {versions.map(ver => {
        const c = sc(ver.status);
        const isExp = expanded[ver.id];
        const done = ver.items?.filter(i => i.status === 'completed').length || 0;
        const total = ver.items?.length || 0;
        return (
          <div key={ver.id}>
            <button className="w-full text-left"
              onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
              <div className="flex items-center gap-4 pb-3" style={{ borderBottom: `1px solid ${withOpacity(border, 0.7)}` }}>
                <span className="text-xl font-bold" style={{ color: text }}>{ver.version_name}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={{ color: c.border, backgroundColor: withOpacity(c.border, 0.1), border: `1px solid ${withOpacity(c.border, 0.35)}` }}>
                  {STATUS_LABEL[ver.status]}
                </span>
                <span className="ml-auto text-xs" style={{ color: textMuted }}>{done}/{total}</span>
                {isExp
                  ? <ChevronUp className="w-3.5 h-3.5" style={{ color: textMuted }} />
                  : <ChevronDown className="w-3.5 h-3.5" style={{ color: textMuted }} />}
              </div>
            </button>

            {isExp && (
              <div className="mt-5 pl-2">
                {ver.description && (
                  <p className="text-sm mb-4 leading-relaxed" style={{ color: textMuted }}>{ver.description}</p>
                )}
                {isOwner && (
                  <button onClick={() => { setEditingVersionId(ver.id); setEditingVersionDesc(ver.description || ''); }}
                    className="text-xs flex items-center gap-1 mb-4 transition-opacity hover:opacity-80" style={{ color: textMuted }}>
                    <Edit2 className="w-3 h-3" />{ver.description ? 'Edit description' : 'Add description'}
                  </button>
                )}
                {editingVersionId === ver.id && (
                  <div className="mb-4">
                    <Textarea value={editingVersionDesc} onChange={e => setEditingVersionDesc(e.target.value)}
                      rows={2} className="w-full text-xs mb-2"
                      style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: border, color: text, fontFamily: theme.font }} autoFocus />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateVersionDescription(ver.id, editingVersionDesc)} style={{ backgroundColor: accent, color: '#000' }}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingVersionId(null)} style={{ color: textMuted }}>Cancel</Button>
                    </div>
                  </div>
                )}

                {ver.items?.map(item => {
                  const ic = sc(item.status);
                  if (editingTaskId === item.id) return (
                    <div key={item.id} className="py-2"><TaskEditForm item={item} /></div>
                  );
                  return (
                    <div key={item.id} className="group flex items-start gap-3 py-2.5"
                      style={{ borderBottom: `1px solid ${withOpacity(border, 0.2)}` }}>
                      {itemVotingEnabled && item.voting_enabled !== false && (
                        <button onClick={() => toggleItemVote(item.id, item.user_has_voted || false)}
                          className="flex flex-col items-center flex-shrink-0 mt-1"
                          style={{ color: item.user_has_voted ? accent : textMuted }}>
                          <ArrowUp className="w-3 h-3" />
                          <span className="text-[9px] font-bold">{item.vote_count || 0}</span>
                        </button>
                      )}
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: ic.border }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm leading-snug"
                          style={{ color: item.status === 'completed' ? textMuted : text,
                            textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>
                          {item.title}
                        </span>
                        {item.description && (
                          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: textMuted }}>{item.description}</p>
                        )}
                      </div>
                      <span className="text-[10px] flex-shrink-0 font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: ic.border, backgroundColor: withOpacity(ic.border, 0.1) }}>
                        {STATUS_LABEL[item.status]}
                      </span>
                      {isOwner && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }}
                            className="p-1 hover:bg-white/10 rounded-lg" style={{ color: textMuted }}><Edit2 className="w-3 h-3" /></button>
                          <button onClick={() => deleteItem(item.id)} className="p-1 hover:bg-red-900/30 rounded-lg text-red-500"><X className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="pt-2">
                  <AddTaskInline ver={ver} />
                </div>
                <OwnerVersionControls ver={ver} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );


  // ══════════════════════════════════════════════════════════════════════════
  // LAYOUT: MATRIX
  // Green on black. Terminal aesthetic. Rounded outer container.
  // Version = $ command line. Tasks = log output lines.
  // ══════════════════════════════════════════════════════════════════════════
  const renderMatrix = () => {
    const prefixMap: Record<string, string> = {
      backlog: '[ ]', in_progress: '[~]', qa: '[?]', completed: '[✓]',
    };
    const prefixColorMap: Record<string, string> = {
      backlog: theme.status.backlog,
      in_progress: theme.status.in_progress,
      qa: theme.status.qa,
      completed: theme.status.completed,
    };
    return (
      <div style={{ fontFamily: theme.font, borderRadius: '14px', overflow: 'hidden', border: `1px solid ${withOpacity(border, 0.8)}` }}>
        {/* Terminal window chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5"
          style={{ backgroundColor: '#0a0f0a', borderBottom: `1px solid ${withOpacity(border, 0.6)}` }}>
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ff5f57' }} />
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#febc2e' }} />
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#28c840' }} />
          <span className="ml-4 text-xs" style={{ color: withOpacity(accent, 0.45) }}>roadmap — bash — 80×24</span>
        </div>

        <div className="px-5 py-5 space-y-6" style={{ backgroundColor: withOpacity(surface, 0.9) }}>
          {versions.map((ver) => {
            const c = sc(ver.status);
            const isExp = expanded[ver.id];
            return (
              <div key={ver.id}>
                {/* Command line */}
                <button className="w-full text-left flex items-center gap-2 group py-1"
                  onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
                  <span className="font-bold" style={{ color: withOpacity(accent, 0.6) }}>$</span>
                  <span className="text-sm" style={{ color: withOpacity(accent, 0.5) }}>load</span>
                  <span className="text-sm font-bold" style={{ color: accent }}>{ver.version_name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: c.border, backgroundColor: withOpacity(c.border, 0.12) }}>
                    --status={ver.status}
                  </span>
                  <span className="text-xs" style={{ color: withOpacity(accent, 0.4) }}>
                    ({ver.items?.filter(i => i.status === 'completed').length || 0}/{ver.items?.length || 0})
                  </span>
                  <span className="ml-auto text-xs" style={{ color: withOpacity(accent, 0.3) }}>{isExp ? '▼' : '▶'}</span>
                </button>

                {isExp && (
                  <div className="mt-1 pl-4 border-l" style={{ borderColor: withOpacity(accent, 0.15) }}>
                    {ver.description && (
                      <p className="text-xs py-1.5" style={{ color: withOpacity(accent, 0.5) }}># {ver.description}</p>
                    )}
                    {isOwner && (
                      <button onClick={() => { setEditingVersionId(ver.id); setEditingVersionDesc(ver.description || ''); }}
                        className="text-xs flex items-center gap-1 py-1 transition-opacity hover:opacity-80" style={{ color: withOpacity(accent, 0.4) }}>
                        <Edit2 className="w-3 h-3" />{ver.description ? 'edit description' : 'add description'}
                      </button>
                    )}
                    {editingVersionId === ver.id && (
                      <div className="py-2">
                        <Textarea value={editingVersionDesc} onChange={e => setEditingVersionDesc(e.target.value)}
                          rows={2} className="w-full text-xs mb-2"
                          style={{ backgroundColor: 'rgba(0,20,0,0.6)', borderColor: withOpacity(accent, 0.3), color: accent, fontFamily: theme.font }} autoFocus />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => updateVersionDescription(ver.id, editingVersionDesc)} style={{ backgroundColor: accent, color: '#000' }}>save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingVersionId(null)} style={{ color: textMuted }}>cancel</Button>
                        </div>
                      </div>
                    )}

                    {ver.items?.map((item) => {
                      const ic = sc(item.status);
                      const prefix = prefixMap[item.status] || '[ ]';
                      const prefixColor = prefixColorMap[item.status] || textMuted;
                      if (editingTaskId === item.id) return (
                        <div key={item.id} className="py-2"><TaskEditForm item={item} /></div>
                      );
                      return (
                        <div key={item.id} className="group flex items-start gap-3 py-1.5 hover:bg-white/[0.02] transition-colors rounded">
                          {itemVotingEnabled && item.voting_enabled !== false && (
                            <button onClick={() => toggleItemVote(item.id, item.user_has_voted || false)}
                              className="flex-shrink-0 text-[10px] font-bold mt-0.5"
                              style={{ color: item.user_has_voted ? accent : textMuted }}>
                              +{item.vote_count || 0}
                            </button>
                          )}
                          <span className="text-xs font-bold font-mono flex-shrink-0 w-8 mt-0.5" style={{ color: prefixColor }}>{prefix}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm"
                              style={{ color: item.status === 'completed' ? withOpacity(accent, 0.4) : accent,
                                textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>
                              {item.title}
                            </span>
                            {item.description && (
                              <p className="text-xs mt-0.5" style={{ color: withOpacity(accent, 0.4) }}>  # {item.description}</p>
                            )}
                          </div>
                          {isOwner && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }}
                                className="p-1 hover:bg-white/10 rounded-lg" style={{ color: textMuted }}><Edit2 className="w-3 h-3" /></button>
                              <button onClick={() => deleteItem(item.id)} className="p-1 hover:bg-red-900/30 rounded-lg text-red-500"><X className="w-3 h-3" /></button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="pt-1">
                      <AddTaskInline ver={ver} />
                    </div>
                    <OwnerVersionControls ver={ver} />
                  </div>
                )}
              </div>
            );
          })}
          {/* Blinking cursor */}
          <div className="flex items-center gap-2">
            <span className="font-bold" style={{ color: withOpacity(accent, 0.6) }}>$</span>
            <span className="text-sm animate-pulse" style={{ color: accent }}>█</span>
          </div>
        </div>
      </div>
    );
  };


  // ══════════════════════════════════════════════════════════════════════════
  // LAYOUT: SLATE
  // Dark slate. Clean SaaS. Left sidebar nav, right content panel.
  // Each version gets a unique accent color. Dense rows with pill badges.
  // ══════════════════════════════════════════════════════════════════════════
  const renderSlate = () => {
    const activeVer = versions.find(v => v.id === activeVersionId) || versions[0];
    const versionAccents = ['#6470f0','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899'];
    return (
      <div className="flex min-h-[520px]" style={{ fontFamily: theme.font, border: `1px solid ${border}` }}>
        {/* Left sidebar */}
        <div className="w-52 flex-shrink-0 flex flex-col" style={{ borderRight: `1px solid ${border}`, backgroundColor: withOpacity(surface, 0.5) }}>
          {isOwner && (
            <div className="p-3" style={{ borderBottom: `1px solid ${border}` }}>
              <div className="flex gap-1">
                <Input value={newVersion} onChange={e => setNewVersion(e.target.value)} placeholder="New version..."
                  className="flex-1 text-xs h-7" style={{ backgroundColor: 'rgba(0,0,0,0.4)', borderColor: border, color: text, fontFamily: theme.font }}
                  onKeyDown={e => { if (e.key === 'Enter') addVersion(); }} />
                <Button size="sm" onClick={addVersion} disabled={!newVersion.trim()} className="h-7 px-2" style={{ backgroundColor: accent, color: '#fff' }}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
          <div className="flex-1 py-1 overflow-y-auto">
            {versions.map((ver, idx) => {
              const va = versionAccents[idx % versionAccents.length];
              const isActive = ver.id === activeVersionId;
              const c = sc(ver.status);
              const done = ver.items?.filter(i => i.status === 'completed').length || 0;
              const total = ver.items?.length || 0;
              return (
                <button key={ver.id} onClick={() => setActiveVersionId(ver.id)}
                  className="w-full text-left px-3 py-3 flex items-start gap-2.5 transition-colors"
                  style={{
                    backgroundColor: isActive ? withOpacity(va, 0.12) : 'transparent',
                    borderLeft: `2px solid ${isActive ? va : 'transparent'}`,
                  }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: c.border }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: isActive ? text : textMuted }}>{ver.version_name}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: isActive ? withOpacity(va, 0.9) : withOpacity(textMuted, 0.6) }}>
                      {done}/{total} done
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 min-w-0 flex flex-col">
          {activeVer ? (() => {
            const va = versionAccents[versions.indexOf(activeVer) % versionAccents.length];
            const c = sc(activeVer.status);
            return (
              <>
                {/* Panel header */}
                <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${border}` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: va }} />
                    <span className="text-base font-bold" style={{ color: text }}>{activeVer.version_name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                      style={{ color: va, border: `1px solid ${withOpacity(va, 0.4)}`, backgroundColor: withOpacity(va, 0.12) }}>
                      {STATUS_LABEL[activeVer.status]}
                    </span>
                  </div>
                  {isOwner && (
                    <div className="flex gap-2 items-center">
                      <select value={activeVer.status} onChange={e => updateStatus('roadmap_versions', activeVer.id, e.target.value)}
                        className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: text, border: `1px solid ${border}`, fontFamily: theme.font }}>
                        <option value="backlog">Backlog</option>
                        <option value="in_progress">In Progress</option>
                        <option value="qa">QA</option>
                        <option value="completed">Completed</option>
                      </select>
                      <button onClick={() => deleteVersion(activeVer.id)} className="text-xs text-red-500 hover:text-red-400 px-1">Delete</button>
                    </div>
                  )}
                </div>

                {/* Description */}
                {activeVer.description && (
                  <p className="px-5 py-2 text-xs" style={{ color: textMuted, borderBottom: `1px solid ${border}30` }}>{activeVer.description}</p>
                )}
                {isOwner && editingVersionId !== activeVer.id && (
                  <div className="px-5 py-1.5" style={{ borderBottom: `1px solid ${border}20` }}>
                    <button onClick={() => { setEditingVersionId(activeVer.id); setEditingVersionDesc(activeVer.description || ''); }}
                      className="text-xs flex items-center gap-1 transition-opacity hover:opacity-80" style={{ color: textMuted }}>
                      <Edit2 className="w-3 h-3" />{activeVer.description ? 'Edit description' : 'Add description'}
                    </button>
                  </div>
                )}
                {editingVersionId === activeVer.id && (
                  <div className="px-5 py-3" style={{ borderBottom: `1px solid ${border}30` }}>
                    <Textarea value={editingVersionDesc} onChange={e => setEditingVersionDesc(e.target.value)}
                      rows={2} className="w-full text-xs mb-2"
                      style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderColor: border, color: text, fontFamily: theme.font }} autoFocus />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateVersionDescription(activeVer.id, editingVersionDesc)} style={{ backgroundColor: va, color: '#fff' }}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingVersionId(null)} style={{ color: textMuted }}>Cancel</Button>
                    </div>
                  </div>
                )}

                {/* Task rows */}
                <div className="flex-1 overflow-y-auto">
                  {activeVer.items?.map(item => {
                    const ic = sc(item.status);
                    if (editingTaskId === item.id) return (
                      <div key={item.id} className="px-5 py-3" style={{ borderBottom: `1px solid ${border}20` }}>
                        <TaskEditForm item={item} />
                      </div>
                    );
                    return (
                      <div key={item.id} className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.025]"
                        style={{ borderBottom: `1px solid ${border}25` }}>
                        {itemVotingEnabled && item.voting_enabled !== false && (
                          <button onClick={() => toggleItemVote(item.id, item.user_has_voted || false)}
                            className="flex flex-col items-center flex-shrink-0"
                            style={{ color: item.user_has_voted ? va : textMuted }}>
                            <ArrowUp className="w-3 h-3" />
                            <span className="text-[9px] font-bold">{item.vote_count || 0}</span>
                          </button>
                        )}
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ic.border }} />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm" style={{ color: item.status === 'completed' ? textMuted : text }}>{item.title}</span>
                          {item.description && (
                            <p className="text-xs mt-0.5" style={{ color: textMuted }}>{item.description}</p>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0 uppercase tracking-wide"
                          style={{ backgroundColor: withOpacity(ic.border, 0.15), color: ic.border, border: `1px solid ${withOpacity(ic.border, 0.35)}` }}>
                          {STATUS_LABEL[item.status]}
                        </span>
                        {isOwner && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button onClick={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); setEditingTaskDesc(item.description || ''); }}
                              className="p-1 hover:bg-white/10 rounded" style={{ color: textMuted }}><Edit2 className="w-3 h-3" /></button>
                            <button onClick={() => deleteItem(item.id)} className="p-1 hover:bg-red-900/30 rounded text-red-600"><X className="w-3 h-3" /></button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add task */}
                {isOwner && (
                  <div className="px-5 py-3" style={{ borderTop: `1px solid ${border}` }}>
                    {addingTo === activeVer.id ? (
                      <div className="space-y-2">
                        <Input placeholder="Task title..." value={newItem} onChange={e => setNewItem(e.target.value)}
                          className="w-full text-sm" style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderColor: va, color: text, fontFamily: theme.font }} autoFocus />
                        <Textarea placeholder="Description (optional)..." value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} rows={2}
                          className="w-full text-xs" style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderColor: border, color: text, fontFamily: theme.font }} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => addItem(activeVer.id)} disabled={!newItem.trim()} style={{ backgroundColor: va, color: '#fff' }}>Add</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setAddingTo(null); setNewItem(''); setNewItemDesc(''); }} style={{ color: textMuted }}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAddingTo(activeVer.id)}
                        className="text-xs flex items-center gap-2 transition-opacity hover:opacity-80" style={{ color: textMuted }}>
                        <Plus className="w-3 h-3" />Add task
                      </button>
                    )}
                  </div>
                )}
              </>
            );
          })() : (
            <div className="flex items-center justify-center flex-1" style={{ color: textMuted }}>
              <p className="text-sm">Select a version</p>
            </div>
          )}
        </div>
      </div>
    );
  };


  // ══════════════════════════════════════════════════════════════════════════
  // SUGGESTIONS PANEL
  // ══════════════════════════════════════════════════════════════════════════
  const renderSuggestions = () => {
    const FORUM_STATUS_COLORS: Record<string, string> = {
      open: '#555', planned: '#5b6af0', in_progress: accent, completed: '#059669', declined: '#dc2626',
    };
    const FORUM_STATUS_LABELS: Record<string, string> = {
      open: 'Open', planned: 'Planned', in_progress: 'In Progress', completed: 'Completed', declined: 'Declined',
    };
    const sorted = [...suggestions].sort((a, b) => {
      if (sortBy === 'upvotes') return b.upvotes - a.upvotes;
      if (sortBy === 'discussed') return (b.reply_count || 0) - (a.reply_count || 0);
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    if (selectedSuggestion) {
      const s = selectedSuggestion;
      const fsc = FORUM_STATUS_COLORS[s.forum_status || 'open'];
      return (
        <div className="mt-12" style={{ fontFamily: theme.font }}>
          <button onClick={() => { setSelectedSuggestion(null); setSuggestionReplies([]); }}
            className="flex items-center gap-2 text-xs mb-6 opacity-50 hover:opacity-100 transition-opacity" style={{ color: textMuted }}>
            <ArrowLeft className="w-3 h-3" />Back to suggestions
          </button>
          <div className="p-5" style={{ backgroundColor: withOpacity(surface, 0.6), border: `1px solid ${border}` }}>
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className="text-lg font-bold" style={{ color: text }}>{s.title}</h3>
              <span className="text-[10px] font-bold px-2.5 py-1 uppercase tracking-widest flex-shrink-0"
                style={{ color: fsc, border: `1px solid ${fsc}`, backgroundColor: withOpacity(fsc, 0.08) }}>
                {FORUM_STATUS_LABELS[s.forum_status || 'open']}
              </span>
            </div>
            {s.description && <p className="text-sm mb-4 leading-relaxed" style={{ color: textMuted }}>{s.description}</p>}
            <div className="flex items-center gap-4 text-xs" style={{ color: textMuted }}>
              <span>{s.author?.display_name || 'Anonymous'}</span>
              <span>{fmtRelative(s.created_at)}</span>
              <button onClick={() => toggleUpvote(s.id, s.user_upvoted || false)}
                className="flex items-center gap-1 transition-colors"
                style={{ color: s.user_upvoted ? accent : textMuted }}>
                <ArrowUp className="w-3 h-3" />{s.upvotes}
              </button>
            </div>
            {isOwner && (
              <div className="mt-4 pt-4 flex gap-2 flex-wrap" style={{ borderTop: `1px solid ${border}` }}>
                {Object.entries(FORUM_STATUS_LABELS).map(([k, v]) => (
                  <button key={k} onClick={() => updateSuggestionStatus(s.id, k)}
                    className="text-[10px] px-2.5 py-1 uppercase tracking-widest transition-all"
                    style={{
                      color: s.forum_status === k ? FORUM_STATUS_COLORS[k] : textMuted,
                      border: `1px solid ${s.forum_status === k ? FORUM_STATUS_COLORS[k] : border}`,
                      backgroundColor: s.forum_status === k ? withOpacity(FORUM_STATUS_COLORS[k], 0.1) : 'transparent',
                    }}>{v}</button>
                ))}
                <button onClick={() => deleteSuggestion(s.id)} className="text-[10px] px-2.5 py-1 text-red-600 border border-red-900 hover:bg-red-900/20 transition-colors uppercase tracking-widest">Delete</button>
              </div>
            )}
          </div>

          {/* Replies */}
          <div className="mt-6 space-y-3">
            {loadingReplies ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" style={{ color: accent }} /></div>
            ) : suggestionReplies.map(r => (
              <div key={r.id} className="flex gap-3 py-3" style={{ borderBottom: `1px solid ${border}20` }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{ backgroundColor: withOpacity(accent, 0.15), color: accent }}>
                  {(r.author?.display_name || 'A')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold" style={{ color: text }}>{r.author?.display_name || 'Anonymous'}</span>
                    {r.is_creator && (
                      <span className="text-[9px] px-1.5 py-0.5 uppercase tracking-widest font-bold"
                        style={{ color: accent, border: `1px solid ${withOpacity(accent, 0.4)}`, backgroundColor: withOpacity(accent, 0.08) }}>Creator</span>
                    )}
                    <span className="text-xs opacity-30" style={{ color: textMuted }}>{fmtRelative(r.created_at)}</span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{r.content}</p>
                </div>
              </div>
            ))}
          </div>

          {user ? (
            <div className="mt-4 flex gap-2">
              <input value={replyContent} onChange={e => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 text-sm px-3 py-2 outline-none"
                style={{ backgroundColor: withOpacity(surface, 0.6), border: `1px solid ${border}`, color: text, fontFamily: theme.font }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply(); } }} />
              <button onClick={submitReply} disabled={submitting || !replyContent.trim()}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-30"
                style={{ backgroundColor: accent, color: '#000' }}>
                {submitting ? '...' : 'Reply'}
              </button>
            </div>
          ) : (
            <p className="mt-4 text-xs opacity-40" style={{ color: textMuted }}>Sign in to reply.</p>
          )}
        </div>
      );
    }

    return (
      <div className="mt-16" style={{ fontFamily: theme.font }}>
        {/* Section header */}
        <div className="flex items-center justify-between mb-6" style={{ borderBottom: `1px solid ${border}`, paddingBottom: '16px' }}>
          <div className="flex items-center gap-3">
            <Lightbulb className="w-4 h-4" style={{ color: accent }} />
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: text }}>Suggestions</span>
            <span className="text-xs opacity-40" style={{ color: textMuted }}>{suggestions.length}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Sort */}
            <div className="flex gap-1">
              {(['upvotes', 'newest', 'discussed'] as const).map(s => (
                <button key={s} onClick={() => setSortBy(s)}
                  className="text-[10px] px-2.5 py-1 uppercase tracking-widest transition-all"
                  style={{
                    color: sortBy === s ? accent : textMuted,
                    border: `1px solid ${sortBy === s ? accent : border}`,
                    backgroundColor: sortBy === s ? withOpacity(accent, 0.08) : 'transparent',
                  }}>{s}</button>
              ))}
            </div>
            {user && (
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 text-[10px] px-3 py-1 font-bold uppercase tracking-widest transition-colors"
                style={{ backgroundColor: accent, color: '#000' }}>
                <Plus className="w-3 h-3" />Suggest
              </button>
            )}
          </div>
        </div>

        {/* Suggestion list */}
        {sorted.length === 0 ? (
          <div className="py-12 text-center opacity-20" style={{ color: textMuted }}>
            <Lightbulb className="w-8 h-8 mx-auto mb-3" />
            <p className="text-sm">No suggestions yet. Be the first.</p>
          </div>
        ) : (
          <div>
            {sorted.map(s => {
              const fsc = FORUM_STATUS_COLORS[s.forum_status || 'open'];
              return (
                <div key={s.id} className="group flex items-start gap-4 py-4 cursor-pointer transition-colors hover:bg-white/[0.015]"
                  style={{ borderBottom: `1px solid ${border}30` }}
                  onClick={() => { setSelectedSuggestion(s); fetchReplies(s.id); }}>
                  {/* Upvote */}
                  <button onClick={e => { e.stopPropagation(); toggleUpvote(s.id, s.user_upvoted || false); }}
                    className="flex flex-col items-center gap-0.5 flex-shrink-0 w-8 transition-colors"
                    style={{ color: s.user_upvoted ? accent : textMuted }}>
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold">{s.upvotes}</span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight" style={{ color: text }}>{s.title}</p>
                    {s.description && <p className="text-xs mt-1 opacity-50 line-clamp-2" style={{ color: textMuted }}>{s.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs opacity-40" style={{ color: textMuted }}>
                      <span>{s.author?.display_name || 'Anonymous'}</span>
                      <span>{fmtRelative(s.created_at)}</span>
                      {(s.reply_count || 0) > 0 && (
                        <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{s.reply_count}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 uppercase tracking-widest flex-shrink-0"
                    style={{ color: fsc, border: `1px solid ${withOpacity(fsc, 0.5)}`, backgroundColor: withOpacity(fsc, 0.06) }}>
                    {FORUM_STATUS_LABELS[s.forum_status || 'open']}
                  </span>
                  {isOwner && (
                    <button onClick={e => { e.stopPropagation(); deleteSuggestion(s.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-900/30 rounded text-red-600 flex-shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Submit modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
            <div className="w-full max-w-md p-6" style={{ backgroundColor: surface, border: `1px solid ${border}`, fontFamily: theme.font }}>
              <div className="flex items-center justify-between mb-5">
                <span className="text-sm font-bold uppercase tracking-widest" style={{ color: text }}>New Suggestion</span>
                <button onClick={() => setShowModal(false)} style={{ color: textMuted }}><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                <input value={suggestionTitle} onChange={e => setSuggestionTitle(e.target.value)}
                  placeholder="Title..."
                  className="w-full text-sm px-3 py-2.5 outline-none"
                  style={{ backgroundColor: 'rgba(0,0,0,0.4)', border: `1px solid ${border}`, color: text, fontFamily: theme.font }} />
                <textarea value={suggestionDesc} onChange={e => setSuggestionDesc(e.target.value)}
                  placeholder="Description (optional)..." rows={3}
                  className="w-full text-sm px-3 py-2.5 outline-none resize-none"
                  style={{ backgroundColor: 'rgba(0,0,0,0.4)', border: `1px solid ${border}`, color: text, fontFamily: theme.font }} />
                <div className="flex gap-2 pt-1">
                  <button onClick={submitSuggestion} disabled={submitting || !suggestionTitle.trim()}
                    className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-30"
                    style={{ backgroundColor: accent, color: '#000' }}>
                    {submitting ? 'Submitting...' : 'Submit'}
                  </button>
                  <button onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 text-xs uppercase tracking-widest transition-colors"
                    style={{ border: `1px solid ${border}`, color: textMuted }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Layout dispatcher ─────────────────────────────────────────────────────
  const renderLayout = () => {
    switch (layout) {
      case 'cyber':   return renderCyber();
      case 'ghost':   return renderGhost();
      case 'matrix':  return renderMatrix();
      case 'slate':   return renderSlate();
      default:        return renderTactical();
    }
  };

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ ...bgStyle, fontFamily: theme.font }}>
      <div className={`mx-auto px-4 py-12 ${settings.roadmapWidth || 'max-w-4xl'}`}>

        {/* Header */}
        {settings.showHeader !== false && (
          <div className="mb-12">
            {onBack && (
              <button onClick={onBack} className="flex items-center gap-2 text-xs mb-6 opacity-40 hover:opacity-80 transition-opacity" style={{ color: textMuted }}>
                <ArrowLeft className="w-3 h-3" />Back
              </button>
            )}
            {settings.showLogo !== false && storeLogo && (
              <img src={storeLogo} alt={storeName} className="h-10 mb-6 object-contain" />
            )}
            <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: text }}>
              {settings.title || 'Development Roadmap'}
            </h1>
            {settings.subtitle && (
              <p className="text-sm opacity-50" style={{ color: textMuted }}>{settings.subtitle}</p>
            )}
          </div>
        )}

        {/* Add version bar (owner, non-slate) */}
        {isOwner && layout !== 'slate' && (
          <div className="flex gap-2 mb-8">
            <input
              value={newVersion}
              onChange={e => setNewVersion(e.target.value)}
              placeholder="New version name..."
              className="flex-1 text-sm px-3 py-2 outline-none"
              style={{ backgroundColor: withOpacity(surface, 0.6), border: `1px solid ${border}`, color: text, fontFamily: theme.font }}
              onKeyDown={e => { if (e.key === 'Enter') addVersion(); }}
            />
            <button
              onClick={addVersion}
              disabled={!newVersion.trim()}
              className="px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-30"
              style={{ backgroundColor: accent, color: '#000' }}
            >
              Add
            </button>
          </div>
        )}

        {/* Main layout */}
        {versions.length === 0 ? (
          <div className="py-24 text-center opacity-20" style={{ color: textMuted }}>
            <p className="text-sm uppercase tracking-widest">No versions yet.</p>
            {isOwner && <p className="text-xs mt-2">Add a version above to get started.</p>}
          </div>
        ) : renderLayout()}

        {/* Suggestions */}
        {settings.showSuggestions && renderSuggestions()}
      </div>
    </div>
  );
};
