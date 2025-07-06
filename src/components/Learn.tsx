import React, { useState, useEffect } from 'react';
import { BookOpen, Heart, Star, Search, X } from 'lucide-react';
import { getBookSummaries, getUserBookStatus, upsertUserBookStatus } from '../lib/saveData';
import type { BookSummary, UserBookStatus } from '../types';

interface LearnProps {
  userId: string;
}

export default function Learn({ userId }: LearnProps) {
  const [bookSummaries, setBookSummaries] = useState<BookSummary[]>([]);
  const [userBookStatus, setUserBookStatus] = useState<UserBookStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<BookSummary | null>(null);

  useEffect(() => {
    loadData();
  }, [userId]);

  useEffect(() => {
    if (selectedBook) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [selectedBook]);

  const loadData = async () => {
    try {
      const [summaries, userStatus] = await Promise.all([
        getBookSummaries(),
        getUserBookStatus(userId),
      ]);
      setBookSummaries(summaries);
      setUserBookStatus(userStatus);
    } catch (error) {
      console.error('Error loading learn data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavourite = async (bookId: string) => {
    try {
      const existingStatus = userBookStatus.find(status => status.book_summary_id === bookId);
      const newFavouriteStatus = !existingStatus?.is_favourite;

      await upsertUserBookStatus({
        user_id: userId,
        book_summary_id: bookId,
        is_favourite: newFavouriteStatus,
        read_at: new Date().toISOString().split('T')[0],
      });

      setUserBookStatus(prev => {
        const filtered = prev.filter(status => status.book_summary_id !== bookId);
        return [...filtered, {
          id: existingStatus?.id || `temp-${Date.now()}`,
          user_id: userId,
          book_summary_id: bookId,
          is_favourite: newFavouriteStatus,
          read_at: new Date().toISOString().split('T')[0],
        }];
      });
    } catch (error) {
      console.error('Error toggling favourite:', error);
    }
  };

  const filteredBooks = bookSummaries.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || book.category === selectedCategory;
    const isRead = userBookStatus.find(status => status.book_summary_id === book.id && status.read_at);
    return matchesSearch && matchesCategory && !isRead;
  });

  const categories = ['all', ...new Set(bookSummaries.map(book => book.category).filter(Boolean))];

  const isBookFavourited = (bookId: string) => {
    return userBookStatus.find(status => status.book_summary_id === bookId)?.is_favourite || false;
  };

  const handleBookClick = (book: BookSummary) => {
    setSelectedBook(book);
  };

  const closeBookModal = () => {
    setSelectedBook(null);
  };

  const readSummaries = bookSummaries
    .filter(book => userBookStatus.find(status => status.book_summary_id === book.id && status.read_at))
    .sort((a, b) => {
      const aFav = isBookFavourited(a.id) ? 1 : 0;
      const bFav = isBookFavourited(b.id) ? 1 : 0;
      return bFav - aFav;
    });

  const isBookRead = (bookId: string) => {
    return !!userBookStatus.find(status => status.book_summary_id === bookId && status.read_at);
  };

  const handleMarkAsRead = async (bookId: string) => {
    try {
      const existingStatus = userBookStatus.find(status => status.book_summary_id === bookId);
      await upsertUserBookStatus({
        user_id: userId,
        book_summary_id: bookId,
        is_favourite: existingStatus?.is_favourite || false,
        read_at: new Date().toISOString().split('T')[0],
      });
      setUserBookStatus(prev => {
        const filtered = prev.filter(status => status.book_summary_id !== bookId);
        return [...filtered, {
          id: existingStatus?.id || `temp-${Date.now()}`,
          user_id: userId,
          book_summary_id: bookId,
          is_favourite: existingStatus?.is_favourite || false,
          read_at: new Date().toISOString().split('T')[0],
        }];
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="mobile-text-3xl font-bold text-primary mb-2">Learn</h1>
        <p className="text-secondary">Discover wisdom through curated book summaries</p>
      </div>

      {/* Search and Filters */}
      <div className="opal-card p-6">
        <div className="flex flex-col space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-secondary" size={20} />
            <input
              type="text"
              placeholder="Search books..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="opal-input w-full pl-12"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="opal-input"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Books Grid */}
      {filteredBooks.length > 0 ? (
        <div className="grid gap-4">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              onClick={() => handleBookClick(book)}
              className="opal-card p-6 hover:bg-white/10 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="mobile-text-lg font-bold text-primary mb-2 line-clamp-2">
                    {book.title}
                  </h3>
                  {book.category && (
                    <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm font-medium rounded-full">
                      {book.category}
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavourite(book.id);
                  }}
                  className={`p-2 rounded-xl transition-colors ml-3 ${isBookFavourited(book.id)
                    ? 'bg-red-500/20 text-red-400'
                    : 'opal-button-secondary hover:text-red-400'
                    }`}
                >
                  <Heart size={20} fill={isBookFavourited(book.id) ? 'currentColor' : 'none'} />
                </button>
              </div>

              <p className="text-secondary text-sm leading-relaxed line-clamp-3">
                {book.summary}
              </p>

              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="text-secondary" size={16} />
                    <span className="text-sm text-secondary">
                      Book Summary
                    </span>
                  </div>

                  {isBookFavourited(book.id) && (
                    <div className="flex items-center space-x-1">
                      <Star className="text-yellow-400" size={16} fill="currentColor" />
                      <span className="text-sm text-yellow-400">
                        Favourited
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <BookOpen className="mx-auto text-secondary mb-4" size={64} />
          <h3 className="mobile-text-xl font-semibold text-primary mb-2">
            No books found
          </h3>
          <p className="text-secondary">
            {searchTerm || selectedCategory !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Book summaries will appear here'
            }
          </p>
        </div>
      )}

      {/* Read Summaries Section */}
      {readSummaries.length > 0 && (
        <div className="opal-card p-6">
          <h2 className="mobile-text-xl font-bold text-primary mb-4">Your Read Summaries</h2>
          <div className="grid gap-3">
            {readSummaries.map((book) => (
              <div
                key={book.id}
                onClick={() => handleBookClick(book)}
                className="opal-card-dark p-4 hover:bg-white/10 transition-all cursor-pointer rounded-2xl"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-primary line-clamp-1">{book.title}</h3>
                  {isBookFavourited(book.id) && (
                    <Star className="text-yellow-400 ml-2" size={16} fill="currentColor" />
                  )}
                </div>
                <div className="text-xs text-secondary mb-1">
                  {book.category}
                </div>
                <div className="text-sm text-secondary line-clamp-2">
                  {book.summary.substring(0, 100)}...
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Book Detail Modal */}
      {selectedBook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center modal-overlay"
          aria-modal="true"
          role="dialog"
          onClick={closeBookModal}
        >
          <div
            className="modal-content w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto p-6 custom-scrollbar"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1 min-w-0">
                <h2 className="mobile-text-xl md:text-2xl font-bold text-primary mb-3 break-words">
                  {selectedBook.title}
                </h2>
                {selectedBook.category && (
                  <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm font-medium rounded-full">
                    {selectedBook.category}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 ml-3">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleToggleFavourite(selectedBook.id);
                  }}
                  className={`p-2 rounded-xl transition-colors ${isBookFavourited(selectedBook.id)
                    ? 'bg-red-500/20 text-red-400'
                    : 'opal-button-secondary hover:text-red-400'
                    }`}
                >
                  <Heart size={20} fill={isBookFavourited(selectedBook.id) ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={closeBookModal}
                  className="opal-button-secondary p-2"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="prose prose-invert max-w-none mb-6" style={{ whiteSpace: 'pre-line' }}>
              <p className="text-secondary leading-relaxed">
                {selectedBook.summary}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleMarkAsRead(selectedBook.id)}
                disabled={isBookRead(selectedBook.id)}
                className={`opal-button flex items-center px-4 py-2 ${isBookRead(selectedBook.id)
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
                  }`}
              >
                {isBookRead(selectedBook.id) ? (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Read
                  </>
                ) : (
                  'Mark as Read'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}