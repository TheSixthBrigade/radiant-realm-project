import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageCircle, Plus, ArrowLeft, Send, Loader2, 
  Pin, Lock, Eye, Clock, ChevronLeft, ChevronRight, X,
  ThumbsUp, Flame, Sparkles, Search, TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { CommunitySettings, DEFAULT_COMMUNITY_SETTINGS } from '@/lib/communitySettings';

interface ForumCategory {
  id: string;
  creator_id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

interface ForumPost {
  id: string;
  category_id: string;
  creator_id: string;
  user_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  view_count: number;
  reply_count: number;
  last_reply_at?: string;
  created_at: string;
  media_urls?: string[];
  tagged_product_id?: string;
  tagged_product?: { id: string; title: string; thumbnail_url?: string };
  author?: { display_name?: string; avatar_url?: string };
  category?: ForumCategory;
}

interface ForumReply {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  is_solution: boolean;
  created_at: string;
  media_urls?: string[];
  author?: { display_name?: string; avatar_url?: string };
}

interface CommunityForumsOptimizedProps {
  creatorId: string;
  isOwner: boolean;
  accentColor?: string;
  settings?: CommunitySettings;
}

const POSTS_PER_PAGE = 20;
const REPLIES_PER_PAGE = 20;
const CACHE_TTL = 5 * 60 * 1000;

const cache = new Map<string, { data: any; timestamp: number }>();

const getCached = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCache = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
};

