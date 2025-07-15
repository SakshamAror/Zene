import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Heart, Star, Search, X, Check } from 'lucide-react';
import { getBookSummaries, getUserBookStatus, upsertUserBookStatus } from '../lib/saveData';
import type { BookSummary, UserBookStatus } from '../types';
import { Emoji } from './Emoji';

interface LearnProps {
  userId: string;
  onBookOpen?: () => void;
  onBookClose?: () => void;
}

export default function Learn({ userId, onBookOpen, onBookClose }: LearnProps) {
  const [bookSummaries, setBookSummaries] = useState<BookSummary[]>([]);
  const [userBookStatus, setUserBookStatus] = useState<UserBookStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<BookSummary | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  // Gradient visibility state for unread and read lists
  const [showLeftUnread, setShowLeftUnread] = useState(false);
  const [showRightUnread, setShowRightUnread] = useState(false);
  const [showLeftRead, setShowLeftRead] = useState(false);
  const [showRightRead, setShowRightRead] = useState(false);
  const unreadRef = useRef<HTMLDivElement>(null);
  const readRef = useRef<HTMLDivElement>(null);

  // Infinite scroll visible counts
  const [unreadVisibleCount, setUnreadVisibleCount] = useState(5);
  const [readVisibleCount, setReadVisibleCount] = useState(5);

  // Helper to update gradient visibility and load more on scroll end
  function updateGradientAndLoadMore(ref: React.RefObject<HTMLDivElement>, setLeft: (v: boolean) => void, setRight: (v: boolean) => void, visibleCount: number, setVisibleCount: (n: number) => void, total: number) {
    const el = ref.current;
    if (!el) return;
    setLeft(el.scrollLeft > 2);
    setRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    // If scrolled to end, load more
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 && visibleCount < total) {
      setVisibleCount(Math.min(visibleCount + 5, total));
    }
  }

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

  const filteredBooks = bookSummaries.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || book.category === selectedCategory;
    const isRead = userBookStatus.find(status => status.book_summary_id === book.id && status.timestamp);
    return matchesSearch && matchesCategory && !isRead;
  });

  const categories = ['all', ...new Set(bookSummaries.map(book => book.category).filter(Boolean))];

  const isBookFavourited = (bookId: string) => {
    return userBookStatus.find(status => status.book_summary_id === bookId)?.is_favourite || false;
  };

  const handleBookClick = (book: BookSummary) => {
    setSelectedBook(book);
    setTransitioning(true);
    if (typeof onBookOpen === 'function') onBookOpen();
  };

  // Animate popup in on open
  useEffect(() => {
    if (selectedBook) {
      setTimeout(() => setTransitioning(false), 10); // allow mount, then animate in
    }
  }, [selectedBook]);

  const closeBookModal = () => {
    setTransitioning(true);
    setTimeout(() => {
      setSelectedBook(null);
      setTransitioning(false);
      if (typeof onBookClose === 'function') onBookClose();
    }, 300); // match transition duration
  };

  // Read summaries: favourited leftmost (most recent first), then unfavourited (most recent first)
  const readSummaries = bookSummaries
    .filter(book => userBookStatus.find(status => status.book_summary_id === book.id && status.timestamp))
    .sort((a, b) => {
      const aStatus = userBookStatus.find(status => status.book_summary_id === a.id && status.timestamp);
      const bStatus = userBookStatus.find(status => status.book_summary_id === b.id && status.timestamp);
      // Favourited books first
      if ((bStatus?.is_favourite ? 1 : 0) !== (aStatus?.is_favourite ? 1 : 0)) {
        return (bStatus?.is_favourite ? 1 : 0) - (aStatus?.is_favourite ? 1 : 0);
      }
      // Within each group, sort by most recent timestamp (descending)
      return (bStatus?.timestamp || '').localeCompare(aStatus?.timestamp || '');
    });

  useEffect(() => {
    // On mount or when books change, reset visible counts
    setUnreadVisibleCount(5);
    setReadVisibleCount(5);
  }, [filteredBooks.length, readSummaries.length]);

  useEffect(() => {
    // On mount, check initial state
    updateGradientAndLoadMore(unreadRef, setShowLeftUnread, setShowRightUnread, unreadVisibleCount, setUnreadVisibleCount, filteredBooks.length);
    updateGradientAndLoadMore(readRef, setShowLeftRead, setShowRightRead, readVisibleCount, setReadVisibleCount, readSummaries.length);
  }, [filteredBooks.length, readSummaries.length, unreadVisibleCount, readVisibleCount]);

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
        timestamp: new Date().toISOString(),
      });

      setUserBookStatus(prev => {
        const filtered = prev.filter(status => status.book_summary_id !== bookId);
        const updated = [
          ...filtered,
          {
            id: existingStatus?.id || `temp-${Date.now()}`,
            user_id: userId,
            book_summary_id: bookId,
            is_favourite: newFavouriteStatus,
            timestamp: new Date().toISOString().split('T')[0],
          },
        ];
        // Always sort: favourited first, then by timestamp desc
        return updated.sort((a, b) => {
          if (b.is_favourite !== a.is_favourite) return (b.is_favourite ? 1 : -1) - (a.is_favourite ? 1 : -1);
          return (b.timestamp || '').localeCompare(a.timestamp || '');
        });
      });
    } catch (error) {
      console.error('Error toggling favourite:', error);
    }
  };

  const isBookRead = (bookId: string) => {
    return !!userBookStatus.find(status => status.book_summary_id === bookId && status.timestamp);
  };

  const handleMarkAsRead = async (bookId: string) => {
    try {
      const existingStatus = userBookStatus.find(status => status.book_summary_id === bookId);
      await upsertUserBookStatus({
        user_id: userId,
        book_summary_id: bookId,
        is_favourite: existingStatus?.is_favourite || false,
        timestamp: new Date().toISOString(),
      });
      setUserBookStatus(prev => {
        const filtered = prev.filter(status => status.book_summary_id !== bookId);
        return [...filtered, {
          id: existingStatus?.id || `temp-${Date.now()}`,
          user_id: userId,
          book_summary_id: bookId,
          is_favourite: existingStatus?.is_favourite || false,
          timestamp: new Date().toISOString().split('T')[0],
        }];
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 loading-spinner mx-auto mb-4"></div>
          <p className="text-white/80 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 md:px-12 lg:px-24 py-10">
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 mb-4 flex items-center justify-center mx-auto animate-float">
            <Emoji emoji="📚" png="book.png" alt="book" size="3xl" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Learn & Grow</h1>
          <p className="text-white/80 text-lg max-w-md">Discover wisdom from great books</p>
        </div>

        {/* Search and Categories - Responsive Row */}
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mb-8 w-full">
          <div className="flex-1 mb-4 md:mb-0">
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
          </div>
          <div className="flex-1">
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
        </div>

        {/* Unread Books - Horizontal Scroll */}
        <div className="w-full max-w-4xl mb-12 relative">
          <div
            className="flex flex-row space-x-6 overflow-x-auto pb-2 custom-scrollbar-horizontal"
            style={{ minHeight: '200px' }}
            ref={unreadRef}
            onScroll={() => updateGradientAndLoadMore(unreadRef, setShowLeftUnread, setShowRightUnread, unreadVisibleCount, setUnreadVisibleCount, filteredBooks.length)}
          >
            {filteredBooks.length > 0 ? (
              filteredBooks.slice(0, unreadVisibleCount).map((book) => (
                <div
                  key={book.id}
                  onClick={() => handleBookClick(book)}
                  className="bg-emerald-900/60 p-4 rounded-2xl border border-emerald-700 hover:bg-emerald-800/60 transition-all cursor-pointer min-w-[260px] max-w-[260px] flex-shrink-0"
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
                      className={`p-2 rounded-xl transition-colors ${isBookFavourited(book.id)
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
              <div className="text-center py-12 min-w-[260px]">
                <Emoji emoji="🔍" png="search.png" alt="search" className="text-6xl mb-4 w-16 h-16 object-contain" />
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
          {/* Dynamic gradient overlays */}
          {showRightUnread && (
            <div className="pointer-events-none absolute top-0 right-0 h-full w-8 z-10" style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.18), transparent)' }} />
          )}
          {showLeftUnread && (
            <div className="pointer-events-none absolute top-0 left-0 h-full w-8 z-10" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.18), transparent)' }} />
          )}
        </div>

        {/* Read Summaries - Horizontal Scroll */}
        <div className="w-full max-w-4xl mb-12 relative">
          <h3 className="text-xl font-bold text-white mb-4 text-center">Your Read Summaries</h3>
          <div
            className="flex flex-row space-x-6 overflow-x-auto pb-2 custom-scrollbar-horizontal"
            style={{ minHeight: '160px' }}
            ref={readRef}
            onScroll={() => updateGradientAndLoadMore(readRef, setShowLeftRead, setShowRightRead, readVisibleCount, setReadVisibleCount, readSummaries.length)}
          >
            {readSummaries.slice(0, readVisibleCount).map((book) => (
              <div
                key={book.id}
                onClick={() => handleBookClick(book)}
                className="bg-emerald-400/20 p-3 rounded-2xl border border-emerald-400/30 hover:bg-emerald-400/30 transition-all cursor-pointer min-w-[220px] max-w-[220px] flex-shrink-0"
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
          {/* Dynamic gradient overlays */}
          {showRightRead && (
            <div className="pointer-events-none absolute top-0 right-0 h-full w-8 z-10" style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.18), transparent)' }} />
          )}
          {showLeftRead && (
            <div className="pointer-events-none absolute top-0 left-0 h-full w-8 z-10" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.18), transparent)' }} />
          )}
        </div>

        {/* Book Detail Popup Page */}
        {selectedBook && (
          <div
            className={`fixed inset-0 z-40 bg-gradient-to-b from-emerald-900 to-emerald-700 transition-all duration-300 ease-in-out flex flex-col min-h-screen w-screen h-screen overflow-y-auto ${transitioning ? 'opacity-0 translate-y-8 pointer-events-none' : 'opacity-100 translate-y-0'}`}
          >
            <div className="absolute top-0 left-0 p-4 z-50">
              <button
                className="bg-emerald-900/80 rounded-full p-2 shadow-md border border-emerald-700 text-emerald-200 hover:bg-emerald-800/90 transition"
                onClick={closeBookModal}
                aria-label="Back to Learn"
              >
                <X size={22} />
              </button>
            </div>
            <div className="w-full max-w-2xl mx-auto pt-20 pb-10 px-4">
              <div className="w-full flex flex-col">
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
                      className={`p-2 rounded-xl transition-colors ${isBookFavourited(selectedBook.id)
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-emerald-800/60 text-emerald-300 hover:text-red-400'
                        }`}
                    >
                      <Heart size={18} fill={isBookFavourited(selectedBook.id) ? 'currentColor' : 'none'} />
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
                  className={`w-full py-4 px-6 font-bold text-lg rounded-2xl shadow-lg transition flex items-center justify-center space-x-2 ${isBookRead(selectedBook.id)
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
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-white/60 text-sm">
            Knowledge is the key to endless possibilities.
          </p>
        </div>
      </div>
    </div>
  );
}