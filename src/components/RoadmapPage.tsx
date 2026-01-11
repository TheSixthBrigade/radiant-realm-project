import { useState, useEffect } from 'react';
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
  Vote, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { RoadmapSettings, getTheme } from '@/lib/roadmapThemes';

// Animated floating orb component for background glow effects
const FloatingOrb = ({ 
  color, 
  size, 
  position, 
  delay = 0 
}: { 
  color: string; 
  size: number; 
  position: { top?: string; bottom?: string; left?: string; right?: string }; 
  delay?: number;
}) => {
  const [offset, setOffset] = useState({ x: 0, y: 0, rotation: 0 });

  useEffect(() => {
    let animationId: number;
    let startTime = Date.now() + delay * 1000;
    
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const x = Math.sin(elapsed * 0.3) * 40;
      const y = Math.cos(elapsed * 0.2) * 40;
      const rotation = elapsed * 10;
      setOffset({ x, y, rotation });
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    return () => cancelAnimationFrame(animationId);
  }, [delay]);

  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        ...position,
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${color}60, ${color}30)`,
        filter: 'blur(80px)',
        opacity: 0.6,
        transform: `translateX(${offset.x}px) translateY(${offset.y}px) rotate(${offset.rotation}deg) translateZ(0px)`,
        transition: 'transform 0.1s linear'
      }}
    />
  );
};

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
  voting_enabled?: boolean; // Per-item voting toggle
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
  storeSlug?: string; // For linking to community page
  globalBackground?: GlobalBackgroundSettings;
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  backlog: Circle,
  in_progress: PlayCircle,
  qa: TestTube2,
  completed: CheckCircle2,
};

export const RoadmapPage = ({ creatorId, isOwner, settings, storeName, storeLogo, productId, onBack, votingEnabled = false, sortByVotes = false, storeSlug, globalBackground }: RoadmapPageProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = getTheme(settings);
  
  // Helper function to convert hex to rgba with proper opacity
  const hexToRgba = (hex: string, opacity: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  // Helper function to get card background with proper opacity
  const getCardBackground = () => {
    const baseColor = settings.useCustomColors && settings.customCardBackground 
      ? settings.customCardBackground 
      : theme.cardBackground;
    
    // If the color already has alpha (rgba), extract RGB and apply cardOpacity
    if (baseColor.includes('rgba')) {
      const rgbaMatch = baseColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
      if (rgbaMatch) {
        const [, r, g, b] = rgbaMatch;
        const opacity = (settings.cardOpacity || 80) / 100;
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      }
    }
    
    // If it's a hex color, convert to rgba with cardOpacity
    if (baseColor.startsWith('#')) {
      const opacity = (settings.cardOpacity || 80) / 100;
      return hexToRgba(baseColor, opacity);
    }
    
    return baseColor;
  };

  // Dynamic status colors based on theme with proper opacity handling
  const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    backlog: { 
      bg: hexToRgba(theme.statusColors.backlog, 0.35),
      border: theme.statusColors.backlog, 
      text: theme.statusColors.backlog 
    },
    in_progress: { 
      bg: hexToRgba(theme.statusColors.in_progress, 0.35),
      border: theme.statusColors.in_progress, 
      text: theme.statusColors.in_progress 
    },
    qa: { 
      bg: hexToRgba(theme.statusColors.qa, 0.35),
      border: theme.statusColors.qa, 
      text: theme.statusColors.qa 
    },
    completed: { 
      bg: hexToRgba(theme.statusColors.completed, 0.35),
      border: theme.statusColors.completed, 
      text: theme.statusColors.completed 
    },
  };
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
  const [productName, setProductName] = useState<string>('');
  const [itemVotingEnabled, setItemVotingEnabled] = useState(votingEnabled);
  const [itemSortByVotes, setItemSortByVotes] = useState(sortByVotes);
  
  // Editing state
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [editingVersionDesc, setEditingVersionDesc] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const [editingTaskDesc, setEditingTaskDesc] = useState('');
  
  // Forum state
  const [selectedSuggestion, setSelectedSuggestion] = useState<RoadmapSuggestion | null>(null);
  const [suggestionReplies, setSuggestionReplies] = useState<SuggestionReply[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [sortBy, setSortBy] = useState<'upvotes' | 'newest' | 'discussed'>('upvotes');

  // Helper function to format relative time
  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Helper function to format completion date
  const formatCompletionDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Spacing map
  const spacingMap: Record<string, string> = {
    compact: 'space-y-3',
    normal: 'space-y-4',
    relaxed: 'space-y-6'
  };
  const sectionSpacing = spacingMap[settings.sectionSpacing || 'normal'] || 'space-y-4';

  useEffect(() => { fetchData(); }, [creatorId, productId]);

  const fetchData = async () => {
    try {
      // Fetch product name and voting settings if productId is provided
      if (productId) {
        const { data: product } = await (supabase as any)
          .from('products')
          .select('title, voting_enabled, sort_by_votes')
          .eq('id', productId)
          .single();
        if (product) {
          setProductName(product.title);
          setItemVotingEnabled(product.voting_enabled || false);
          setItemSortByVotes(product.sort_by_votes || false);
        }
      }

      // Build query for versions - filter by product_id if provided
      let versionsQuery = (supabase as any).from('roadmap_versions').select('*').eq('creator_id', creatorId);
      if (productId) {
        versionsQuery = versionsQuery.eq('product_id', productId);
      }
      const { data: v } = await versionsQuery.order('sort_order');
      
      // Build query for items
      let itemsQuery = (supabase as any).from('roadmap_items').select('*').eq('creator_id', creatorId);
      if (productId) {
        itemsQuery = itemsQuery.eq('product_id', productId);
      }
      const { data: items } = await itemsQuery.order('sort_order');
      
      // Fetch vote counts for all items
      let enrichedItems = items || [];
      if (enrichedItems.length > 0) {
        const itemIds = enrichedItems.map((i: any) => i.id);
        
        // Get vote counts
        const { data: voteCounts } = await (supabase as any)
          .from('roadmap_item_votes')
          .select('item_id')
          .in('item_id', itemIds);
        
        const voteCountMap = new Map<string, number>();
        (voteCounts || []).forEach((v: any) => {
          voteCountMap.set(v.item_id, (voteCountMap.get(v.item_id) || 0) + 1);
        });
        
        // Get user's votes if logged in
        let userVotedItems = new Set<string>();
        if (user) {
          const { data: userVotes } = await (supabase as any)
            .from('roadmap_item_votes')
            .select('item_id')
            .eq('user_id', user.id)
            .in('item_id', itemIds);
          userVotedItems = new Set((userVotes || []).map((v: any) => v.item_id));
        }
        
        enrichedItems = enrichedItems.map((item: any) => ({
          ...item,
          vote_count: voteCountMap.get(item.id) || 0,
          user_has_voted: userVotedItems.has(item.id)
        }));
      }
      
      const combined = (v || []).map((ver: any) => {
        let versionItems = enrichedItems.filter((i: any) => i.version_id === ver.id);
        // Sort by votes if enabled
        if (itemSortByVotes) {
          versionItems.sort((a: any, b: any) => (b.vote_count || 0) - (a.vote_count || 0));
        }
        return { ...ver, items: versionItems };
      });
      setVersions(combined);
      const exp: Record<string, boolean> = {};
      combined.forEach((ver: any) => { exp[ver.id] = settings.defaultExpanded ?? true; });
      setExpanded(exp);

      if (settings.showSuggestions) {
        const { data: sug } = await (supabase as any).from('roadmap_suggestions').select('*').eq('creator_id', creatorId).order('upvotes', { ascending: false });
        if (sug) {
          // Get reply counts for each suggestion
          const suggestionIds = sug.map((s: any) => s.id);
          const { data: replyCounts } = await (supabase as any)
            .from('roadmap_suggestion_replies')
            .select('suggestion_id')
            .in('suggestion_id', suggestionIds);
          
          const countMap = new Map<string, number>();
          (replyCounts || []).forEach((r: any) => {
            countMap.set(r.suggestion_id, (countMap.get(r.suggestion_id) || 0) + 1);
          });

          // Get author profiles
          const userIds = [...new Set(sug.map((s: any) => s.user_id))];
          const { data: profiles } = await (supabase as any)
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .in('user_id', userIds);
          
          const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

          let enrichedSuggestions = sug.map((s: any) => ({
            ...s,
            reply_count: countMap.get(s.id) || 0,
            author: profileMap.get(s.user_id) || { display_name: 'Anonymous' }
          }));

          // Apply sorting
          if (sortBy === 'newest') {
            enrichedSuggestions.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          } else if (sortBy === 'discussed') {
            enrichedSuggestions.sort((a: any, b: any) => (b.reply_count || 0) - (a.reply_count || 0));
          }
          // Default is already sorted by upvotes from the query

          if (user) {
            const { data: ups } = await (supabase as any).from('roadmap_suggestion_upvotes').select('suggestion_id').eq('user_id', user.id);
            const upIds = new Set((ups || []).map((u: any) => u.suggestion_id));
            setSuggestions(enrichedSuggestions.map((s: any) => ({ ...s, user_upvoted: upIds.has(s.id) })));
          } else {
            setSuggestions(enrichedSuggestions);
          }
        } else {
          setSuggestions([]);
        }
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const addVersion = async () => {
    if (!newVersion.trim()) return;
    // Insert at sort_order 0 and shift others down
    const insertData: any = { creator_id: creatorId, version_name: newVersion.trim(), sort_order: 0 };
    if (productId) insertData.product_id = productId;
    await (supabase as any).from('roadmap_versions').insert(insertData);
    // Update all other versions to shift their sort_order up by 1
    for (const ver of versions) {
      await (supabase as any).from('roadmap_versions').update({ sort_order: ver.sort_order + 1 }).eq('id', ver.id);
    }
    setNewVersion('');
    fetchData();
    toast.success('Version added!');
  };

  const addItem = async (verId: string) => {
    if (!newItem.trim()) return;
    const ver = versions.find(v => v.id === verId);
    const insertData: any = { 
      version_id: verId, 
      creator_id: creatorId, 
      title: newItem.trim(), 
      description: newItemDesc.trim() || null,
      sort_order: ver?.items?.length || 0 
    };
    if (productId) insertData.product_id = productId;
    await (supabase as any).from('roadmap_items').insert(insertData);
    setNewItem('');
    setNewItemDesc('');
    setAddingTo(null);
    fetchData();
    toast.success('Task added!');
  };

  const updateStatus = async (table: string, id: string, status: string) => {
    await (supabase as any).from(table).update({ status }).eq('id', id);
    fetchData();
  };

  const deleteVersion = async (id: string) => {
    if (!confirm('Delete this version?')) return;
    await (supabase as any).from('roadmap_versions').delete().eq('id', id);
    fetchData();
    toast.success('Deleted');
  };

  const deleteItem = async (id: string) => {
    await (supabase as any).from('roadmap_items').delete().eq('id', id);
    fetchData();
  };

  // Update version description
  const updateVersionDescription = async (versionId: string, description: string) => {
    await (supabase as any).from('roadmap_versions').update({ description: description.trim() || null }).eq('id', versionId);
    setEditingVersionId(null);
    fetchData();
    toast.success('Description updated!');
  };

  // Update task
  const updateTask = async (taskId: string, title: string, description: string) => {
    await (supabase as any).from('roadmap_items').update({ 
      title: title.trim(), 
      description: description.trim() || null 
    }).eq('id', taskId);
    setEditingTaskId(null);
    fetchData();
    toast.success('Task updated!');
  };

  // Fetch replies for a suggestion
  const fetchReplies = async (suggestionId: string) => {
    setLoadingReplies(true);
    try {
      const { data: replies } = await (supabase as any)
        .from('roadmap_suggestion_replies')
        .select('*')
        .eq('suggestion_id', suggestionId)
        .order('created_at', { ascending: true });
      
      if (replies) {
        // Fetch author info for each reply
        const userIds = [...new Set(replies.map((r: any) => r.user_id))];
        const { data: profiles } = await (supabase as any)
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);
        
        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        
        const repliesWithAuthors = replies.map((r: any) => ({
          ...r,
          author: profileMap.get(r.user_id) || { display_name: 'Anonymous' },
          is_creator: r.user_id === selectedSuggestion?.creator_id
        }));
        
        setSuggestionReplies(repliesWithAuthors);
      }
    } catch (e) {
      console.error('Error fetching replies:', e);
    }
    setLoadingReplies(false);
  };

  // Submit a reply
  const submitReply = async () => {
    if (!user || !selectedSuggestion || !replyContent.trim()) return;
    setSubmitting(true);
    try {
      await (supabase as any).from('roadmap_suggestion_replies').insert({
        suggestion_id: selectedSuggestion.id,
        user_id: user.id,
        content: replyContent.trim()
      });
      setReplyContent('');
      fetchReplies(selectedSuggestion.id);
      fetchData(); // Refresh to update reply counts
      toast.success('Reply posted!');
    } catch (e) {
      toast.error('Failed to post reply');
    }
    setSubmitting(false);
  };

  // Update suggestion status (creator only)
  const updateSuggestionStatus = async (suggestionId: string, status: string) => {
    await (supabase as any).from('roadmap_suggestions').update({ 
      forum_status: status,
      status_changed_at: new Date().toISOString()
    }).eq('id', suggestionId);
    fetchData();
    if (selectedSuggestion?.id === suggestionId) {
      setSelectedSuggestion(prev => prev ? { ...prev, forum_status: status as any } : null);
    }
    toast.success('Status updated!');
  };

  // Delete suggestion (creator only)
  const deleteSuggestion = async (suggestionId: string) => {
    try {
      // Delete all replies first
      await (supabase as any).from('roadmap_suggestion_replies').delete().eq('suggestion_id', suggestionId);
      // Delete all upvotes
      await (supabase as any).from('roadmap_suggestion_upvotes').delete().eq('suggestion_id', suggestionId);
      // Delete the suggestion
      await (supabase as any).from('roadmap_suggestions').delete().eq('id', suggestionId);
      
      // Close thread if this suggestion was selected
      if (selectedSuggestion?.id === suggestionId) {
        setSelectedSuggestion(null);
        setSuggestionReplies([]);
      }
      
      fetchData();
      toast.success('Suggestion deleted!');
    } catch (e) {
      console.error('Error deleting suggestion:', e);
      toast.error('Failed to delete suggestion');
    }
  };

  // Open suggestion thread
  const openSuggestionThread = (suggestion: RoadmapSuggestion) => {
    setSelectedSuggestion(suggestion);
    fetchReplies(suggestion.id);
  };

  const submitSuggestion = async () => {
    if (!user || !suggestionTitle.trim()) return;
    setSubmitting(true);
    await (supabase as any).from('roadmap_suggestions').insert({ creator_id: creatorId, user_id: user.id, title: suggestionTitle.trim(), description: suggestionDesc.trim() || null });
    setShowModal(false);
    setSuggestionTitle('');
    setSuggestionDesc('');
    setSubmitting(false);
    fetchData();
    toast.success('Suggestion submitted!');
  };

  const toggleUpvote = async (id: string, upvoted: boolean) => {
    if (!user) { toast.error('Sign in to upvote'); return; }
    if (upvoted) {
      await (supabase as any).from('roadmap_suggestion_upvotes').delete().eq('suggestion_id', id).eq('user_id', user.id);
    } else {
      await (supabase as any).from('roadmap_suggestion_upvotes').insert({ suggestion_id: id, user_id: user.id });
    }
    fetchData();
  };

  // Toggle vote on roadmap item
  const toggleItemVote = async (itemId: string, hasVoted: boolean) => {
    if (!user) { toast.error('Sign in to vote'); return; }
    if (!itemVotingEnabled) { toast.error('Voting is not enabled for this roadmap'); return; }
    
    try {
      if (hasVoted) {
        await (supabase as any).from('roadmap_item_votes').delete().eq('item_id', itemId).eq('user_id', user.id);
      } else {
        await (supabase as any).from('roadmap_item_votes').insert({ item_id: itemId, user_id: user.id });
      }
      fetchData();
    } catch (e) {
      console.error('Error toggling vote:', e);
      toast.error('Failed to update vote');
    }
  };

  // Toggle voting settings (owner only)
  const toggleVotingSettings = async (field: 'voting_enabled' | 'sort_by_votes', value: boolean) => {
    if (!productId || !isOwner) return;
    
    try {
      await (supabase as any).from('products').update({ [field]: value }).eq('id', productId);
      if (field === 'voting_enabled') setItemVotingEnabled(value);
      if (field === 'sort_by_votes') setItemSortByVotes(value);
      fetchData();
      toast.success(field === 'voting_enabled' 
        ? (value ? 'Voting enabled!' : 'Voting disabled!') 
        : (value ? 'Sorting by votes!' : 'Sorting by order!')
      );
    } catch (e) {
      toast.error('Failed to update settings');
    }
  };

  // Toggle per-item voting (owner only)
  const toggleItemVotingEnabled = async (itemId: string, currentValue: boolean) => {
    if (!isOwner) return;
    
    try {
      await (supabase as any).from('roadmap_items').update({ voting_enabled: !currentValue }).eq('id', itemId);
      fetchData();
      toast.success(!currentValue ? 'Voting enabled for this task!' : 'Voting disabled for this task!');
    } catch (e) {
      toast.error('Failed to update voting setting');
    }
  };

  // Build background style - glass effect works on any background
  let bgStyle: React.CSSProperties = {};
  
  // Check if roadmap has its own background settings
  const hasOwnBackground = settings.backgroundType && settings.backgroundType !== 'default';
  
  if (hasOwnBackground) {
    // Use roadmap-specific background
    if (settings.backgroundType === 'image' && settings.backgroundImage) {
      const overlayOpacity = (settings.backgroundOverlayOpacity || 70) / 100;
      bgStyle = {
        backgroundImage: 'linear-gradient(rgba(0, 0, 0, ' + overlayOpacity + '), rgba(0, 0, 0, ' + overlayOpacity + ')), url(' + settings.backgroundImage + ')',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      };
    } else if (settings.backgroundType === 'gradient') {
      const start = settings.customBackgroundGradientStart || (theme.backgroundGradient?.start || theme.backgroundColor);
      const end = settings.customBackgroundGradientEnd || (theme.backgroundGradient?.end || theme.backgroundColor);
      bgStyle = { background: 'linear-gradient(135deg, ' + start + ' 0%, ' + end + ' 100%)' };
    } else if (settings.backgroundType === 'solid') {
      bgStyle = { backgroundColor: settings.customBackgroundColor || theme.backgroundColor };
    }
  } else if (globalBackground?.enabled) {
    // Use global background as fallback
    if (globalBackground.type === 'image' && globalBackground.image) {
      const overlayOpacity = globalBackground.overlay || 0.5;
      bgStyle = {
        backgroundImage: 'linear-gradient(rgba(0, 0, 0, ' + overlayOpacity + '), rgba(0, 0, 0, ' + overlayOpacity + ')), url(' + globalBackground.image + ')',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      };
    } else if (globalBackground.type === 'gradient') {
      const start = globalBackground.gradientStart || '#0f172a';
      const end = globalBackground.gradientEnd || '#1e1b4b';
      bgStyle = { background: 'linear-gradient(135deg, ' + start + ' 0%, ' + end + ' 100%)' };
    } else if (globalBackground.type === 'solid') {
      bgStyle = { backgroundColor: globalBackground.color || '#0f172a' };
    }
  } else if (settings.useBackgroundGradient || theme.backgroundGradient) {
    // Legacy: use theme gradient
    const start = settings.useCustomColors ? settings.customBackgroundGradientStart : (theme.backgroundGradient?.start || theme.backgroundColor);
    const end = settings.useCustomColors ? settings.customBackgroundGradientEnd : (theme.backgroundGradient?.end || theme.backgroundColor);
    bgStyle = { background: 'linear-gradient(135deg, ' + start + ' 0%, ' + end + ' 100%)' };
  } else {
    bgStyle = { backgroundColor: settings.useCustomColors ? settings.customBackgroundColor : theme.backgroundColor };
  }



  // Get status-based colors (Premium style)
  const getStatusColors = (status: string) => {
    return STATUS_COLORS[status] || STATUS_COLORS.backlog;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={bgStyle}>
      <Loader2 className="w-12 h-12 animate-spin" style={{ color: theme.accentColor }} />
    </div>
  );

  return (
    <div className="min-h-screen relative" style={bgStyle}>
      {/* Animated Background Orbs - Customizable */}
      {settings.showFloatingOrbs !== false && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: settings.orbCount || 3 }, (_, index) => {
            const positions = [
              { top: '10%', left: '10%' },
              { bottom: '10%', right: '10%' },
              { top: '50%', right: '20%' },
              { bottom: '30%', left: '15%' },
              { top: '20%', right: '40%' },
              { bottom: '60%', left: '60%' }
            ];
            const sizes = [384, 320, 256, 300, 280, 240];
            
            return (
              <FloatingOrb 
                key={index}
                color={settings.orbColor || theme.accentColor} 
                size={sizes[index] || 256} 
                position={positions[index] || { top: '50%', left: '50%' }} 
                delay={index * 2} 
              />
            );
          })}
        </div>
      )}

      {/* Header with Logo */}
      {settings.showHeader !== false && (
        <div 
          className="border-b backdrop-blur-xl relative z-10" 
          style={{ 
            borderColor: 'rgba(255, 255, 255, 0.1)', 
            backgroundColor: 'rgba(15, 23, 42, 0.8)'
          }}
        >
          <div className={`${settings.roadmapWidth || 'max-w-7xl'} mx-auto px-8 py-4 flex items-center justify-between`}>
            <div className="flex items-center gap-4">
              {/* Back button when viewing specific product roadmap */}
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:bg-white/10"
                  style={{ color: theme.textSecondary }}
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="text-sm font-medium">All Roadmaps</span>
                </button>
              )}
              {settings.showLogo !== false && storeLogo && (
                <img src={storeLogo} alt="Logo" className="h-10 object-contain" />
              )}
              {(!storeLogo || settings.showLogo === false) && storeName && (
                <span className="text-xl font-bold" style={{ color: theme.textPrimary }}>{storeName}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Community Forums Link */}
              {storeSlug && (
                <Button 
                  onClick={() => navigate(`/site/${storeSlug}/community`)} 
                  variant="outline"
                  className="px-5 py-2 font-semibold rounded-full transition-all hover:scale-105"
                  style={{ 
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: theme.textPrimary,
                    borderColor: 'rgba(255,255,255,0.2)',
                  }}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Community
                </Button>
              )}
              <Button 
                onClick={() => setShowModal(true)} 
                className="px-5 py-2 font-semibold rounded-full transition-all hover:scale-105 hover:shadow-lg"
                style={{ 
                  background: `linear-gradient(135deg, ${theme.accentColor}, ${theme.accentColor}dd)`,
                  color: '#ffffff',
                  boxShadow: `0 0 ${20 * ((settings.glowIntensity || 50) / 100)}px ${theme.accentColor}40, 0 0 ${30 * ((settings.glowIntensity || 50) / 100)}px ${theme.accentColor}20`,
                  border: 'none'
                }}
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Suggest Feature
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className={`${settings.roadmapWidth || 'max-w-7xl'} mx-auto px-8 py-10 relative z-10`}>
        {/* Title Section - Premium Style */}
        <div className="text-center mb-16">
          <h1 
            className={`${settings.mainTitleSize || 'text-6xl md:text-7xl'} font-black mb-6 bg-clip-text text-transparent`}
            style={{ 
              backgroundImage: `linear-gradient(135deg, ${theme.accentColor}, ${theme.accentColor}aa)`,
            }}
          >
            {productName || settings.title}
          </h1>
          <p className="text-xl" style={{ color: theme.textSecondary }}>{productName ? 'Product Roadmap' : settings.subtitle}</p>
        </div>

        {/* Owner: Add Version & Voting Settings */}
        {isOwner && (
          <div 
            className="mb-6 p-4 rounded-xl border backdrop-blur-lg" 
            style={{ 
              backgroundColor: 'rgba(30, 41, 59, 0.5)', 
              borderColor: theme.cardBorder 
            }}
          >
            <div className="flex gap-3 mb-4">
              <Input 
                placeholder="New version (e.g. v1.4.0 - Update)" 
                value={newVersion} 
                onChange={e => setNewVersion(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && addVersion()} 
                className="flex-1"
                style={{ backgroundColor: 'rgba(0,0,0,0.4)', borderColor: theme.cardBorder, color: theme.textPrimary }} 
              />
              <Button 
                onClick={addVersion} 
                className="transition-all hover:scale-105"
                style={{ backgroundColor: theme.accentColor, color: '#fff', boxShadow: `0 0 ${20 * ((settings.glowIntensity || 50) / 100)}px ${theme.accentColor}40` }}
              >
                <Plus className="w-4 h-4 mr-2" />Add Version
              </Button>
            </div>
            
            {/* Voting Settings */}
            {productId && (
              <div className="flex items-center gap-6 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                <div className="flex items-center gap-2">
                  <Vote className="w-4 h-4" style={{ color: theme.textSecondary }} />
                  <span className="text-sm" style={{ color: theme.textSecondary }}>Voting:</span>
                  <button
                    onClick={() => toggleVotingSettings('voting_enabled', !itemVotingEnabled)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${itemVotingEnabled ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'}`}
                  >
                    {itemVotingEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                {itemVotingEnabled && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: theme.textSecondary }}>Sort by votes:</span>
                    <button
                      onClick={() => toggleVotingSettings('sort_by_votes', !itemSortByVotes)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border`}
                      style={{
                        backgroundColor: itemSortByVotes ? `${theme.accentColor}33` : 'rgba(107, 114, 128, 0.2)',
                        color: itemSortByVotes ? theme.accentColor : '#9ca3af',
                        borderColor: itemSortByVotes ? `${theme.accentColor}80` : 'rgba(107, 114, 128, 0.5)'
                      }}
                    >
                      {itemSortByVotes ? 'On' : 'Off'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Versions List - Premium Style */}
        <div className={`${sectionSpacing} px-1`}>
          {versions.map(ver => {
            const statusColors = getStatusColors(ver.status);
            const isExpanded = expanded[ver.id];
            const isKineticStyle = settings.theme === 'kinetic';
            const isLeftAccent = settings.cardStyle === 'left-accent' && !isKineticStyle;
            const isMinimal = settings.cardStyle === 'minimal';
            
            // Use cardOpacity setting for version card background
            // Use ?? instead of || so 0 is treated as valid (|| would make 0 become 80)
            const versionOpacity = (settings.cardOpacity ?? 80) / 100;
            const versionBg = hexToRgba(statusColors.border, versionOpacity);
            
            return (
              <div 
                key={ver.id} 
                className="rounded-2xl backdrop-blur-xl transition-all hover:shadow-2xl"
                style={{
                  backgroundColor: versionBg,
                  borderRadius: (settings.cardBorderRadius || 16) + 'px',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  // Use inset box-shadow for border effect (won't get clipped)
                  boxShadow: isMinimal 
                    ? (settings.cardGlow 
                        ? `0 0 ${40 * ((settings.glowIntensity || 50) / 100)}px ${statusColors.border}80, 0 0 ${80 * ((settings.glowIntensity || 50) / 100)}px ${statusColors.border}40` 
                        : '0 4px 20px rgba(0,0,0,0.1)')
                    : isLeftAccent && !isKineticStyle
                      ? `inset 4px 0 0 0 ${statusColors.border}, inset 0 0 0 1px rgba(255,255,255,0.08), 0 4px 24px rgba(0,0,0,0.3)`
                      : settings.cardGlow 
                        ? `inset 0 0 0 ${(settings.borderWidth || 2)}px ${statusColors.border}, 0 0 ${40 * ((settings.glowIntensity || 50) / 100)}px ${statusColors.border}80, 0 0 ${80 * ((settings.glowIntensity || 50) / 100)}px ${statusColors.border}40, 0 8px 32px rgba(0,0,0,0.4)` 
                        : `inset 0 0 0 ${isKineticStyle ? 1 : (settings.borderWidth || 2)}px ${statusColors.border}, ${isKineticStyle ? '0 4px 30px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.1)'}`,
                }}
              >
                {/* Version Header */}
                <div className={settings.cardPadding || 'p-10'}>
                  <div className="flex items-center justify-between mb-2">
                    <button 
                      className="flex-1 text-left hover:opacity-80 transition-opacity"
                      onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}
                    >
                      <div className="flex items-center gap-4">
                        <h2 className={`${settings.versionTitleSize || 'text-3xl md:text-4xl'} font-bold`} style={{ color: theme.textPrimary }}>
                          {ver.version_name}
                        </h2>
                        <span 
                          className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border"
                          style={{ 
                            backgroundColor: 'rgba(55, 65, 81, 0.4)',
                            color: theme.textSecondary,
                            borderColor: 'rgba(107, 114, 128, 0.6)'
                          }}
                        >
                          {ver.status.replace('_', ' ')}
                        </span>
                        {ver.status === 'completed' && ver.status_changed_at && (
                          <span className="text-xs flex items-center gap-1" style={{ color: theme.textSecondary }}>
                            <CheckCircle2 className="w-3 h-3" />
                            Completed {formatCompletionDate(ver.status_changed_at)}
                          </span>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-4">
                      <Button 
                        onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
                        className="px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105"
                        style={{ 
                          background: `linear-gradient(135deg, ${theme.accentColor}, ${theme.accentColor}dd)`,
                          color: '#ffffff',
                          boxShadow: `0 0 ${25 * ((settings.glowIntensity || 50) / 100)}px ${theme.accentColor}50, 0 0 ${40 * ((settings.glowIntensity || 50) / 100)}px ${theme.accentColor}25`,
                          border: 'none'
                        }}
                      >
                        <Lightbulb className="w-4 h-4 mr-2" />
                        Suggest Feature
                      </Button>
                      <span className="text-sm" style={{ color: theme.textSecondary }}>
                        {ver.items?.length || 0} tasks
                      </span>
                      <button onClick={() => setExpanded(p => ({ ...p, [ver.id]: !p[ver.id] }))}>
                        {isExpanded ? (
                          <ChevronUp className="w-6 h-6" style={{ color: theme.textSecondary }} />
                        ) : (
                          <ChevronDown className="w-6 h-6" style={{ color: theme.textSecondary }} />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* Version Description */}
                  {editingVersionId === ver.id ? (
                    <div className="mt-4">
                      <Textarea
                        value={editingVersionDesc}
                        onChange={e => setEditingVersionDesc(e.target.value)}
                        placeholder="Add a description for this version..."
                        rows={3}
                        className="w-full rounded-xl mb-2"
                        style={{ 
                          backgroundColor: 'rgba(0,0,0,0.3)', 
                          borderColor: statusColors.border, 
                          color: theme.textPrimary 
                        }}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => updateVersionDescription(ver.id, editingVersionDesc)}
                          style={{ backgroundColor: theme.accentColor, color: '#fff' }}
                        >
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => setEditingVersionId(null)}
                          style={{ color: theme.textSecondary }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {ver.description && (
                        <p className="mt-3 text-sm" style={{ color: theme.textSecondary }}>
                          {ver.description}
                        </p>
                      )}
                      {isOwner && (
                        <button
                          onClick={() => {
                            setEditingVersionId(ver.id);
                            setEditingVersionDesc(ver.description || '');
                          }}
                          className="mt-2 text-xs flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
                          style={{ color: theme.textSecondary }}
                        >
                          <Edit2 className="w-3 h-3" />
                          {ver.description ? 'Edit description' : 'Add description'}
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Owner Controls */}
                {isOwner && isExpanded && (
                  <div 
                    className="px-8 pb-4 flex gap-2 border-t" 
                    style={{ borderColor: statusColors.border }}
                  >
                    <select 
                      value={ver.status} 
                      onChange={e => updateStatus('roadmap_versions', ver.id, e.target.value)} 
                      className="rounded-lg px-3 py-1.5 text-sm border mt-4"
                      style={{ 
                        backgroundColor: 'rgba(0,0,0,0.3)', 
                        color: theme.textPrimary, 
                        borderColor: statusColors.border 
                      }}
                    >
                      <option value="backlog">Backlog</option>
                      <option value="in_progress">In Progress</option>
                      <option value="qa">QA</option>
                      <option value="completed">Completed</option>
                    </select>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => deleteVersion(ver.id)} 
                      className="text-red-400 hover:text-red-300 mt-4"
                    >
                      Delete Version
                    </Button>
                  </div>
                )}

                {/* Tasks List - Premium Style */}
                {isExpanded && (
                  <div 
                    className="overflow-hidden"
                    style={{ height: 'auto', opacity: 1 }}
                  >
                    <div className="px-8 pb-8 pt-0">
                      <div className="space-y-3 ml-1">
                        {ver.items?.map(item => {
                          const ItemIcon = STATUS_ICONS[item.status] || Circle;
                          const itemStatusColors = getStatusColors(item.status);
                          const isEditingThisTask = editingTaskId === item.id;
                          
                          // Task cards use separate taskCardOpacity setting
                          const taskOpacity = (settings.taskCardOpacity ?? 40) / 100;
                          const taskBg = hexToRgba(itemStatusColors.border, taskOpacity);
                          
                          // Task padding - default to p-3 for compact
                          const taskPadding = settings.taskCardPadding || 'p-3';
                          
                          return (
                            <div 
                              key={item.id} 
                              className={`rounded-xl ${taskPadding} transition-all group backdrop-blur-sm`}
                              style={{ 
                                backgroundColor: taskBg,
                                // Use inset box-shadow for border (won't get clipped)
                                boxShadow: settings.cardGlow 
                                  ? `inset 0 0 0 1px ${itemStatusColors.border}, 0 0 ${30 * ((settings.cardGlowIntensity || 50) / 100)}px ${itemStatusColors.border}60, 0 0 ${60 * ((settings.cardGlowIntensity || 50) / 100)}px ${itemStatusColors.border}30, 0 4px 20px rgba(0,0,0,0.2)` 
                                  : `inset 0 0 0 1px ${itemStatusColors.border}`,
                              }}
                            >
                              {isEditingThisTask ? (
                                /* Inline Editing Mode */
                                <div className="space-y-3">
                                  <Input
                                    value={editingTaskTitle}
                                    onChange={e => setEditingTaskTitle(e.target.value)}
                                    placeholder="Task title..."
                                    className="w-full rounded-lg"
                                    style={{ 
                                      backgroundColor: 'rgba(0,0,0,0.3)', 
                                      borderColor: statusColors.border, 
                                      color: theme.textPrimary 
                                    }}
                                    autoFocus
                                  />
                                  <Textarea
                                    value={editingTaskDesc}
                                    onChange={e => setEditingTaskDesc(e.target.value)}
                                    placeholder="Task description (optional)..."
                                    rows={2}
                                    className="w-full rounded-lg"
                                    style={{ 
                                      backgroundColor: 'rgba(0,0,0,0.3)', 
                                      borderColor: statusColors.border, 
                                      color: theme.textPrimary 
                                    }}
                                  />
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm" 
                                      onClick={() => updateTask(item.id, editingTaskTitle, editingTaskDesc)}
                                      disabled={!editingTaskTitle.trim()}
                                      style={{ backgroundColor: theme.accentColor, color: '#fff' }}
                                    >
                                      Save
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      onClick={() => setEditingTaskId(null)}
                                      style={{ color: theme.textSecondary }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                /* Display Mode */
                                <div className="flex items-center gap-4">
                                  {/* Vote Button - shown when voting is enabled AND item has voting enabled */}
                                  {itemVotingEnabled && item.voting_enabled !== false && (
                                    <button
                                      onClick={() => toggleItemVote(item.id, item.user_has_voted || false)}
                                      className="flex flex-col items-center px-3 py-2 rounded-xl transition-all hover:scale-105 flex-shrink-0"
                                      style={{ 
                                        backgroundColor: item.user_has_voted ? theme.accentColor + '30' : 'rgba(0,0,0,0.2)', 
                                        color: item.user_has_voted ? theme.accentColor : theme.textSecondary,
                                        border: item.user_has_voted ? '2px solid ' + theme.accentColor : '2px solid transparent'
                                      }}
                                      title={user ? (item.user_has_voted ? 'Remove vote' : 'Vote for this') : 'Sign in to vote'}
                                    >
                                      <ArrowUp className="w-4 h-4 mb-0.5" />
                                      <span className="text-sm font-bold">{item.vote_count || 0}</span>
                                    </button>
                                  )}
                                  {/* Status Circle Icon */}
                                  <div 
                                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2"
                                    style={{ 
                                      backgroundColor: 'transparent',
                                      borderColor: itemStatusColors.text 
                                    }}
                                  >
                                    <div 
                                      className="w-2.5 h-2.5 rounded-full"
                                      style={{ backgroundColor: itemStatusColors.text }}
                                    />
                                  </div>
                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <h3 className={`${settings.taskTitleSize || 'text-base'} font-medium`} style={{ color: theme.textPrimary }}>
                                      {item.title}
                                    </h3>
                                    {item.description && (
                                      <p className="text-sm mt-0.5" style={{ color: theme.textSecondary }}>
                                        {item.description}
                                      </p>
                                    )}
                                  </div>
                                  {/* Status Badge & Actions */}
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {isOwner && (
                                      <button
                                        onClick={() => {
                                          setEditingTaskId(item.id);
                                          setEditingTaskTitle(item.title);
                                          setEditingTaskDesc(item.description || '');
                                        }}
                                        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-1"
                                        style={{ color: theme.textSecondary }}
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <span 
                                      className="px-3 py-1 rounded-md text-xs font-medium uppercase tracking-wide"
                                      style={{ 
                                        backgroundColor: 'rgba(55, 65, 81, 0.6)',
                                        color: theme.textSecondary
                                      }}
                                    >
                                      {item.status.replace('_', ' ')}
                                    </span>
                                  </div>
                                </div>
                              )}
                              {/* Status Timestamp - only show if not editing */}
                              {!isEditingThisTask && item.status_changed_at && (
                                <div className="flex items-center gap-1 text-xs mt-2" style={{ color: theme.textSecondary, marginLeft: '52px' }}>
                                  <Clock className="w-3 h-3" />
                                  {item.status === 'completed' ? (
                                    <span>Completed {formatCompletionDate(item.status_changed_at)}</span>
                                  ) : (
                                    <span>Updated {formatRelativeTime(item.status_changed_at)}</span>
                                  )}
                                </div>
                              )}
                              {/* Owner Controls */}
                              {!isEditingThisTask && isOwner && (
                                <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity items-center" style={{ marginLeft: '52px' }}>
                                  {/* Per-item voting toggle */}
                                  {itemVotingEnabled && (
                                    <button
                                      onClick={() => toggleItemVotingEnabled(item.id, item.voting_enabled !== false)}
                                      className={`px-2 py-1 rounded text-xs font-medium transition-all ${item.voting_enabled !== false ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'}`}
                                      title={item.voting_enabled !== false ? 'Disable voting for this task' : 'Enable voting for this task'}
                                    >
                                      <Vote className="w-3 h-3" />
                                    </button>
                                  )}
                                  <select 
                                    value={item.status} 
                                    onChange={e => updateStatus('roadmap_items', item.id, e.target.value)} 
                                    className="rounded px-2 py-1 text-xs border"
                                    style={{ 
                                      backgroundColor: 'rgba(0,0,0,0.5)', 
                                      color: theme.textPrimary, 
                                      borderColor: theme.cardBorder 
                                    }}
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <option value="backlog">Backlog</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="qa">QA</option>
                                    <option value="completed">Completed</option>
                                  </select>
                                  <button 
                                    onClick={() => deleteItem(item.id)} 
                                    className="text-red-400 hover:text-red-300 p-1"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Add Task (Owner) */}
                        {isOwner && (addingTo === ver.id ? (
                          <div className="space-y-3 mt-3 p-4 rounded-xl border" style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderColor: statusColors.border }}>
                            <Input 
                              placeholder="Task title..." 
                              value={newItem} 
                              onChange={e => setNewItem(e.target.value)} 
                              className="w-full"
                              style={{ 
                                backgroundColor: 'rgba(0,0,0,0.3)', 
                                borderColor: statusColors.border, 
                                color: theme.textPrimary 
                              }} 
                              autoFocus 
                            />
                            <Textarea 
                              placeholder="Task description (optional)..." 
                              value={newItemDesc} 
                              onChange={e => setNewItemDesc(e.target.value)} 
                              rows={2}
                              className="w-full"
                              style={{ 
                                backgroundColor: 'rgba(0,0,0,0.3)', 
                                borderColor: statusColors.border, 
                                color: theme.textPrimary 
                              }} 
                            />
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => addItem(ver.id)} 
                                disabled={!newItem.trim()}
                                style={{ backgroundColor: theme.accentColor, color: '#fff' }}
                              >
                                Add Task
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => { setAddingTo(null); setNewItem(''); setNewItemDesc(''); }} 
                                style={{ color: theme.textSecondary }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setAddingTo(ver.id)} 
                            className="w-full p-3 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 transition-colors hover:border-opacity-80"
                            style={{ borderColor: statusColors.border, color: theme.textSecondary }}
                          >
                            <Plus className="w-4 h-4" />Add Task
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State - Premium Style */}
        {versions.length === 0 && !isOwner && (
          <div 
            className="text-center py-20 rounded-2xl backdrop-blur-xl border shadow-2xl"
            style={{
              backgroundColor: getCardBackground(),
              borderColor: settings.useCustomColors && settings.customCardBorder 
                ? settings.customCardBorder 
                : theme.cardBorder,
            }}
          >
            <Sparkles className="w-16 h-16 mx-auto mb-6" style={{ color: theme.accentColor }} />
            <h3 className="text-2xl font-bold mb-2" style={{ color: theme.textPrimary }}>Roadmap Coming Soon</h3>
            <p style={{ color: theme.textSecondary }}>Check back later for development updates!</p>
          </div>
        )}

        {/* Suggestions Section - Premium Style */}
        {settings.showSuggestions && suggestions.length > 0 && !selectedSuggestion && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: theme.textPrimary }}>
                <Lightbulb className="w-7 h-7" style={{ color: theme.accentColor }} />
                Community Suggestions
              </h2>
              {/* Sort Options */}
              <div className="flex gap-2">
                {(['upvotes', 'newest', 'discussed'] as const).map(option => (
                  <button
                    key={option}
                    onClick={() => { setSortBy(option); fetchData(); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${sortBy === option ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'}`}
                    style={{ color: sortBy === option ? theme.accentColor : theme.textSecondary }}
                  >
                    {option === 'upvotes' ? 'Top' : option === 'newest' ? 'New' : 'Discussed'}
                  </button>
                ))}
              </div>
            </div>
            <div className={sectionSpacing}>
              {suggestions.slice(0, settings.suggestionsLimit).map(s => (
                <div 
                  key={s.id} 
                  className="p-5 rounded-2xl backdrop-blur-xl border shadow-2xl"
                  style={{
                    backgroundColor: getCardBackground(),
                    borderColor: settings.useCustomColors && settings.customCardBorder 
                      ? settings.customCardBorder 
                      : theme.cardBorder,
                  }}
                >
                  <div className="flex items-start gap-5">
                    <button 
                      onClick={() => toggleUpvote(s.id, s.user_upvoted || false)} 
                      className="flex flex-col items-center px-4 py-3 rounded-xl transition-all hover:scale-105"
                      style={{ 
                        backgroundColor: s.user_upvoted ? theme.accentColor + '30' : 'rgba(0,0,0,0.2)', 
                        color: s.user_upvoted ? theme.accentColor : theme.textSecondary,
                        border: s.user_upvoted ? '2px solid ' + theme.accentColor : '2px solid transparent'
                      }}
                    >
                      <ThumbsUp className="w-5 h-5 mb-1" />
                      <span className="text-lg font-bold">{s.upvotes}</span>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-lg" style={{ color: theme.textPrimary }}>{s.title}</h4>
                        {s.forum_status && s.forum_status !== 'open' && (
                          <span 
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: 
                                s.forum_status === 'planned' ? `${theme.accentColor}33` :
                                s.forum_status === 'in_progress' ? `${theme.accentColor}33` :
                                s.forum_status === 'completed' ? 'rgba(34, 197, 94, 0.2)' :
                                'rgba(239, 68, 68, 0.2)',
                              color:
                                s.forum_status === 'planned' ? theme.accentColor :
                                s.forum_status === 'in_progress' ? theme.accentColor :
                                s.forum_status === 'completed' ? '#22c55e' :
                                '#ef4444'
                            }}
                          >
                            {s.forum_status.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      {s.description && <p className="text-sm mb-2" style={{ color: theme.textSecondary }}>{s.description}</p>}
                      <div className="flex items-center gap-4 text-xs" style={{ color: theme.textSecondary }}>
                        <span>by {s.author?.display_name || 'Anonymous'}</span>
                        <span>{formatRelativeTime(s.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openSuggestionThread(s)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:bg-white/10"
                        style={{ color: theme.textSecondary }}
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">{s.reply_count || 0}</span>
                      </button>
                      
                      {/* Owner Controls */}
                      {isOwner && (
                        <div className="flex items-center gap-2 ml-2">
                          {/* Status Dropdown */}
                          <select
                            value={s.forum_status || 'open'}
                            onChange={(e) => updateSuggestionStatus(s.id, e.target.value)}
                            className="rounded-lg px-3 py-1.5 text-xs border"
                            style={{ 
                              backgroundColor: 'rgba(0,0,0,0.3)', 
                              color: theme.textPrimary, 
                              borderColor: theme.accentColor + '50' 
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="open">Open</option>
                            <option value="planned">Planned</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="declined">Declined</option>
                          </select>
                          
                          {/* Delete Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Delete this suggestion?')) {
                                deleteSuggestion(s.id);
                              }
                            }}
                            className="p-2 rounded-lg transition-all hover:bg-red-500/20"
                            style={{ color: '#ef4444' }}
                            title="Delete suggestion"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestion Thread View */}
        {selectedSuggestion && (
          <div className="mt-12">
            <button
              onClick={() => { setSelectedSuggestion(null); setSuggestionReplies([]); }}
              className="flex items-center gap-2 mb-6 px-3 py-2 rounded-lg transition-all hover:bg-white/10"
              style={{ color: theme.textSecondary }}
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back to Suggestions</span>
            </button>

            {/* Thread Header */}
            <div 
              className="p-6 rounded-2xl backdrop-blur-xl border shadow-2xl mb-6"
              style={{
                backgroundColor: getCardBackground(),
                borderColor: settings.useCustomColors && settings.customCardBorder 
                  ? settings.customCardBorder 
                  : theme.cardBorder,
              }}
            >
              <div className="flex items-start gap-5">
                <button 
                  onClick={() => toggleUpvote(selectedSuggestion.id, selectedSuggestion.user_upvoted || false)} 
                  className="flex flex-col items-center px-4 py-3 rounded-xl transition-all hover:scale-105"
                  style={{ 
                    backgroundColor: selectedSuggestion.user_upvoted ? theme.accentColor + '30' : 'rgba(0,0,0,0.2)', 
                    color: selectedSuggestion.user_upvoted ? theme.accentColor : theme.textSecondary,
                    border: selectedSuggestion.user_upvoted ? '2px solid ' + theme.accentColor : '2px solid transparent'
                  }}
                >
                  <ThumbsUp className="w-5 h-5 mb-1" />
                  <span className="text-lg font-bold">{selectedSuggestion.upvotes}</span>
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold" style={{ color: theme.textPrimary }}>{selectedSuggestion.title}</h2>
                    {selectedSuggestion.forum_status && (
                      <span 
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: 
                            selectedSuggestion.forum_status === 'open' ? 'rgba(107, 114, 128, 0.2)' :
                            selectedSuggestion.forum_status === 'planned' ? `${theme.accentColor}33` :
                            selectedSuggestion.forum_status === 'in_progress' ? `${theme.accentColor}33` :
                            selectedSuggestion.forum_status === 'completed' ? 'rgba(34, 197, 94, 0.2)' :
                            'rgba(239, 68, 68, 0.2)',
                          color:
                            selectedSuggestion.forum_status === 'open' ? '#9ca3af' :
                            selectedSuggestion.forum_status === 'planned' ? theme.accentColor :
                            selectedSuggestion.forum_status === 'in_progress' ? theme.accentColor :
                            selectedSuggestion.forum_status === 'completed' ? '#22c55e' :
                            '#ef4444'
                        }}
                      >
                        {selectedSuggestion.forum_status.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  {selectedSuggestion.description && (
                    <p className="mb-4" style={{ color: theme.textSecondary }}>{selectedSuggestion.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm" style={{ color: theme.textSecondary }}>
                    <span>by {selectedSuggestion.author?.display_name || 'Anonymous'}</span>
                    <span>{formatRelativeTime(selectedSuggestion.created_at)}</span>
                  </div>
                </div>
                {/* Owner Status Controls */}
                {isOwner && (
                  <select
                    value={selectedSuggestion.forum_status || 'open'}
                    onChange={e => updateSuggestionStatus(selectedSuggestion.id, e.target.value)}
                    className="rounded-lg px-3 py-2 text-sm border"
                    style={{ 
                      backgroundColor: 'rgba(0,0,0,0.3)', 
                      color: theme.textPrimary, 
                      borderColor: 'rgba(29, 78, 216, 0.5)' 
                    }}
                  >
                    <option value="open">Open</option>
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="declined">Declined</option>
                  </select>
                )}
              </div>
            </div>

            {/* Replies */}
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: theme.textPrimary }}>
                <MessageCircle className="w-5 h-5" style={{ color: theme.accentColor }} />
                {suggestionReplies.length} {suggestionReplies.length === 1 ? 'Reply' : 'Replies'}
              </h3>
              
              {loadingReplies ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.accentColor }} />
                </div>
              ) : suggestionReplies.length === 0 ? (
                <div 
                  className="text-center py-8 rounded-xl border"
                  style={{ 
                    backgroundColor: 'rgba(0,0,0,0.2)', 
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: theme.textSecondary 
                  }}
                >
                  No replies yet. Be the first to comment!
                </div>
              ) : (
                suggestionReplies.map(reply => (
                  <div 
                    key={reply.id}
                    className={`p-4 rounded-xl border ${reply.is_creator ? 'border-l-4' : ''}`}
                    style={{ 
                      backgroundColor: 'rgba(0,0,0,0.2)', 
                      borderColor: reply.is_creator ? theme.accentColor : 'rgba(255,255,255,0.1)',
                      borderLeftColor: reply.is_creator ? theme.accentColor : undefined
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ backgroundColor: theme.accentColor + '30', color: theme.accentColor }}
                      >
                        {(reply.author?.display_name || 'A')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium" style={{ color: theme.textPrimary }}>
                            {reply.author?.display_name || 'Anonymous'}
                          </span>
                          {reply.is_creator && (
                            <span 
                              className="px-2 py-0.5 rounded text-xs font-medium"
                              style={{ backgroundColor: theme.accentColor + '30', color: theme.accentColor }}
                            >
                              Creator
                            </span>
                          )}
                        </div>
                        <span className="text-xs" style={{ color: theme.textSecondary }}>
                          {formatRelativeTime(reply.created_at)}
                        </span>
                      </div>
                    </div>
                    <p className="pl-11" style={{ color: theme.textSecondary }}>{reply.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Reply Input */}
            {user ? (
              <div 
                className="p-4 rounded-xl border"
                style={{ 
                  backgroundColor: 'rgba(0,0,0,0.2)', 
                  borderColor: 'rgba(255,255,255,0.1)' 
                }}
              >
                <Textarea
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  rows={3}
                  className="w-full rounded-lg mb-3"
                  style={{ 
                    backgroundColor: 'rgba(0,0,0,0.3)', 
                    borderColor: 'rgba(29, 78, 216, 0.5)', 
                    color: theme.textPrimary 
                  }}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={submitReply}
                    disabled={!replyContent.trim() || submitting}
                    className="rounded-full"
                    style={{ 
                      background: `linear-gradient(135deg, ${theme.accentColor}, ${theme.accentColor}dd)`,
                      color: '#ffffff',
                      boxShadow: `0 0 ${50 * ((settings.glowIntensity || 50) / 100)}px ${theme.accentColor}80, 0 0 ${80 * ((settings.glowIntensity || 50) / 100)}px ${theme.accentColor}40`
                    }}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    Post Reply
                  </Button>
                </div>
              </div>
            ) : (
              <div 
                className="text-center py-6 rounded-xl border"
                style={{ 
                  backgroundColor: 'rgba(0,0,0,0.2)', 
                  borderColor: 'rgba(255,255,255,0.1)',
                  color: theme.textSecondary 
                }}
              >
                Sign in to join the discussion
              </div>
            )}
          </div>
        )}
      </div>

      {/* Suggestion Modal - Premium Style */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="rounded-2xl backdrop-blur-xl border shadow-2xl w-full max-w-lg p-6"
            style={{
              backgroundColor: getCardBackground(),
              borderColor: settings.useCustomColors && settings.customCardBorder 
                ? settings.customCardBorder 
                : theme.cardBorder,
            }}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl" style={{ color: theme.textPrimary }}>Suggest a Feature</h3>
              <button 
                onClick={() => setShowModal(false)} 
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" style={{ color: theme.textSecondary }} />
              </button>
            </div>
            {!user ? (
              <div className="text-center py-8">
                <p className="mb-4" style={{ color: theme.textSecondary }}>Sign in to suggest features</p>
                <Button 
                  className="rounded-full"
                  style={{ 
                    background: `linear-gradient(135deg, ${theme.accentColor}, ${theme.accentColor}dd)`,
                    color: '#fff' 
                  }}
                >
                  Sign In
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm mb-2 block" style={{ color: theme.textSecondary }}>Feature Title</Label>
                  <Input 
                    placeholder="What feature would you like to see?" 
                    value={suggestionTitle} 
                    onChange={e => setSuggestionTitle(e.target.value)} 
                    className="text-base rounded-xl"
                    style={{ 
                      backgroundColor: 'rgba(0,0,0,0.3)', 
                      borderColor: 'rgba(29, 78, 216, 0.5)', 
                      color: theme.textPrimary 
                    }} 
                  />
                </div>
                <div>
                  <Label className="text-sm mb-2 block" style={{ color: theme.textSecondary }}>Description (optional)</Label>
                  <Textarea 
                    placeholder="Describe your feature idea in detail..." 
                    value={suggestionDesc} 
                    onChange={e => setSuggestionDesc(e.target.value)} 
                    rows={4} 
                    className="rounded-xl"
                    style={{ 
                      backgroundColor: 'rgba(0,0,0,0.3)', 
                      borderColor: 'rgba(29, 78, 216, 0.5)', 
                      color: theme.textPrimary 
                    }} 
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowModal(false)} 
                    className="flex-1 rounded-full"
                    style={{ 
                      borderColor: 'rgba(29, 78, 216, 0.5)', 
                      color: theme.textSecondary,
                      backgroundColor: 'transparent'
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={submitSuggestion} 
                    disabled={!suggestionTitle.trim() || submitting} 
                    className="flex-1 font-semibold rounded-full"
                    style={{ 
                      background: `linear-gradient(135deg, ${theme.accentColor}, ${theme.accentColor}dd)`,
                      color: '#ffffff',
                      boxShadow: `0 0 ${25 * ((settings.glowIntensity || 50) / 100)}px ${theme.accentColor}50, 0 0 ${40 * ((settings.glowIntensity || 50) / 100)}px ${theme.accentColor}25`
                    }}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    Submit
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoadmapPage;
