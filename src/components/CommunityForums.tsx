import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageCircle, Plus, ArrowLeft, Send, Loader2, 
  Pin, Lock, CheckCircle, Eye, Clock, Image as ImageIcon,
  X, Tag, Upload, Play, Trash2, Settings, Users, Code, Copy, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { CommunitySettings, DEFAULT_COMMUNITY_SETTINGS } from '@/lib/communitySettings';
import { ImageUploadZone } from './ImageUploadZone';

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

interface Product {
  id: string;
  title: string;
  thumbnail_url?: string;
}

interface CommunityForumsProps {
  creatorId: string;
  isOwner: boolean;
  accentColor?: string;
  settings?: CommunitySettings;
}

export const CommunityForums = ({ creatorId, isOwner, accentColor = '#14b8a6', settings = DEFAULT_COMMUNITY_SETTINGS }: CommunityForumsProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  
  // Use settings values with fallbacks
  const effectiveAccent = settings.accentColor || accentColor;
  const bgColor = settings.backgroundColor || '#0f172a';
  const cardBorder = settings.cardBorderColor || 'rgba(255, 255, 255, 0.08)';
  const textPrimary = settings.textPrimaryColor || '#ffffff';
  const textSecondary = settings.textSecondaryColor || '#9ca3af';
  const cardOpacity = (settings.cardOpacity ?? 40) / 100;
  const cardRadius = settings.cardBorderRadius ?? 12;
  const cardGlow = settings.cardGlow ?? false;
  const glowIntensity = (settings.glowIntensity ?? 50) / 100;
  const forumTitle = settings.title || 'Community Forum';
  const forumSubtitle = settings.subtitle || 'Join the conversation with the community';
  const showHeader = settings.showHeader !== false;
  
  // Parse card background color and apply opacity
  const getCardBgWithOpacity = () => {
    const rawBg = settings.cardBackgroundColor || 'rgba(30, 41, 59, 0.4)';
    // If it's already rgba, extract RGB and apply new opacity
    const rgbaMatch = rawBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbaMatch) {
      return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${cardOpacity})`;
    }
    // If it's a hex color, convert to rgba
    if (rawBg.startsWith('#')) {
      const r = parseInt(rawBg.slice(1, 3), 16);
      const g = parseInt(rawBg.slice(3, 5), 16);
      const b = parseInt(rawBg.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${cardOpacity})`;
    }
    return rawBg;
  };
  
  // Background styling
  const getBackgroundStyle = () => {
    if (settings.backgroundType === 'gradient') {
      return {
        background: `linear-gradient(135deg, ${settings.backgroundGradientStart || '#0f172a'} 0%, ${settings.backgroundGradientEnd || '#1e1b4b'} 100%)`
      };
    } else if (settings.backgroundType === 'image' && settings.backgroundImage) {
      return {
        backgroundImage: `linear-gradient(rgba(0,0,0,${(settings.backgroundOverlayOpacity ?? 50) / 100}), rgba(0,0,0,${(settings.backgroundOverlayOpacity ?? 50) / 100})), url(${settings.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      };
    }
    return { backgroundColor: bgColor };
  };
  
  // Card styling helper
  const getCardStyle = () => {
    const baseStyle: React.CSSProperties = {
      backgroundColor: getCardBgWithOpacity(),
      border: `1px solid ${cardBorder}`,
      borderRadius: `${cardRadius}px`,
    };
    if (cardGlow) {
      baseStyle.boxShadow = `0 0 ${20 * glowIntensity}px ${effectiveAccent}40, 0 0 ${40 * glowIntensity}px ${effectiveAccent}20`;
    }
    return baseStyle;
  };
  
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  
  const [showNewPost, setShowNewPost] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState<string>('');
  const [newPostMedia, setNewPostMedia] = useState<File[]>([]);
  const [newPostMediaPreviews, setNewPostMediaPreviews] = useState<string[]>([]);
  const [taggedProductId, setTaggedProductId] = useState<string>('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('💬');
  const [replyContent, setReplyContent] = useState('');
  const [replyMedia, setReplyMedia] = useState<File[]>([]);
  const [replyMediaPreviews, setReplyMediaPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const categoryIcons = ['💬', '📢', '❓', '💡', '🐛', '🎨', '🔧', '📚', '🎮', '🛒'];

  useEffect(() => { fetchData(); }, [creatorId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch categories - cast to any to bypass type checking for new tables
      const { data: cats } = await (supabase as any)
        .from('forum_categories')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('is_active', true)
        .order('sort_order');
      setCategories(cats || []);

      // Fetch all posts with author info
      const { data: postsData } = await (supabase as any)
        .from('forum_posts')
        .select('*')
        .eq('creator_id', creatorId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      
      // Fetch author profiles and categories for posts
      const postsWithDetails = await Promise.all((postsData || []).map(async (post: any) => {
        // Get author
        const { data: author } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('user_id', post.user_id)
          .single();
        
        // Get category
        const cat = (cats || []).find((c: any) => c.id === post.category_id);
        
        // Get tagged product
        let tagged_product = null;
        if (post.tagged_product_id) {
          const { data: prod } = await supabase
            .from('products')
            .select('id, title, thumbnail_url')
            .eq('id', post.tagged_product_id)
            .single();
          tagged_product = prod;
        }
        
        return { ...post, author, category: cat, tagged_product };
      }));
      setPosts(postsWithDetails);

      // Fetch products for tagging
      const { data: prods } = await supabase
        .from('products')
        .select('id, title, thumbnail_url')
        .eq('creator_id', creatorId);
      setProducts((prods || []) as unknown as Product[]);
    } catch (err) {
      console.error('Error fetching forum data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async (postId: string) => {
    const { data } = await (supabase as any)
      .from('forum_replies')
      .select('*')
      .eq('post_id', postId)
      .order('created_at');
    
    // Fetch author profiles for replies
    const repliesWithAuthors = await Promise.all((data || []).map(async (reply: any) => {
      const { data: author } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', reply.user_id)
        .single();
      return { ...reply, author };
    }));
    setReplies(repliesWithAuthors);
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>, isReply = false) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 500 * 1024 * 1024;
    
    const validFiles = files.filter(f => {
      if (f.size > maxSize) {
        toast.error(`${f.name} exceeds 500MB limit`);
        return false;
      }
      return true;
    });

    if (isReply) {
      setReplyMedia(prev => [...prev, ...validFiles]);
      validFiles.forEach(f => {
        const url = URL.createObjectURL(f);
        setReplyMediaPreviews(prev => [...prev, url]);
      });
    } else {
      setNewPostMedia(prev => [...prev, ...validFiles]);
      validFiles.forEach(f => {
        const url = URL.createObjectURL(f);
        setNewPostMediaPreviews(prev => [...prev, url]);
      });
    }
  };

  const removeMedia = (index: number, isReply = false) => {
    if (isReply) {
      setReplyMedia(prev => prev.filter((_, i) => i !== index));
      setReplyMediaPreviews(prev => prev.filter((_, i) => i !== index));
    } else {
      setNewPostMedia(prev => prev.filter((_, i) => i !== index));
      setNewPostMediaPreviews(prev => prev.filter((_, i) => i !== index));
    }
  };

  const uploadMedia = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    setUploadingMedia(true);
    
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
      const path = `${creatorId}/${fileName}`;
      
      const { error } = await supabase.storage
        .from('forum-media')
        .upload(path, file);
      
      if (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('forum-media')
        .getPublicUrl(path);
      
      urls.push(publicUrl);
    }
    
    setUploadingMedia(false);
    return urls;
  };

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
      let mediaUrls: string[] = [];
      if (newPostMedia.length > 0) {
        mediaUrls = await uploadMedia(newPostMedia);
      }

      let categoryId = newPostCategory;
      if (!categoryId && categories.length === 0) {
        const { data: newCat } = await (supabase as any)
          .from('forum_categories')
          .insert({
            creator_id: creatorId,
            name: 'General',
            icon: '💬',
            color: accentColor
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
          content: newPostContent.trim(),
          media_urls: mediaUrls,
          tagged_product_id: taggedProductId || null
        });

      if (error) throw error;

      toast.success('Post created!');
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostCategory('');
      setNewPostMedia([]);
      setNewPostMediaPreviews([]);
      setTaggedProductId('');
      setShowNewPost(false);
      fetchData();
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
      let mediaUrls: string[] = [];
      if (replyMedia.length > 0) {
        mediaUrls = await uploadMedia(replyMedia);
      }

      const { error } = await (supabase as any)
        .from('forum_replies')
        .insert({
          post_id: selectedPost.id,
          user_id: user.id,
          content: replyContent.trim(),
          media_urls: mediaUrls
        });

      if (error) throw error;

      toast.success('Reply posted!');
      setReplyContent('');
      setReplyMedia([]);
      setReplyMediaPreviews([]);
      fetchReplies(selectedPost.id);
    } catch (err: any) {
      console.error('Error creating reply:', err);
      toast.error(err.message || 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  const createCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Category name is required');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from('forum_categories')
        .insert({
          creator_id: creatorId,
          name: newCategoryName.trim(),
          icon: newCategoryIcon,
          color: accentColor,
          sort_order: categories.length
        });

      if (error) throw error;

      toast.success('Category created!');
      setNewCategoryName('');
      setNewCategoryIcon('💬');
      setShowNewCategory(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePin = async (post: ForumPost) => {
    const { error } = await (supabase as any)
      .from('forum_posts')
      .update({ is_pinned: !post.is_pinned })
      .eq('id', post.id);
    
    if (!error) {
      toast.success(post.is_pinned ? 'Unpinned' : 'Pinned');
      fetchData();
    }
  };

  const toggleLock = async (post: ForumPost) => {
    const { error } = await (supabase as any)
      .from('forum_posts')
      .update({ is_locked: !post.is_locked })
      .eq('id', post.id);
    
    if (!error) {
      toast.success(post.is_locked ? 'Unlocked' : 'Locked');
      fetchData();
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm('Delete this post?')) return;
    
    const { error } = await (supabase as any)
      .from('forum_posts')
      .delete()
      .eq('id', postId);
    
    if (!error) {
      toast.success('Post deleted');
      setSelectedPost(null);
      fetchData();
    }
  };

  const incrementViewCount = async (postId: string) => {
    await (supabase as any)
      .from('forum_posts')
      .update({ view_count: (selectedPost?.view_count || 0) + 1 })
      .eq('id', postId);
  };

  const openPost = async (post: ForumPost) => {
    setSelectedPost(post);
    await fetchReplies(post.id);
    incrementViewCount(post.id);
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const isVideo = (url: string) => /\.(mp4|webm|mov|avi)$/i.test(url);

  // Code block component with copy functionality
  const CodeBlock = ({ language, code }: { language: string; code: string }) => {
    const [copied, setCopied] = useState(false);
    
    const copyCode = async () => {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    
    return (
      <div className="my-3 rounded-xl overflow-hidden bg-slate-900 border border-white/10">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-white/10">
          <span className="text-xs font-medium text-gray-400">{language || 'code'}</span>
          <button 
            onClick={copyCode}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors rounded hover:bg-white/10"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy code'}
          </button>
        </div>
        <pre className="p-4 overflow-x-auto text-sm">
          <code className="text-gray-300 font-mono whitespace-pre">{code}</code>
        </pre>
      </div>
    );
  };

  // Render content with code blocks parsed
  const renderContent = (content: string) => {
    // Split by code blocks (```language\ncode```)
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textBefore = content.slice(lastIndex, match.index);
        parts.push(<span key={key++} className="whitespace-pre-wrap">{textBefore}</span>);
      }
      
      // Add code block
      const language = match[1] || 'code';
      const code = match[2].trim();
      parts.push(<CodeBlock key={key++} language={language} code={code} />);
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text after last code block
    if (lastIndex < content.length) {
      parts.push(<span key={key++} className="whitespace-pre-wrap">{content.slice(lastIndex)}</span>);
    }
    
    // If no code blocks found, return plain text
    if (parts.length === 0) {
      return <span className="whitespace-pre-wrap">{content}</span>;
    }
    
    return <>{parts}</>;
  };

  // Insert code block template into textarea
  const insertCodeBlock = (setter: React.Dispatch<React.SetStateAction<string>>, textareaRef?: React.RefObject<HTMLTextAreaElement>) => {
    const template = '\n```lua\n// Your code here\n```\n';
    setter(prev => prev + template);
    toast.success('Code block added! Change "lua" to your language');
  };

  const filteredPosts = selectedCategory 
    ? posts.filter(p => p.category_id === selectedCategory)
    : posts;


  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
      </div>
    );
  }

  // Post Detail View - Premium Style (Clean)
  if (selectedPost) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <button onClick={() => setSelectedPost(null)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" /> Back to discussions
        </button>

        {/* Main Post Card - Premium Style */}
        <div className="p-6 rounded-2xl bg-slate-800/80 border border-white/10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-full border-2 border-white/20 flex items-center justify-center text-white font-bold text-lg overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}aa)` }}
              >
                {selectedPost.author?.avatar_url ? (
                  <img src={selectedPost.author.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  selectedPost.author?.display_name?.[0]?.toUpperCase() || '?'
                )}
              </div>
              <div>
                <p className="font-semibold text-white">@{selectedPost.author?.display_name || 'Anonymous'}</p>
                <p className="text-sm text-gray-400">{formatDate(selectedPost.created_at)}</p>
              </div>
            </div>
            
            {isOwner && (
              <div className="flex items-center gap-2">
                <button onClick={() => togglePin(selectedPost)} className={`p-2 rounded-lg transition-colors ${selectedPost.is_pinned ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-gray-400 hover:text-white'}`}>
                  <Pin className="w-4 h-4" />
                </button>
                <button onClick={() => toggleLock(selectedPost)} className={`p-2 rounded-lg transition-colors ${selectedPost.is_locked ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-gray-400 hover:text-white'}`}>
                  <Lock className="w-4 h-4" />
                </button>
                <button onClick={() => deletePost(selectedPost.id)} className="p-2 rounded-lg bg-white/10 text-gray-400 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {selectedPost.is_pinned && <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-lg flex items-center gap-1"><Pin className="w-3 h-3" /> Pinned</span>}
            {selectedPost.is_locked && <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-lg flex items-center gap-1"><Lock className="w-3 h-3" /> Locked</span>}
            {selectedPost.category && <span className="px-2 py-1 bg-white/10 text-gray-300 text-xs rounded-lg">{selectedPost.category.icon} {selectedPost.category.name}</span>}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-white mb-4">{selectedPost.title}</h1>

          {/* Tagged Product */}
          {selectedPost.tagged_product && (
            <div className="mb-4 p-3 bg-white/5 rounded-xl flex items-center gap-3 border border-white/10">
              <Tag className="w-4 h-4" style={{ color: accentColor }} />
              {selectedPost.tagged_product.thumbnail_url && <img src={selectedPost.tagged_product.thumbnail_url} alt="" className="w-10 h-10 rounded-lg object-cover" />}
              <span style={{ color: accentColor }} className="font-medium">{selectedPost.tagged_product.title}</span>
            </div>
          )}

          {/* Content */}
          <div className="text-gray-300 leading-relaxed mb-4">{renderContent(selectedPost.content)}</div>

          {/* Media */}
          {selectedPost.media_urls && selectedPost.media_urls.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {selectedPost.media_urls.map((url, i) => (
                <div key={i} className="rounded-xl overflow-hidden bg-slate-900/50">
                  {isVideo(url) ? <video src={url} controls className="w-full max-h-80 object-contain" /> : <img src={url} alt="" className="w-full max-h-80 object-contain" />}
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t border-white/10">
            <span>{selectedPost.view_count} views</span>
            <span>•</span>
            <span style={{ color: accentColor }}>{selectedPost.reply_count} replies</span>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">Replies ({replies.length})</h3>

          {replies.map(reply => (
            <div key={reply.id} className="p-5 rounded-2xl bg-slate-800/60 border border-white/10">
              <div className="flex items-start gap-3">
                <div 
                  className="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}aa)` }}
                >
                  {reply.author?.avatar_url ? <img src={reply.author.avatar_url} alt="" className="w-full h-full object-cover" /> : reply.author?.display_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-white">@{reply.author?.display_name || 'Anonymous'}</span>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm text-gray-500">{formatDate(reply.created_at)}</span>
                    {reply.is_solution && <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-lg flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Solution</span>}
                  </div>
                  <div className="text-gray-300">{renderContent(reply.content)}</div>
                  
                  {reply.media_urls && reply.media_urls.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {reply.media_urls.map((url, i) => (
                        <div key={i} className="rounded-lg overflow-hidden bg-slate-900/50">
                          {isVideo(url) ? <video src={url} controls className="w-full max-h-48 object-contain" /> : <img src={url} alt="" className="w-full max-h-48 object-contain" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {!selectedPost.is_locked && user && (
            <div className="p-5 rounded-2xl bg-slate-800/60 border border-white/10">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply... Use ```language for code blocks"
                className="bg-slate-900/50 border-white/10 focus:border-white/30 text-white placeholder-gray-500 min-h-[100px] resize-none mb-3 rounded-xl font-mono"
              />
              
              {replyMediaPreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {replyMediaPreviews.map((url, i) => (
                    <div key={i} className="relative group">
                      {replyMedia[i]?.type.startsWith('video') ? (
                        <div className="w-20 h-20 bg-slate-700 rounded-lg flex items-center justify-center"><Play className="w-6 h-6 text-white" /></div>
                      ) : (
                        <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg" />
                      )}
                      <button onClick={() => removeMedia(i, true)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input ref={replyFileInputRef} type="file" accept="image/*,video/*" multiple onChange={(e) => handleMediaSelect(e, true)} className="hidden" />
                  <button onClick={() => replyFileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10" title="Attach media">
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <button onClick={() => insertCodeBlock(setReplyContent)} className="p-2 text-gray-400 hover:text-teal-400 transition-colors rounded-lg hover:bg-white/10" title="Insert code block">
                    <Code className="w-5 h-5" />
                  </button>
                </div>
                <Button 
                  onClick={createReply} 
                  disabled={submitting || !replyContent.trim()} 
                  className="px-5 py-2 rounded-lg text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span className="ml-2">Reply</span>
                </Button>
              </div>
            </div>
          )}

          {selectedPost.is_locked && <div className="text-center py-8 text-gray-500"><Lock className="w-6 h-6 mx-auto mb-2" />This discussion is locked</div>}
          {!user && <div className="text-center py-8 text-gray-500">Sign in to reply to this discussion</div>}
        </div>
      </div>
    );
  }


  // Main Forum View - Kinetic Style (Clean & Transparent)
  return (
    <div className="min-h-screen" style={getBackgroundStyle()}>
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header - Clean like Kinetic */}
      {showHeader && (
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: textPrimary }}>{forumTitle}</h1>
          <p style={{ color: textSecondary }}>{forumSubtitle}</p>
        </div>
      )}

      {/* Category Pills + New Post - Kinetic Style */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button 
          onClick={() => setSelectedCategory(null)} 
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all`}
          style={!selectedCategory 
            ? { backgroundColor: effectiveAccent, color: textPrimary } 
            : { backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: textSecondary }}
        >
          All Posts
        </button>
        {categories.map(cat => (
          <button 
            key={cat.id} 
            onClick={() => setSelectedCategory(cat.id)} 
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5`}
            style={selectedCategory === cat.id 
              ? { backgroundColor: effectiveAccent, color: textPrimary } 
              : { backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: textSecondary }}
          >
            <span>{cat.icon}</span> {cat.name}
          </button>
        ))}
        
        {/* New Post button inline with categories */}
        {user && (
          <Button 
            onClick={() => setShowNewPost(true)} 
            className="px-4 py-2 rounded-full text-sm font-medium ml-auto"
            style={{ backgroundColor: effectiveAccent, color: textPrimary }}
          >
            <Plus className="w-4 h-4 mr-1.5" /> New Post
          </Button>
        )}
      </div>

      {/* Owner: Add Category button */}
      {isOwner && (
        <div className="flex justify-end mb-4">
          <Button 
            onClick={() => setShowNewCategory(true)} 
            variant="ghost" 
            className="text-gray-400 hover:text-white text-sm"
          >
            <Settings className="w-4 h-4 mr-1.5" /> Manage Categories
          </Button>
        </div>
      )}

      {/* New Post Modal */}
      {showNewPost && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Create New Post</h2>
                <button onClick={() => setShowNewPost(false)} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {categories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Category (optional)</label>
                  <select value={newPostCategory} onChange={(e) => setNewPostCategory(e.target.value)} className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:border-teal-400 focus:outline-none">
                    <option value="">Select a category...</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                <Input value={newPostTitle} onChange={(e) => setNewPostTitle(e.target.value)} placeholder="What's your post about?" className="bg-slate-900/50 border-slate-600 focus:border-teal-400 text-white placeholder-gray-500" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">Content *</label>
                  <button
                    type="button"
                    onClick={() => insertCodeBlock(setNewPostContent)}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-teal-400 transition-colors rounded hover:bg-white/10"
                    title="Insert code block"
                  >
                    <Code className="w-3.5 h-3.5" />
                    Add Code
                  </button>
                </div>
                <Textarea value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} placeholder="Share your thoughts, questions, or ideas... Use ```language to add code blocks" className="bg-slate-900/50 border-teal-500/30 focus:border-teal-400 text-white placeholder-gray-500 min-h-[150px] resize-none font-mono" />
                <p className="text-xs text-gray-500 mt-1">Tip: Use ```lua or ```python etc. for code blocks with syntax highlighting</p>
              </div>

              {products.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tag a Product (optional)</label>
                  <div className="relative">
                    <button onClick={() => setShowProductPicker(!showProductPicker)} className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-left text-white hover:border-teal-400 transition-colors flex items-center gap-2">
                      <Tag className="w-4 h-4 text-teal-400" />
                      {taggedProductId ? products.find(p => p.id === taggedProductId)?.title : 'Select a product...'}
                    </button>
                    
                    {showProductPicker && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-xl z-10 max-h-60 overflow-y-auto">
                        <button onClick={() => { setTaggedProductId(''); setShowProductPicker(false); }} className="w-full px-4 py-3 text-left text-gray-400 hover:bg-slate-700 transition-colors">No product</button>
                        {products.map(prod => (
                          <button key={prod.id} onClick={() => { setTaggedProductId(prod.id); setShowProductPicker(false); }} className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 transition-colors flex items-center gap-3">
                            {prod.thumbnail_url && <img src={prod.thumbnail_url} alt="" className="w-8 h-8 rounded object-cover" />}
                            {prod.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Attach Images or Videos (optional, max 500MB each)</label>
                <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={(e) => handleMediaSelect(e)} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-slate-600 rounded-xl p-6 text-center hover:border-teal-400 transition-colors group">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-500 group-hover:text-teal-400" />
                  <p className="text-gray-400 group-hover:text-gray-300">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF, MP4, WEBM up to 500MB</p>
                </button>

                {newPostMediaPreviews.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-4">
                    {newPostMediaPreviews.map((url, i) => (
                      <div key={i} className="relative group">
                        {newPostMedia[i]?.type.startsWith('video') ? (
                          <div className="w-24 h-24 bg-slate-700 rounded-xl flex items-center justify-center"><Play className="w-8 h-8 text-white" /></div>
                        ) : (
                          <img src={url} alt="" className="w-24 h-24 object-cover rounded-xl" />
                        )}
                        <button onClick={() => removeMedia(i)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowNewPost(false)} className="border-slate-600 text-gray-300 hover:bg-slate-700">Cancel</Button>
              <Button 
                onClick={createPost} 
                disabled={submitting || !newPostTitle.trim() || !newPostContent.trim()} 
                className="text-white"
                style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)` }}
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />{uploadingMedia ? 'Uploading...' : 'Posting...'}</> : 'Post'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Category Modal */}
      {showNewCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Create Category</h2>
                <button onClick={() => setShowNewCategory(false)} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Category Name</label>
                <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="e.g., General Discussion" className="bg-slate-900/50 border-slate-600 focus:border-teal-400 text-white" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {categoryIcons.map(icon => (
                    <button key={icon} onClick={() => setNewCategoryIcon(icon)} className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${newCategoryIcon === icon ? 'bg-teal-500/20 border-2 border-teal-400' : 'bg-slate-700 hover:bg-slate-600'}`}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowNewCategory(false)} className="border-slate-600 text-gray-300 hover:bg-slate-700">Cancel</Button>
              <Button 
                onClick={createCategory} 
                disabled={submitting || !newCategoryName.trim()} 
                className="text-white"
                style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)` }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Posts list - Kinetic Style (transparent glass cards) */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-20">
          <MessageCircle className="w-16 h-16 mx-auto mb-4" style={{ color: textSecondary }} />
          <h3 className="text-2xl font-bold mb-2" style={{ color: textPrimary }}>No discussions yet</h3>
          <p className="mb-8" style={{ color: textSecondary }}>Be the first to start a conversation!</p>
          {user && (
            <Button 
              onClick={() => setShowNewPost(true)} 
              className="px-6 py-3 rounded-lg font-semibold"
              style={{ background: `linear-gradient(to right, ${effectiveAccent}, ${effectiveAccent}cc)`, color: textPrimary }}
            >
              <Plus className="w-4 h-4 mr-2" /> Start a Discussion
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map(post => (
            <div 
              key={post.id} 
              onClick={() => openPost(post)} 
              className="p-5 backdrop-blur-sm cursor-pointer transition-all hover:bg-white/[0.08] group"
              style={getCardStyle()}
            >
              <div className="flex items-start gap-4">
                {/* Avatar - Transparent style */}
                <div 
                  className="w-11 h-11 rounded-full flex items-center justify-center font-semibold text-base overflow-hidden flex-shrink-0"
                  style={{ 
                    background: post.author?.avatar_url ? 'transparent' : `linear-gradient(135deg, ${effectiveAccent}80, ${effectiveAccent}40)`,
                    border: '2px solid rgba(255, 255, 255, 0.15)',
                    color: textPrimary
                  }}
                >
                  {post.author?.avatar_url ? (
                    <img src={post.author.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    post.author?.display_name?.[0]?.toUpperCase() || '?'
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <h3 className="text-lg font-semibold mb-1 group-hover:opacity-90" style={{ color: textPrimary }}>
                    {post.title}
                  </h3>
                  
                  {/* Content preview */}
                  <p className="text-sm line-clamp-2 mb-3" style={{ color: textSecondary }}>{post.content}</p>

                  {/* Media preview if exists */}
                  {post.media_urls && post.media_urls.length > 0 && (
                    <div className="mb-3 rounded-lg overflow-hidden max-w-md">
                      {isVideo(post.media_urls[0]) ? (
                        <div className="w-full h-32 bg-slate-900/50 flex items-center justify-center">
                          <Play className="w-8 h-8 text-white/50" />
                        </div>
                      ) : (
                        <img src={post.media_urls[0]} alt="" className="w-full h-32 object-cover" />
                      )}
                    </div>
                  )}

                  {/* Category badge */}
                  {post.category && (
                    <div className="mb-3">
                      <span 
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          color: 'rgba(255, 255, 255, 0.7)',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        {post.category.icon} {post.category.name}
                      </span>
                    </div>
                  )}

                  {/* Meta info - Kinetic style with dots and icons */}
                  <div className="flex items-center gap-2 text-xs" style={{ color: textSecondary }}>
                    <span>@{post.author?.display_name || 'Anonymous'}</span>
                    <span>•</span>
                    <span>{formatDate(post.created_at)}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {post.reply_count}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1" style={{ color: effectiveAccent }}>
                      <Eye className="w-3 h-3" />
                      {post.view_count}
                    </span>
                  </div>
                </div>

                {/* Pinned/Locked indicators on right */}
                {(post.is_pinned || post.is_locked) && (
                  <div className="flex flex-col gap-1">
                    {post.is_pinned && <Pin className="w-4 h-4 text-amber-400" />}
                    {post.is_locked && <Lock className="w-4 h-4 text-red-400" />}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!user && (
        <div className="text-center py-8 rounded-xl" style={{ ...getCardStyle(), backgroundColor: 'rgba(30, 41, 59, 0.3)' }}>
          <p style={{ color: textSecondary }}>Sign in to join the discussion</p>
        </div>
      )}
    </div>
    </div>
  );
};
