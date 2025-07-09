import React, { useState, useEffect, useRef } from 'react';
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
      <div className="min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-700 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 loading-spinner mx-auto mb-4"></div>
          <p className="text-white/80 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-700 flex flex-col items-center px-6 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-6 animate-float">📚</div>
        <h1 className="text-3xl font-bold text-white mb-3" style={{ letterSpacing: '-0.03em' }}>
          Learn & Grow
        </h1>
        <p className="text-white/80 text-lg max-w-sm mx-auto">
          Discover wisdom from great books
        </p>
      </div>

      {/* Search and Filters */}
      <div className="w-full max-w-sm mb-8 space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search books..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-4 px-6 pr-12 bg-emerald-900/60 text-white placeholder-emerald-300 rounded-2xl border border-emerald-700 focus:outline-none focus:border-emerald-400 transition"
          />
          <Search size={20} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-emerald-300" />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full py-4 px-6 bg-emerald-900/60 text-white rounded-2xl border border-emerald-700 focus:outline-none focus:border-emerald-400 transition appearance-none"
        >
          {categories.map(category => (
            <option key={category} value={category} className="bg-emerald-800">
              {category === 'all' ? 'All Categories' : category}
            </option>
          ))}
        </select>
      </div>

      {/* Books Grid */}
      <div className="w-full max-w-sm space-y-4 mb-8">
        {filteredBooks.length > 0 ? (
          filteredBooks.slice(0, 10).map((book) => (
            <div
              key={book.id}
              onClick={() => handleBookClick(book)}
              className="bg-emerald-900/60 p-4 rounded-2xl border border-emerald-700 hover:bg-emerald-800/60 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
                    {book.title}
                  </h3>
                  {book.category && (
                    <span className="inline-block px-3 py-1 bg-emerald-400/20 text-emerald-300 text-xs font-medium rounded-full">
                      {book.category}
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavourite(book.id);
                  }}
                  className={`p-2 rounded-xl transition-colors ${
                    isBookFavourited(book.id)
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-emerald-800/60 text-emerald-300 hover:text-red-400'
                  }`}
                >
                  <Heart size={16} fill={isBookFavourited(book.id) ? 'currentColor' : 'none'} />
                </button>
              </div>

              <p className="text-emerald-200 text-sm leading-relaxed line-clamp-3">
                {book.summary}
              </p>

              {isBookFavourited(book.id) && (
                <div className="flex items-center space-x-1 mt-3">
                  <Star className="text-yellow-400" size={14} fill="currentColor" />
                  <span className="text-xs text-yellow-400">Favourited</span>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-white mb-2">No books found</h3>
            <p className="text-white/70">
              {searchTerm || selectedCategory !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Book summaries will appear here'
              }
            </p>
          </div>
        )}
      </div>

      {/* Read Summaries */}
      {readSummaries.length > 0 && (
        <div className="w-full max-w-sm">
          <h3 className="text-xl font-bold text-white mb-4 text-center">
            Your Read Summaries
          </h3>
          <div className="space-y-3">
            {readSummaries.slice(0, 5).map((book) => (
              <div
                key={book.id}
                onClick={() => handleBookClick(book)}
                className="bg-emerald-400/20 p-3 rounded-2xl border border-emerald-400/30 hover:bg-emerald-400/30 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-emerald-200 line-clamp-1">{book.title}</h4>
                  {isBookFavourited(book.id) && (
                    <Star className="text-yellow-400 ml-2 flex-shrink-0" size={14} fill="currentColor" />
                  )}
                </div>
                <div className="text-xs text-emerald-300 mb-1">{book.category}</div>
                <div className="text-sm text-emerald-200 line-clamp-2">
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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={closeBookModal}
        >
          <div
            className="bg-emerald-900/90 backdrop-blur-sm border border-emerald-700 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-3 break-words">
                  {selectedBook.title}
                </h2>
                {selectedBook.category && (
                  <span className="inline-block px-3 py-1 bg-emerald-400/20 text-emerald-300 text-sm font-medium rounded-full">
                    {selectedBook.category}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleToggleFavourite(selectedBook.id);
                  }}
                  className={`p-2 rounded-xl transition-colors ${
                    isBookFavourited(selectedBook.id)
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-emerald-800/60 text-emerald-300 hover:text-red-400'
                  }`}
                >
                  <Heart size={18} fill={isBookFavourited(selectedBook.id) ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={closeBookModal}
                  className="p-2 bg-emerald-800/60 text-emerald-300 rounded-xl hover:bg-emerald-700/60 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="mb-6" style={{ whiteSpace: 'pre-line' }}>
              <p className="text-emerald-200 leading-relaxed">
                {selectedBook.summary}
              </p>
            </div>

            <button
              onClick={() => handleMarkAsRead(selectedBook.id)}
              disabled={isBookRead(selectedBook.id)}
              className={`w-full py-4 px-6 font-bold text-lg rounded-2xl shadow-lg transition flex items-center justify-center space-x-2 ${
                isBookRead(selectedBook.id)
                  ? 'bg-emerald-400/50 text-emerald-800 cursor-not-allowed'
                  : 'bg-emerald-400 text-emerald-900 active:bg-emerald-300'
              }`}
            >
              {isBookRead(selectedBook.id) ? (
                <>
                  <Check size={20} />
                  <span>Read</span>
                </>
              ) : (
                <span>Mark as Read</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Motivational Footer */}
      <div className="mt-12 text-center">
        <p className="text-white/60 text-sm">
          Knowledge is the key to endless possibilities.
        </p>
      </div>
    </div>
  );
}