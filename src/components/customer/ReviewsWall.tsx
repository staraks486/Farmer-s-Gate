import React, { useState } from 'react';
import { Star, MessageSquare, Check, Sparkles } from 'lucide-react';
import { CommunityReview, initialReviews } from './customerData';

interface ReviewsWallProps {
  socialReviews: CommunityReview[];
  onAddReview: (review: CommunityReview) => void;
  canWriteReview: boolean;
}

export default function ReviewsWall({ socialReviews, onAddReview, canWriteReview }: ReviewsWallProps) {
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const availableReviewTags = [
    '🥬 Super Fresh',
    '🏍️ Lightning Fast',
    '💸 Great Price',
    '🧼 Cleanly Packed',
    '👑 Best Service',
    '🤝 Polite Courier'
  ];

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim()) return;

    const newReview: CommunityReview = {
      id: `rev-${Date.now()}`,
      author: 'You (Verified Customer)',
      rating,
      text: reviewText.trim(),
      tags: selectedTags,
      date: 'Just now'
    };

    onAddReview(newReview);
    setReviewText('');
    setSelectedTags([]);
    setSuccessMsg('🎉 Thank you for rating! Your review is posted live to the Community Wall.');
    setTimeout(() => {
      setSuccessMsg('');
      setIsFormOpen(false);
    }, 3500);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-sm text-left space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-extrabold text-sm text-slate-950 uppercase tracking-tight flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4 text-emerald-600" /> Community Trust Review Wall
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Real-time ratings and packaging feedback from nearby shoppers.</p>
        </div>

        {canWriteReview && !isFormOpen && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="self-start sm:self-auto bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-black px-4 py-2 rounded-xl transition-all uppercase tracking-wider cursor-pointer"
          >
            ✍️ Leave a Review
          </button>
        )}
      </div>

      {/* Review Posting Form */}
      {isFormOpen && (
        <form onSubmit={handleSubmitReview} className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-4 animate-scale-in">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Write Fresh Crop Review</span>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-xs font-extrabold text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          {successMsg ? (
            <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl text-xs font-bold border border-emerald-200 flex items-center gap-2 animate-fade-in">
              <Sparkles className="h-4.5 w-4.5 shrink-0 text-emerald-600 animate-pulse" />
              {successMsg}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Star Rating Select */}
              <div className="space-y-1">
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Freshness Grade Rating</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-0.5 focus:outline-none transition-transform active:scale-125 cursor-pointer"
                    >
                      <Star className={`h-6 w-6 ${
                        star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                      }`} />
                    </button>
                  ))}
                  <span className="text-xs font-black text-slate-700 ml-1.5 font-mono">
                    {rating === 5 ? 'Excellent 🌟' : rating === 4 ? 'Very Good 👍' : rating === 3 ? 'Good 🙂' : 'Needs Care ⚠️'}
                  </span>
                </div>
              </div>

              {/* Tag Selector */}
              <div className="space-y-1">
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Select Feedback Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {availableReviewTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleToggleTag(tag)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white font-extrabold'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Text Area */}
              <div className="space-y-1">
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Review Comments</label>
                <textarea
                  required
                  placeholder="Tell others about the grading size, crispness, leaf texture, or rider speed..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={2.5}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-emerald-100"
              >
                Post Review to Wall
              </button>
            </div>
          )}
        </form>
      )}

      {/* Feed Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {socialReviews.map((rev) => (
          <div 
            key={rev.id} 
            className="bg-slate-50 border border-slate-200/50 p-4 rounded-2xl flex flex-col justify-between space-y-3 shadow-3xs transition-transform hover:scale-[1.01]"
          >
            <div className="space-y-2">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 leading-none">{rev.author}</h4>
                  <span className="text-[8.5px] text-slate-400 font-medium block mt-1">{rev.date} • Verified Buyer</span>
                </div>
                {/* Stars */}
                <div className="flex items-center gap-0.5 bg-white border border-slate-200 px-1.5 py-0.5 rounded-lg text-amber-500 text-[10px] font-black font-mono shadow-3xs">
                  ★ {rev.rating}
                </div>
              </div>

              {/* Text */}
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium italic">
                "{rev.text}"
              </p>
            </div>

            {/* Tags display */}
            {rev.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-100">
                {rev.tags.map((tag) => (
                  <span 
                    key={tag} 
                    className="bg-white border border-slate-200 text-slate-500 font-extrabold text-[9px] px-1.5 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}
