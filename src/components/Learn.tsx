import React, { useState, useEffect } from 'react';
import { BookOpen, Heart, Star, Search } from 'lucide-react';
import { getBookSummaries, getUserBookStatus, upsertUserBookStatus } from '../lib/saveData';
import type { BookSummary, UserBookStatus } from '../types';
import '../index.css'; // Ensure global styles are loaded

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
    return matchesSearch && matchesCategory;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Learn</h1>
        <p className="text-slate-600 dark:text-slate-400">Discover wisdom through curated book summaries</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search books..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-900 dark:text-white"
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              onClick={() => handleBookClick(book)}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    {book.title}
                  </h3>
                  {book.category && (
                    <span className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm font-medium rounded-full">
                      {book.category}
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavourite(book.id);
                  }}
                  className={`p-2 rounded-lg transition-colors ${isBookFavourited(book.id)
                    ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-red-500'
                    }`}
                >
                  <Heart size={20} fill={isBookFavourited(book.id) ? 'currentColor' : 'none'} />
                </button>
              </div>

              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                {book.summary.length > 200
                  ? `${book.summary.substring(0, 200)}...`
                  : book.summary
                }
              </p>

              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="text-slate-400" size={16} />
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Book Summary
                    </span>
                  </div>

                  {isBookFavourited(book.id) && (
                    <div className="flex items-center space-x-1">
                      <Star className="text-yellow-500" size={16} fill="currentColor" />
                      <span className="text-sm text-yellow-600 dark:text-yellow-400">
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
          <BookOpen className="mx-auto text-slate-400 dark:text-slate-500 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            No books found
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            {searchTerm || selectedCategory !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Book summaries will appear here'
            }
          </p>
        </div>
      )}

      {/* Book Detail Modal */}
      {selectedBook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          aria-modal="true"
          role="dialog"
          onClick={closeBookModal}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-6 relative z-50 custom-scrollbar"
            style={{ boxShadow: '0 8px 32px 0 rgba(0,0,0,0.18)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 break-words">
                  {selectedBook.title}
                </h2>
                {selectedBook.category && (
                  <span className="inline-block mt-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm font-medium rounded-full">
                    {selectedBook.category}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 ml-2">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleToggleFavourite(selectedBook.id);
                  }}
                  className={`p-2 rounded-lg transition-colors ${isBookFavourited(selectedBook.id)
                    ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-red-500'
                    }`}
                >
                  <Heart size={20} fill={isBookFavourited(selectedBook.id) ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={closeBookModal}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  aria-label="Close"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>
            </div>
            <div className="prose prose-slate dark:prose-invert max-w-none mb-4" style={{ whiteSpace: 'pre-line' }}>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {selectedBook.summary}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="text-slate-400" size={16} />
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Book Summary
                  </span>
                </div>
                {isBookFavourited(selectedBook.id) && (
                  <div className="flex items-center space-x-1">
                    <Star className="text-yellow-500" size={16} fill="currentColor" />
                    <span className="text-sm text-yellow-600 dark:text-yellow-400">
                      Favourited
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}