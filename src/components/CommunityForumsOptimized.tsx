import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageCircle, Plus, ArrowLeft, Send, Loader2, 
  Pin, Lock, Eye, Clock, ChevronLeft, ChevronRight, X
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
      <div className="max-w-4xl mx-auto space-y-4">
        {effectiveSettings.showHeader && (
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-1" style={{ color: effectiveSettings.textPrimary }}>
              {effectiveSettings.forumTitle}
            </h2>
            <p className="text-sm" style={{ color: effectiveSettings.textSecondary }}>
              {effectiveSettings.forumSubtitle}
            </p>
          </div>
        )}
        
        <div className="flex gap-2 flex-wrap items-center">
          <Input
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px]"
            style={cardStyle}
          />
          {user && (
            <Button
              onClick={() => setShowNewPost(true)}
              style={{ backgroundColor: effectiveSettings.accentColor }}
              className="text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              New Post
            </Button>
          )}
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            onClick={() => handleCategorySelect(null)}
            size="sm"
          >
            All
          </Button>
          {categories.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              onClick={() => handleCategorySelect(cat.id)}
              size="sm"
            >
              {cat.icon} {cat.name}
            </Button>
          ))}
        </div>
        
        {showNewPost && (
          <div className="p-4 space-y-3" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold" style={{ color: effectiveSettings.textPrimary }}>Create New Post</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowNewPost(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Input
              placeholder="Post title..."
              value={newPostTitle}
              onChange={(e) => setNewPostTitle(e.target.value)}
              style={cardStyle}
            />
            <Textarea
              placeholder="What's on your mind?"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              rows={4}
              style={cardStyle}
            />
            {categories.length > 0 && (
              <select
                value={newPostCategory}
                onChange={(e) => setNewPostCategory(e.target.value)}
                className="w-full p-2 rounded"
                style={cardStyle}
              >
                <option value="">Select category...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            )}
            <Button
              onClick={createPost}
              disabled={submitting}
              style={{ backgroundColor: effectiveSettings.accentColor }}
              className="w-full text-white"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
            </Button>
          </div>
        )}
        
        <div className="space-y-2">
          {displayedPosts.map(post => (
            <div
              key={post.id}
              onClick={() => handlePostSelect(post)}
              className="p-3 cursor-pointer hover:opacity-80 transition-opacity"
              style={cardStyle}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {post.is_pinned && <Pin className="w-3 h-3" style={{ color: effectiveSettings.accentColor }} />}
                    {post.is_locked && <Lock className="w-3 h-3" style={{ color: effectiveSettings.textSecondary }} />}
                    <h3 className="font-semibold text-sm truncate" style={{ color: effectiveSettings.textPrimary }}>
                      {post.title}
                    </h3>
                  </div>
                  <p className="text-xs line-clamp-2 mb-2" style={{ color: effectiveSettings.textSecondary }}>
                    {post.content}
                  </p>
                  <div className="flex items-center gap-3 text-xs" style={{ color: effectiveSettings.textSecondary }}>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {post.reply_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {post.view_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm" style={{ color: effectiveSettings.textSecondary }}>
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }
  
  // View: Post detail with replies
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Button
        variant="ghost"
        onClick={() => {
          setSelectedPost(null);
          setRepliesPage(1);
        }}
        size="sm"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to posts
      </Button>
      
      <div className="p-4" style={cardStyle}>
        <h2 className="text-xl font-bold mb-3" style={{ color: effectiveSettings.textPrimary }}>
          {selectedPost.title}
        </h2>
        <p className="whitespace-pre-wrap mb-3 text-sm" style={{ color: effectiveSettings.textSecondary }}>
          {selectedPost.content}
        </p>
        <div className="flex items-center gap-3 text-xs" style={{ color: effectiveSettings.textSecondary }}>
          <span>{selectedPost.author?.display_name || 'Anonymous'}</span>
          <span>•</span>
          <span>{new Date(selectedPost.created_at).toLocaleString()}</span>
        </div>
      </div>
      
      <div className="space-y-3">
        <h3 className="text-base font-semibold" style={{ color: effectiveSettings.textPrimary }}>
          Replies ({totalReplies})
        </h3>
        
        {user && !selectedPost.is_locked && (
          <div className="p-3 space-y-2" style={cardStyle}>
            <Textarea
              placeholder="Write a reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={3}
              style={cardStyle}
            />
            <Button
              onClick={createReply}
              disabled={submitting}
              style={{ backgroundColor: effectiveSettings.accentColor }}
              className="text-white"
              size="sm"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3 h-3 mr-1" />Reply</>}
            </Button>
          </div>
        )}
        
        {replies.map(reply => (
          <div key={reply.id} className="p-3" style={cardStyle}>
            <p className="whitespace-pre-wrap mb-2 text-sm" style={{ color: effectiveSettings.textSecondary }}>
              {reply.content}
            </p>
            <div className="flex items-center gap-2 text-xs" style={{ color: effectiveSettings.textSecondary }}>
              <span>{reply.author?.display_name || 'Anonymous'}</span>
              <span>•</span>
              <span>{new Date(reply.created_at).toLocaleString()}</span>
            </div>
          </div>
        ))}
        
        {totalRepliesPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRepliesPage(p => Math.max(1, p - 1))}
              disabled={repliesPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm" style={{ color: effectiveSettings.textSecondary }}>
              Page {repliesPage} of {totalRepliesPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRepliesPage(p => Math.min(totalRepliesPages, p + 1))}
              disabled={repliesPage === totalRepliesPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