export const CommunityForumsOptimized = ({ 
  creatorId, 
  isOwner, 
  accentColor = '#22c55e', 
  settings = DEFAULT_COMMUNITY_SETTINGS 
}: CommunityForumsOptimizedProps) => {
  const { user } = useAuth();
  
  const effectiveSettings = useMemo(() => ({
    accentColor: settings.accentColor || accentColor,
    bgColor: settings.backgroundColor || '#0f172a',
    cardBorder: settings.cardBorderColor || 'rgba(255, 255, 255, 0.08)',
    textPrimary: settings.textPrimaryColor || '#ffffff',
    textSecondary: settings.textSecondaryColor || '#9ca3af',
    cardOpacity: (settings.cardOpacity ?? 40) / 100,
    cardRadius: settings.cardBorderRadius ?? 12,
    cardGlow: settings.cardGlow ?? false,
    glowIntensity: (settings.glowIntensity ?? 50) / 100,
    forumTitle: settings.title || 'Community Forum',
    forumSubtitle: settings.subtitle || 'Join the conversation',
    showHeader: settings.showHeader !== false,
  }), [settings, accentColor]);
  
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const [repliesPage, setRepliesPage] = useState(1);
  const [totalReplies, setTotalReplies] = useState(0);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  
  // New post state
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState<string>('');
  
  // Reply state
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);
  
  const fetchCategories = useCallback(async () => {
    const cacheKey = `categories_${creatorId}`;
    const cached = getCached(cacheKey);
    if (cached) {
      setCategories(cached);
      return cached;
    }
    
    const { data, error } = await (supabase as any)
      .from('forum_categories')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('is_active', true)
      .order('sort_order');
    
    if (!error && data) {
      setCache(cacheKey, data);
      setCategories(data);
      return data;
    }
    return [];
  }, [creatorId]);
  
  const fetchPosts = useCallback(async (page: number = 1, categoryId?: string | null, search?: string) => {
    setLoading(true);
    try {
      const offset = (page - 1) * POSTS_PER_PAGE;
      
      let query = (supabase as any)
        .from('forum_posts')
        .select(`
          *,
          author:profiles!forum_posts_user_id_fkey(display_name, avatar_url),
          category:forum_categories!forum_posts_category_id_fkey(*)
        `, { count: 'exact' })
        .eq('creator_id', creatorId);
      
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      
      if (search) {
        query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
      }
      
      query = query
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + POSTS_PER_PAGE - 1);
      
      const { data, error, count } = await query;
      
      if (!error && data) {
        setPosts(data);
        setTotalPosts(count || 0);
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  }, [creatorId]);
  
  const fetchReplies = useCallback(async (postId: string, page: number = 1) => {
    const offset = (page - 1) * REPLIES_PER_PAGE;
    
    const { data, error, count } = await (supabase as any)
      .from('forum_replies')
      .select(`
        *,
        author:profiles!forum_replies_user_id_fkey(display_name, avatar_url)
      `, { count: 'exact' })
      .eq('post_id', postId)
      .order('created_at')
      .range(offset, offset + REPLIES_PER_PAGE - 1);
    
    if (!error && data) {
      setReplies(data);
      setTotalReplies(count || 0);
    }
  }, []);
  
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);
  
  useEffect(() => {
    fetchPosts(currentPage, selectedCategory, debouncedSearch);
  }, [currentPage, selectedCategory, debouncedSearch, fetchPosts]);
  
  useEffect(() => {
    if (selectedPost) {
      fetchReplies(selectedPost.id, repliesPage);
    }
  }, [selectedPost, repliesPage, fetchReplies]);
  
  const displayedPosts = useMemo(() => posts, [posts]);
  const totalPages = useMemo(() => Math.ceil(totalPosts / POSTS_PER_PAGE), [totalPosts]);
  const totalRepliesPages = useMemo(() => Math.ceil(totalReplies / REPLIES_PER_PAGE), [totalReplies]);
  
  const handleCategorySelect = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1);
  }, []);
  
  const handlePostSelect = useCallback((post: ForumPost) => {
    setSelectedPost(post);
    setRepliesPage(1);
    setPosts(prev => prev.map(p => 
      p.id === post.id ? { ...p, view_count: p.view_count + 1 } : p
    ));
    (supabase as any)
      .from('forum_posts')
      .update({ view_count: post.view_count + 1 })
      .eq('id', post.id)
      .then();
  }, []);
  
  const createPost = async () => {
    if (!user) {
      toast.error('Please sign in to post');
      return;
    }
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      toast.error('Title and content are required');
      return;
    }

    setSubmitting(true);
    try {
      let categoryId = newPostCategory;
      if (!categoryId && categories.length === 0) {
        const { data: newCat } = await (supabase as any)
          .from('forum_categories')
          .insert({
            creator_id: creatorId,
            name: 'General',
            icon: '💬',
            color: effectiveSettings.accentColor
          })
          .select()
          .single();
        if (newCat) {
          categoryId = newCat.id;
          setCategories([newCat]);
        }
      } else if (!categoryId && categories.length > 0) {
        categoryId = categories[0].id;
      }

      const { error } = await (supabase as any)
        .from('forum_posts')
        .insert({
          category_id: categoryId,
          creator_id: creatorId,
          user_id: user.id,
          title: newPostTitle.trim(),
          content: newPostContent.trim()
        });

      if (error) throw error;

      toast.success('Post created!');
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostCategory('');
      setShowNewPost(false);
      fetchPosts(currentPage, selectedCategory, debouncedSearch);
    } catch (err: any) {
      console.error('Error creating post:', err);
      toast.error(err.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const createReply = async () => {
    if (!user || !selectedPost) {
      toast.error('Please sign in to reply');
      return;
    }
    if (!replyContent.trim()) {
      toast.error('Reply content is required');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from('forum_replies')
        .insert({
          post_id: selectedPost.id,
          user_id: user.id,
          content: replyContent.trim()
        });

      if (error) throw error;

      toast.success('Reply posted!');
      setReplyContent('');
      fetchReplies(selectedPost.id, repliesPage);
    } catch (err: any) {
      console.error('Error creating reply:', err);
      toast.error(err.message || 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };
  
  const cardStyle = useMemo(() => {
    const baseStyle: React.CSSProperties = {
      backgroundColor: `rgba(30, 41, 59, ${effectiveSettings.cardOpacity})`,
      border: `1px solid ${effectiveSettings.cardBorder}`,
      borderRadius: `${effectiveSettings.cardRadius}px`,
    };
    if (effectiveSettings.cardGlow) {
      baseStyle.boxShadow = `0 0 ${20 * effectiveSettings.glowIntensity}px ${effectiveSettings.accentColor}40`;
    }
    return baseStyle;
  }, [effectiveSettings]);
  
  if (loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: effectiveSettings.accentColor }} />
      </div>
    );
  }
  
  // View: Post list
  if (!selectedPost) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 px-4">
        {effectiveSettings.showHeader && (
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4" 
              style={{ backgroundColor: `${effectiveSettings.accentColor}20`, border: `1px solid ${effectiveSettings.accentColor}40` }}>
              <Sparkles className="w-4 h-4" style={{ color: effectiveSettings.accentColor }} />
              <span className="text-sm font-medium" style={{ color: effectiveSettings.accentColor }}>Community Hub</span>
            </div>
            <h2 className="text-3xl font-bold mb-2" style={{ color: effectiveSettings.textPrimary }}>
              {effectiveSettings.forumTitle}
            </h2>
            <p className="text-base" style={{ color: effectiveSettings.textSecondary }}>
              {effectiveSettings.forumSubtitle}
            </p>
          </div>
        )}
        
        {/* Search and New Post */}
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: effectiveSettings.textSecondary }} />
            <Input
              placeholder="Search discussions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
              style={{ 
                ...cardStyle, 
                backgroundColor: `rgba(30, 41, 59, ${effectiveSettings.cardOpacity * 0.7})` 
              }}
            />
          </div>
          {user && (
            <Button
              onClick={() => setShowNewPost(true)}
              style={{ backgroundColor: effectiveSettings.accentColor }}
              className="text-white h-11 px-5 font-medium shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Start Discussion
            </Button>
          )}
        </div>
        
        {/* Category Pills */}
        <div className="flex gap-2 flex-wrap pb-2">
          <button
            onClick={() => handleCategorySelect(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCategory === null ? 'shadow-lg' : 'hover:opacity-80'
            }`}
            style={{
              backgroundColor: selectedCategory === null ? effectiveSettings.accentColor : `rgba(255,255,255,0.1)`,
              color: selectedCategory === null ? '#fff' : effectiveSettings.textSecondary,
              border: `1px solid ${selectedCategory === null ? effectiveSettings.accentColor : 'rgba(255,255,255,0.1)'}`
            }}
          >
            <TrendingUp className="w-3.5 h-3.5 inline mr-1.5" />
            All Posts
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === cat.id ? 'shadow-lg' : 'hover:opacity-80'
              }`}
              style={{
                backgroundColor: selectedCategory === cat.id ? (cat.color || effectiveSettings.accentColor) : `rgba(255,255,255,0.1)`,
                color: selectedCategory === cat.id ? '#fff' : effectiveSettings.textSecondary,
                border: `1px solid ${selectedCategory === cat.id ? (cat.color || effectiveSettings.accentColor) : 'rgba(255,255,255,0.1)'}`
              }}
            >
              <span className="mr-1.5">{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
        
        {/* New Post Form */}
        {showNewPost && (
          <div className="p-5 space-y-4 animate-in slide-in-from-top-2" style={{
            ...cardStyle,
            boxShadow: `0 0 30px ${effectiveSettings.accentColor}30`
          }}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: effectiveSettings.textPrimary }}>
                <Flame className="w-5 h-5" style={{ color: effectiveSettings.accentColor }} />
                Start a New Discussion
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowNewPost(false)} className="hover:bg-white/10">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Input
              placeholder="Give your post a catchy title..."
              value={newPostTitle}
              onChange={(e) => setNewPostTitle(e.target.value)}
              className="h-12 text-base"
              style={{ ...cardStyle, backgroundColor: 'rgba(0,0,0,0.3)' }}
            />
            <Textarea
              placeholder="Share your thoughts, questions, or ideas..."
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              rows={5}
              className="text-base resize-none"
              style={{ ...cardStyle, backgroundColor: 'rgba(0,0,0,0.3)' }}
            />
            {categories.length > 0 && (
              <select
                value={newPostCategory}
                onChange={(e) => setNewPostCategory(e.target.value)}
                className="w-full p-3 rounded-lg text-sm"
                style={{ ...cardStyle, backgroundColor: 'rgba(0,0,0,0.3)' }}
              >
                <option value="">Choose a category...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            )}
            <Button
              onClick={createPost}
              disabled={submitting || !newPostTitle.trim() || !newPostContent.trim()}
              style={{ backgroundColor: effectiveSettings.accentColor }}
              className="w-full h-11 text-white font-medium"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Publish Post
            </Button>
          </div>
        )}
        
        {/* Posts List */}
        <div className="space-y-3">
          {displayedPosts.length === 0 ? (
            <div className="text-center py-16" style={cardStyle}>
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: effectiveSettings.textSecondary }} />
              <p className="text-lg font-medium mb-2" style={{ color: effectiveSettings.textPrimary }}>No discussions yet</p>
              <p className="text-sm" style={{ color: effectiveSettings.textSecondary }}>Be the first to start a conversation!</p>
            </div>
          ) : (
            displayedPosts.map((post, index) => (
              <div
                key={post.id}
                onClick={() => handlePostSelect(post)}
                className="p-4 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg group"
                style={{
                  ...cardStyle,
                  animationDelay: `${index * 50}ms`,
                  borderLeft: post.is_pinned ? `3px solid ${effectiveSettings.accentColor}` : undefined
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Author Avatar */}
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${effectiveSettings.accentColor}, ${effectiveSettings.accentColor}aa)` }}
                  >
                    {post.author?.avatar_url ? (
                      <img src={post.author.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      post.author?.display_name?.[0]?.toUpperCase() || '?'
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Title Row */}
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      {post.is_pinned && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                          style={{ backgroundColor: `${effectiveSettings.accentColor}20`, color: effectiveSettings.accentColor }}>
                          <Pin className="w-3 h-3" /> Pinned
                        </span>
                      )}
                      {post.is_locked && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      )}
                      {post.category && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ backgroundColor: `${post.category.color || effectiveSettings.accentColor}20`, color: post.category.color || effectiveSettings.accentColor }}>
                          {post.category.icon} {post.category.name}
                        </span>
                      )}
                    </div>
                    
                    <h3 className="font-semibold text-base mb-1.5 group-hover:underline" style={{ color: effectiveSettings.textPrimary }}>
                      {post.title}
                    </h3>
                    
                    <p className="text-sm line-clamp-2 mb-3" style={{ color: effectiveSettings.textSecondary }}>
                      {post.content}
                    </p>
                    
                    {/* Meta Row */}
                    <div className="flex items-center gap-4 text-xs" style={{ color: effectiveSettings.textSecondary }}>
                      <span className="font-medium" style={{ color: effectiveSettings.accentColor }}>
                        @{post.author?.display_name || 'Anonymous'}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5" />
                        {post.reply_count || 0} replies
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {post.view_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6 pt-4" style={{ borderTop: `1px solid ${effectiveSettings.cardBorder}` }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-9"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-9 h-9 rounded-lg text-sm font-medium transition-all"
                    style={{
                      backgroundColor: currentPage === pageNum ? effectiveSettings.accentColor : 'transparent',
                      color: currentPage === pageNum ? '#fff' : effectiveSettings.textSecondary
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-9"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    );
  }
  
  // View: Post detail with replies
  return (
    <div className="max-w-5xl mx-auto space-y-6 px-4">
      <Button
        variant="ghost"
        onClick={() => {
          setSelectedPost(null);
          setRepliesPage(1);
        }}
        className="hover:bg-white/10"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to discussions
      </Button>
      
      {/* Main Post */}
      <div className="p-6" style={{
        ...cardStyle,
        boxShadow: `0 0 30px ${effectiveSettings.accentColor}20`
      }}>
        {/* Author Header */}
        <div className="flex items-center gap-3 mb-4">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${effectiveSettings.accentColor}, ${effectiveSettings.accentColor}aa)` }}
          >
            {selectedPost.author?.avatar_url ? (
              <img src={selectedPost.author.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              selectedPost.author?.display_name?.[0]?.toUpperCase() || '?'
            )}
          </div>
          <div>
            <p className="font-semibold" style={{ color: effectiveSettings.accentColor }}>
              @{selectedPost.author?.display_name || 'Anonymous'}
            </p>
            <p className="text-xs" style={{ color: effectiveSettings.textSecondary }}>
              {new Date(selectedPost.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        
        {/* Badges */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {selectedPost.is_pinned && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: `${effectiveSettings.accentColor}20`, color: effectiveSettings.accentColor }}>
              <Pin className="w-3 h-3" /> Pinned
            </span>
          )}
          {selectedPost.is_locked && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
              <Lock className="w-3 h-3" /> Locked
            </span>
          )}
          {selectedPost.category && (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: `${selectedPost.category.color || effectiveSettings.accentColor}20`, color: selectedPost.category.color || effectiveSettings.accentColor }}>
              {selectedPost.category.icon} {selectedPost.category.name}
            </span>
          )}
        </div>
        
        <h2 className="text-2xl font-bold mb-4" style={{ color: effectiveSettings.textPrimary }}>
          {selectedPost.title}
        </h2>
        
        <div className="whitespace-pre-wrap text-base leading-relaxed mb-4" style={{ color: effectiveSettings.textSecondary }}>
          {selectedPost.content}
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-4 pt-4 text-sm" style={{ borderTop: `1px solid ${effectiveSettings.cardBorder}`, color: effectiveSettings.textSecondary }}>
          <span className="flex items-center gap-1.5">
            <Eye className="w-4 h-4" />
            {selectedPost.view_count} views
          </span>
          <span className="flex items-center gap-1.5" style={{ color: effectiveSettings.accentColor }}>
            <MessageCircle className="w-4 h-4" />
            {totalReplies} replies
          </span>
        </div>
      </div>
      
      {/* Replies Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: effectiveSettings.textPrimary }}>
          <MessageCircle className="w-5 h-5" style={{ color: effectiveSettings.accentColor }} />
          Replies ({totalReplies})
        </h3>
        
        {/* Reply Form */}
        {user && !selectedPost.is_locked && (
          <div className="p-4 space-y-3" style={cardStyle}>
            <Textarea
              placeholder="Share your thoughts..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={3}
              className="resize-none"
              style={{ ...cardStyle, backgroundColor: 'rgba(0,0,0,0.3)' }}
            />
            <div className="flex justify-end">
              <Button
                onClick={createReply}
                disabled={submitting || !replyContent.trim()}
                style={{ backgroundColor: effectiveSettings.accentColor }}
                className="text-white"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Post Reply
              </Button>
            </div>
          </div>
        )}
        
        {selectedPost.is_locked && (
          <div className="p-4 text-center rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <Lock className="w-5 h-5 mx-auto mb-2 text-red-400" />
            <p className="text-sm text-red-400">This discussion is locked and no longer accepting replies.</p>
          </div>
        )}
        
        {/* Replies List */}
        {replies.length === 0 ? (
          <div className="text-center py-12" style={cardStyle}>
            <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: effectiveSettings.textSecondary }} />
            <p className="text-sm" style={{ color: effectiveSettings.textSecondary }}>No replies yet. Be the first to respond!</p>
          </div>
        ) : (
          replies.map((reply, index) => (
            <div 
              key={reply.id} 
              className="p-4 transition-all hover:shadow-md"
              style={{
                ...cardStyle,
                animationDelay: `${index * 30}ms`
              }}
            >
              <div className="flex items-start gap-3">
                <div 
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${effectiveSettings.accentColor}aa, ${effectiveSettings.accentColor}66)` }}
                >
                  {reply.author?.avatar_url ? (
                    <img src={reply.author.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    reply.author?.display_name?.[0]?.toUpperCase() || '?'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-medium text-sm" style={{ color: effectiveSettings.accentColor }}>
                      @{reply.author?.display_name || 'Anonymous'}
                    </span>
                    <span className="text-xs" style={{ color: effectiveSettings.textSecondary }}>
                      {new Date(reply.created_at).toLocaleString()}
                    </span>
                    {reply.is_solution && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                        ✓ Solution
                      </span>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm" style={{ color: effectiveSettings.textSecondary }}>
                    {reply.content}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Replies Pagination */}
        {totalRepliesPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4 pt-4" style={{ borderTop: `1px solid ${effectiveSettings.cardBorder}` }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRepliesPage(p => Math.max(1, p - 1))}
              disabled={repliesPage === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm px-3" style={{ color: effectiveSettings.textSecondary }}>
              Page {repliesPage} of {totalRepliesPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRepliesPage(p => Math.min(totalRepliesPages, p + 1))}
              disabled={repliesPage === totalRepliesPages}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
