import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  Star, MessageSquare, Edit2, Trash2, Loader2, 
  ThumbsUp, Reply, User, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title?: string;
  content?: string;
  owner_response?: string;
  owner_response_at?: string;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  author?: {
    display_name?: string;
    avatar_url?: string;
  };
}

interface ProductReviewsProps {
  productId: string;
  creatorId: string;
  accentColor?: string;
}

export const ProductReviews = ({ productId, creatorId, accentColor = '#7c3aed' }: ProductReviewsProps) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [userReview, setUserReview] = useState<Review | null>(null);
  
  // Form state
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Owner response state
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');

  const isOwner = user?.id === creatorId;

  useEffect(() => {
    fetchReviews();
    if (user) checkPurchase();
  }, [productId, user]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Fetch author profiles
        const userIds = [...new Set(data.map((r: any) => r.user_id))];
        const { data: profiles } = await (supabase as any)
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);
        
        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        
        const enrichedReviews = data.map((r: any) => ({
          ...r,
          author: profileMap.get(r.user_id) || { display_name: 'Anonymous' }
        }));
        
        setReviews(enrichedReviews);
        
        // Check if user has already reviewed
        if (user) {
          const existing = enrichedReviews.find((r: Review) => r.user_id === user.id);
          setUserReview(existing || null);
        }
      } else {
        setReviews([]);
      }
    } catch (e) {
      console.error('Error fetching reviews:', e);
    }
    setLoading(false);
  };

  const checkPurchase = async () => {
    if (!user) return;
    try {
      const { data } = await (supabase as any)
        .from('sales')
        .select('id')
        .eq('product_id', productId)
        .eq('buyer_id', user.id)
        .limit(1);
      setHasPurchased(data && data.length > 0);
    } catch (e) {
      console.error('Error checking purchase:', e);
    }
  };

  const resetForm = () => {
    setRating(5);
    setTitle('');
    setContent('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please sign in to leave a review');
      return;
    }
    if (!hasPurchased) {
      toast.error('You must purchase this product to leave a review');
      return;
    }
    
    setSubmitting(true);
    try {
      if (editingId) {
        await (supabase as any)
          .from('product_reviews')
          .update({
            rating,
            title: title.trim() || null,
            content: content.trim() || null
          })
          .eq('id', editingId);
        toast.success('Review updated!');
      } else {
        await (supabase as any)
          .from('product_reviews')
          .insert({
            product_id: productId,
            user_id: user.id,
            rating,
            title: title.trim() || null,
            content: content.trim() || null
          });
        toast.success('Review submitted!');
      }
      resetForm();
      fetchReviews();
    } catch (e: any) {
      if (e.code === '23505') {
        toast.error('You have already reviewed this product');
      } else {
        toast.error('Failed to submit review');
      }
    }
    setSubmitting(false);
  };

  const handleEdit = (review: Review) => {
    setEditingId(review.id);
    setRating(review.rating);
    setTitle(review.title || '');
    setContent(review.content || '');
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete your review?')) return;
    try {
      await (supabase as any).from('product_reviews').delete().eq('id', id);
      toast.success('Review deleted');
      setUserReview(null);
      fetchReviews();
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const submitOwnerResponse = async (reviewId: string) => {
    if (!responseText.trim()) return;
    try {
      await (supabase as any)
        .from('product_reviews')
        .update({
          owner_response: responseText.trim(),
          owner_response_at: new Date().toISOString()
        })
        .eq('id', reviewId);
      toast.success('Response added!');
      setRespondingTo(null);
      setResponseText('');
      fetchReviews();
    } catch (e) {
      toast.error('Failed to add response');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate average rating
  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : 0;

  // Rating distribution
  const ratingDist = [5, 4, 3, 2, 1].map(r => ({
    rating: r,
    count: reviews.filter(rev => rev.rating === r).length,
    percent: reviews.length > 0 ? (reviews.filter(rev => rev.rating === r).length / reviews.length) * 100 : 0
  }));

  const StarRating = ({ value, onChange, readonly = false, size = 'md' }: { 
    value: number; 
    onChange?: (v: number) => void; 
    readonly?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }) => {
    const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !readonly && setHoverRating(star)}
            onMouseLeave={() => !readonly && setHoverRating(0)}
            className={readonly ? 'cursor-default' : 'cursor-pointer transition-transform hover:scale-110'}
          >
            <Star
              className={sizeClass}
              fill={(hoverRating || value) >= star ? '#fbbf24' : 'transparent'}
              stroke={(hoverRating || value) >= star ? '#fbbf24' : '#6b7280'}
            />
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: accentColor }} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Summary */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Average Rating */}
        <div 
          className="p-6 rounded-2xl border text-center md:w-64"
          style={{ 
            backgroundColor: 'rgba(30, 41, 59, 0.4)',
            borderColor: 'rgba(255, 255, 255, 0.1)'
          }}
        >
          <div className="text-5xl font-bold text-white mb-2">
            {averageRating.toFixed(1)}
          </div>
          <StarRating value={Math.round(averageRating)} readonly size="lg" />
          <p className="text-gray-400 mt-2">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Rating Distribution */}
        <div className="flex-1 space-y-2">
          {ratingDist.map(({ rating: r, count, percent }) => (
            <div key={r} className="flex items-center gap-3">
              <span className="text-sm text-gray-400 w-8">{r} ★</span>
              <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ width: `${percent}%`, backgroundColor: accentColor }}
                />
              </div>
              <span className="text-sm text-gray-500 w-8">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Write Review Button */}
      {user && hasPurchased && !userReview && !showForm && (
        <Button
          onClick={() => setShowForm(true)}
          className="rounded-full"
          style={{ backgroundColor: accentColor }}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Write a Review
        </Button>
      )}

      {/* Not purchased message */}
      {user && !hasPurchased && !isOwner && (
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
          Purchase this product to leave a review
        </div>
      )}

      {/* Review Form */}
      {showForm && (
        <div 
          className="p-6 rounded-2xl border"
          style={{ 
            backgroundColor: 'rgba(30, 41, 59, 0.6)',
            borderColor: accentColor + '30'
          }}
        >
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingId ? 'Edit Your Review' : 'Write a Review'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Rating</label>
              <StarRating value={rating} onChange={setRating} size="lg" />
            </div>
            
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Title (optional)</label>
              <Input
                placeholder="Summarize your experience"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="bg-black/30 border-gray-700 text-white"
              />
            </div>
            
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Review</label>
              <Textarea
                placeholder="Share your thoughts about this product..."
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={4}
                className="bg-black/30 border-gray-700 text-white"
              />
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={resetForm} className="text-gray-400">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                style={{ backgroundColor: accentColor }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingId ? 'Update' : 'Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div 
            className="text-center py-12 rounded-2xl border"
            style={{ 
              backgroundColor: 'rgba(30, 41, 59, 0.3)',
              borderColor: 'rgba(255, 255, 255, 0.1)'
            }}
          >
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            <p className="text-gray-400">No reviews yet</p>
            <p className="text-sm text-gray-500 mt-1">Be the first to review this product</p>
          </div>
        ) : (
          reviews.map(review => (
            <div
              key={review.id}
              className="p-5 rounded-2xl border"
              style={{ 
                backgroundColor: 'rgba(30, 41, 59, 0.4)',
                borderColor: review.user_id === user?.id ? accentColor + '50' : 'rgba(255, 255, 255, 0.1)'
              }}
            >
              {/* Review Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                    {review.author?.avatar_url ? (
                      <img src={review.author.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">
                        {review.author?.display_name || 'Anonymous'}
                      </span>
                      {review.user_id === user?.id && (
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">You</span>
                      )}
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StarRating value={review.rating} readonly size="sm" />
                      <span className="text-xs text-gray-500">{formatDate(review.created_at)}</span>
                    </div>
                  </div>
                </div>
                
                {review.user_id === user?.id && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(review)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(review.id)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                )}
              </div>
              
              {/* Review Content */}
              {review.title && (
                <h4 className="font-semibold text-white mb-2">{review.title}</h4>
              )}
              {review.content && (
                <p className="text-gray-300 text-sm">{review.content}</p>
              )}
              
              {/* Owner Response */}
              {review.owner_response && (
                <div 
                  className="mt-4 p-4 rounded-xl border-l-2"
                  style={{ 
                    backgroundColor: 'rgba(124, 58, 237, 0.1)',
                    borderColor: accentColor
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Reply className="w-4 h-4" style={{ color: accentColor }} />
                    <span className="text-sm font-medium" style={{ color: accentColor }}>Seller Response</span>
                  </div>
                  <p className="text-gray-300 text-sm">{review.owner_response}</p>
                </div>
              )}
              
              {/* Owner Response Form */}
              {isOwner && !review.owner_response && (
                respondingTo === review.id ? (
                  <div className="mt-4 space-y-2">
                    <Textarea
                      placeholder="Write your response..."
                      value={responseText}
                      onChange={e => setResponseText(e.target.value)}
                      rows={3}
                      className="bg-black/30 border-gray-700 text-white text-sm"
                    />
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => { setRespondingTo(null); setResponseText(''); }}
                        className="text-gray-400"
                      >
                        Cancel
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => submitOwnerResponse(review.id)}
                        disabled={!responseText.trim()}
                        style={{ backgroundColor: accentColor }}
                      >
                        Reply
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setRespondingTo(review.id)}
                    className="mt-3 text-sm flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                  >
                    <Reply className="w-4 h-4" />
                    Respond
                  </button>
                )
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProductReviews;
