import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Heart, Star, Search, X, Check } from 'lucide-react';
import { getBookSummaries, getUserBookStatus, upsertUserBookStatus } from '../lib/saveData';
import type { BookSummary, UserBookStatus } from '../types';
import { Emoji } from './Emoji';
import toast from 'react-hot-toast';

interface LearnProps {
  userId: string;
  onBookOpen?: () => void;
  onBookClose?: () => void;
}

// Helper to render summary text with **bold**, *italic*, and bullet points
function renderSummaryWithBoldAndItalic(text: string) {
  if (!text) return null;

  // Check if text contains bullet points (lines starting with *)
  const lines = text.split('\n');
  const hasBulletPoints = lines.some(line => line.trim().startsWith('*'));

  if (hasBulletPoints) {
    // Render as list with bullet points
    return (
      <ul className="list-disc list-inside space-y-2 text-emerald-100">
        {lines.map((line, index) => {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('*')) {
            // Remove the * and render the content
            const content = trimmedLine.substring(1).trim();
            return (
              <li key={index} className="leading-relaxed">
                {renderInlineFormatting(content)}
              </li>
            );
          } else if (trimmedLine) {
            // Non-bullet lines as regular paragraphs
            return (
              <p key={index} className="mb-2 leading-relaxed">
                {renderInlineFormatting(trimmedLine)}
              </p>
            );
          }
          return null;
        })}
      </ul>
    );
  }

  // Regular text with bold/italic formatting
  return <span>{renderInlineFormatting(text)}</span>;
}

// Helper to render inline formatting (bold and italic)
function renderInlineFormatting(text: string) {
  if (!text) return null;

  // First, split by bold (**...**)
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
  return boldParts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      // Recursively process italics inside bold
      const inner = part.slice(2, -2);
      return <strong key={i}>{renderInlineFormatting(inner)}</strong>;
    }
    // Now split by italic (*...*) - but only if it's not at the start of a line
    const italicParts = part.split(/(\*[^*]+\*)/g);
    return italicParts.map((sub, j) => {
      if (/^\*[^*]+\*$/.test(sub)) {
        return <em key={j}>{sub.slice(1, -1)}</em>;
      }
      return <span key={j}>{sub}</span>;
    });
  });
}

export default function Learn({ userId, onBookOpen, onBookClose }: LearnProps) {
  // Call onBookOpen/onBookClose to notify App.tsx to hide/show navbar

  // Helper: check if book is favourited
  const isBookFavourited = (bookId: string) => {
    const bookStatus = userBookStatus.find(status => status.book_summary_id === bookId);
    return bookStatus?.is_favourite || false;
  };

  // Handler: open book detail
  const handleBookClick = (book: BookSummary) => {
    setSelectedBook(book);
    // bookPopupOpen is managed by showBookPopup and transitioning
    // Notify App.tsx to hide navbar instantly when opening
    if (onBookOpen) onBookOpen(); // Only call once
  };

  // Handler: close book detail
  const closeBookModal = () => {
    // Only close if not already transitioning out
    if (!transitioning && showBookPopup) {
      setTransitioning(true);
      setShowBookPopup(false); // Ensure navbar and category bar reappear instantly
      if (onBookClose) onBookClose(); // Show navbar instantly
      // Remove delay: fade out animation only happens once, then clear state immediately
      setTransitioning(false);
      setSelectedBook(null);
      // Refresh books page after closing summary
      loadData();
    }
  };
  const [bookSummaries, setBookSummaries] = useState<BookSummary[]>([]);
  const [userBookStatus, setUserBookStatus] = useState<UserBookStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<BookSummary | null>(null);
  const [showBookPopup, setShowBookPopup] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  // Helper: get all categories from bookSummaries
  const categories = ['all', ...Array.from(new Set(bookSummaries.map(b => b.category).filter(Boolean)))];

  // Gradient visibility state for unread and read lists
  const [showLeftUnread, setShowLeftUnread] = useState(false);
  const [showRightUnread, setShowRightUnread] = useState(false);
  const [showLeftRead, setShowLeftRead] = useState(false);
  const [showRightRead, setShowRightRead] = useState(false);
  const unreadRef = useRef<HTMLDivElement>(null);
  const readRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Infinite scroll visible counts
  const [unreadVisibleCount, setUnreadVisibleCount] = useState(5);
  const [readVisibleCount, setReadVisibleCount] = useState(5);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTopRef = useRef(0);
  const scrollDirectionRef = useRef<'up' | 'down' | null>(null);
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const showScrollToTopRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    showScrollToTopRef.current = showScrollToTop;
  }, [showScrollToTop]);

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
    loadData();
  }, [userId]);

  useEffect(() => {
    if (selectedBook && !showBookPopup) {
      setTransitioning(true);
      setShowBookPopup(true);
      if (onBookOpen) onBookOpen();
      setTransitioning(false);
    }
    // Do not handle closing here; closeBookModal handles closing logic and animation
  }, [selectedBook, showBookPopup, onBookOpen]);

  useEffect(() => {
    if (selectedBook) {
      document.body.classList.add('overflow-hidden');

      // Reset scroll state when book changes
      setShowScrollToTop(false);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = null;
      }
      scrollDirectionRef.current = null;
      lastScrollTopRef.current = 0;

      // Add scroll event listener for progress bar
      const handleScroll = () => {
        if (popupRef.current) {
          const scrollTop = popupRef.current.scrollTop;
          const scrollHeight = popupRef.current.scrollHeight - popupRef.current.clientHeight;
          const progress = scrollHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100)) : 0;
          setScrollProgress(progress);

          // Clear any existing scroll timer
          if (scrollTimerRef.current) {
            clearTimeout(scrollTimerRef.current);
          }

          // Hide immediately if at the top
          if (scrollTop <= 0) {
            setShowScrollToTop(false);
            scrollDirectionRef.current = null;
            lastScrollTopRef.current = scrollTop;
            return;
          }

          // Determine scroll direction
          const isScrollingUp = scrollTop < lastScrollTopRef.current;
          const isScrollingDown = scrollTop > lastScrollTopRef.current;

          // Update scroll direction
          if (isScrollingUp) {
            scrollDirectionRef.current = 'up';
          } else if (isScrollingDown) {
            scrollDirectionRef.current = 'down';
          }

          // Show button when scrolling up and position > 100px
          if (isScrollingUp && scrollTop > 100) {
            setShowScrollToTop(true);
            // Clear any hide timeout
            if (scrollTimeoutRef.current) {
              clearTimeout(scrollTimeoutRef.current);
              scrollTimeoutRef.current = null;
            }
          }

          // Hide button when scrolling down
          if (isScrollingDown && showScrollToTopRef.current) {
            // Clear any existing hide timeout
            if (scrollTimeoutRef.current) {
              clearTimeout(scrollTimeoutRef.current);
            }
            // Set new hide timeout
            scrollTimeoutRef.current = setTimeout(() => {
              setShowScrollToTop(false);
              scrollTimeoutRef.current = null;
            }, 150);
          }

          // Debounced direction reset
          scrollTimerRef.current = setTimeout(() => {
            scrollDirectionRef.current = null;
          }, 100);

          // Force hide button if we're near the top (within 50px)
          if (scrollTop <= 50) {
            setShowScrollToTop(false);
            if (scrollTimeoutRef.current) {
              clearTimeout(scrollTimeoutRef.current);
              scrollTimeoutRef.current = null;
            }
          }

          lastScrollTopRef.current = scrollTop;
        }
      };

      if (popupRef.current) {
        popupRef.current.addEventListener('scroll', handleScroll);
        return () => {
          if (popupRef.current) {
            popupRef.current.removeEventListener('scroll', handleScroll);
          }
          if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
          }
          if (scrollTimerRef.current) {
            clearTimeout(scrollTimerRef.current);
          }
          document.body.classList.remove('overflow-hidden');
        };
      }
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [selectedBook]);

  // --- Search logic update ---
  const searchFilteredBooks = bookSummaries.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || book.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredBooks = searchFilteredBooks.filter(book => {
    const bookStatus = userBookStatus.find(status => status.book_summary_id === book.id);
    const isRead = bookStatus?.is_read || false;
    const hasBookmark = (bookStatus?.bookmark_position || 0) > 0;
    return !isRead && !hasBookmark;
  }).sort((a, b) => {
    const aStatus = userBookStatus.find(status => status.book_summary_id === a.id);
    const bStatus = userBookStatus.find(status => status.book_summary_id === b.id);
    // Favourites leftmost, then by most recent timestamp (descending)
    if ((bStatus?.is_favourite ? 1 : 0) !== (aStatus?.is_favourite ? 1 : 0)) {
      return (bStatus?.is_favourite ? 1 : 0) - (aStatus?.is_favourite ? 1 : 0);
    }
    return (bStatus?.timestamp || '').localeCompare(aStatus?.timestamp || '');
  });

  const currentlyReadingSummaries = searchFilteredBooks.filter(book => {
    const bookStatus = userBookStatus.find(status => status.book_summary_id === book.id);
    const isRead = bookStatus?.is_read || false;
    const hasBookmark = (bookStatus?.bookmark_position || 0) > 0;
    return !isRead && hasBookmark;
  }).sort((a, b) => {
    // Sort by most recent bookmark timestamp (descending)
    const aStatus = userBookStatus.find(status => status.book_summary_id === a.id);
    const bStatus = userBookStatus.find(status => status.book_summary_id === b.id);
    if ((bStatus?.is_favourite ? 1 : 0) !== (aStatus?.is_favourite ? 1 : 0)) {
      return (bStatus?.is_favourite ? 1 : 0) - (aStatus?.is_favourite ? 1 : 0);
    }
    return (bStatus?.timestamp || '').localeCompare(aStatus?.timestamp || '');
  });

  const readSummaries = searchFilteredBooks.filter(book => {
    const bookStatus = userBookStatus.find(status => status.book_summary_id === book.id);
    return bookStatus?.is_read || false;
  }).sort((a, b) => {
    const aStatus = userBookStatus.find(status => status.book_summary_id === a.id);
    const bStatus = userBookStatus.find(status => status.book_summary_id === b.id);
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
        is_read: existingStatus?.is_read || false,
        bookmark_position: existingStatus?.bookmark_position || 0,
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
            is_read: existingStatus?.is_read || false,
            bookmark_position: existingStatus?.bookmark_position || 0,
            timestamp: new Date().toISOString().split('T')[0],
          },
        ];
        // Always sort: favourited first, then by timestamp desc
        return updated.sort((a, b) => {
          if (b.is_favourite !== a.is_favourite) return (b.is_favourite ? 1 : -1) - (a.is_favourite ? 1 : -1);
          return (b.timestamp || '').localeCompare(a.timestamp || '');
        });
      });
      toast.success(newFavouriteStatus ? 'Book added to favourites!' : 'Book removed from favourites.');
    } catch (error) {
      console.error('Error toggling favourite:', error);
      toast.error('Failed to update favourite.');
    }
  };

  const handleMarkAsRead = async (bookId: string) => {
    try {
      const existingStatus = userBookStatus.find(status => status.book_summary_id === bookId);
      await upsertUserBookStatus({
        user_id: userId,
        book_summary_id: bookId,
        is_favourite: existingStatus?.is_favourite || false,
        is_read: true,
        bookmark_position: 0, // Reset bookmark when marking as read
        timestamp: new Date().toISOString(),
      });
      setUserBookStatus(prev => {
        const filtered = prev.filter(status => status.book_summary_id !== bookId);
        return [
          ...filtered,
          {
            id: existingStatus?.id || `temp-${Date.now()}`,
            user_id: userId,
            book_summary_id: bookId,
            is_favourite: existingStatus?.is_favourite || false,
            is_read: true,
            bookmark_position: 0, // Ensure bookmark is reset
            timestamp: new Date().toISOString().split('T')[0],
          },
        ];
      });
      toast.success('Marked as read!');
      // Automatically close the popup after marking as read
      closeBookModal();
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('Failed to mark as read.');
    }
  };

  const handleMarkAsUnread = async (bookId: string) => {
    try {
      const existingStatus = userBookStatus.find(status => status.book_summary_id === bookId);
      await upsertUserBookStatus({
        user_id: userId,
        book_summary_id: bookId,
        is_favourite: existingStatus?.is_favourite || false,
        is_read: false,
        bookmark_position: 0, // Reset bookmark when marking as unread
        timestamp: new Date().toISOString(),
      });
      setUserBookStatus(prev => {
        const filtered = prev.filter(status => status.book_summary_id !== bookId);
        return [
          ...filtered,
          {
            id: existingStatus?.id || `temp-${Date.now()}`,
            user_id: userId,
            book_summary_id: bookId,
            is_favourite: existingStatus?.is_favourite || false,
            is_read: false,
            bookmark_position: 0,
            timestamp: new Date().toISOString().split('T')[0],
          },
        ];
      });
      toast.success('Marked as unread.');
    } catch (error) {
      console.error('Error marking as unread:', error);
      toast.error('Failed to mark as unread.');
    }
  };

  const handleSetBookmark = async (bookId: string) => {
    try {
      if (!popupRef.current) return;

      const scrollTop = popupRef.current.scrollTop;
      const scrollHeight = popupRef.current.scrollHeight - popupRef.current.clientHeight;
      const bookmarkPosition = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0;
      const existingStatus = userBookStatus.find(status => status.book_summary_id === bookId);
      const alreadyBookmarked = (existingStatus?.bookmark_position || 0) > 0;
      // Remove bookmark if already set, or if near 0
      if (alreadyBookmarked && bookmarkPosition === existingStatus?.bookmark_position) {
        await upsertUserBookStatus({
          user_id: userId,
          book_summary_id: bookId,
          is_favourite: existingStatus?.is_favourite || false,
          is_read: existingStatus?.is_read || false,
          bookmark_position: 0,
          timestamp: new Date().toISOString(),
        });
        setUserBookStatus(prev => {
          const filtered = prev.filter(status => status.book_summary_id !== bookId);
          return [...filtered, {
            id: existingStatus?.id || `temp-${Date.now()}`,
            user_id: userId,
            book_summary_id: bookId,
            is_favourite: existingStatus?.is_favourite || false,
            is_read: existingStatus?.is_read || false,
            bookmark_position: 0,
            timestamp: new Date().toISOString().split('T')[0],
          }];
        });
        toast('Bookmark removed.', { icon: '🔖', style: { background: '#064e3b', color: '#fff' } });
        return;
      }
      // Remove bookmark if near 0
      if (bookmarkPosition <= 1) {
        await upsertUserBookStatus({
          user_id: userId,
          book_summary_id: bookId,
          is_favourite: existingStatus?.is_favourite || false,
          is_read: existingStatus?.is_read || false,
          bookmark_position: 0,
          timestamp: new Date().toISOString(),
        });
        setUserBookStatus(prev => {
          const filtered = prev.filter(status => status.book_summary_id !== bookId);
          return [...filtered, {
            id: existingStatus?.id || `temp-${Date.now()}`,
            user_id: userId,
            book_summary_id: bookId,
            is_favourite: existingStatus?.is_favourite || false,
            is_read: existingStatus?.is_read || false,
            bookmark_position: 0,
            timestamp: new Date().toISOString().split('T')[0],
          }];
        });
        toast('Bookmark removed.', { icon: '🔖', style: { background: '#064e3b', color: '#fff' } });
        return;
      }
      // Otherwise, set bookmark
      await upsertUserBookStatus({
        user_id: userId,
        book_summary_id: bookId,
        is_favourite: existingStatus?.is_favourite || false,
        is_read: existingStatus?.is_read || false,
        bookmark_position: bookmarkPosition,
        timestamp: new Date().toISOString(),
      });
      setUserBookStatus(prev => {
        const filtered = prev.filter(status => status.book_summary_id !== bookId);
        return [...filtered, {
          id: existingStatus?.id || `temp-${Date.now()}`,
          user_id: userId,
          book_summary_id: bookId,
          is_favourite: existingStatus?.is_favourite || false,
          is_read: existingStatus?.is_read || false,
          bookmark_position: bookmarkPosition,
          timestamp: new Date().toISOString().split('T')[0],
        }];
      });
      toast.success('Bookmark set!');
    } catch (error) {
      console.error('Error setting bookmark:', error);
      toast.error('Failed to set bookmark.');
    }
  };

  const isBookRead = (bookId: string) => {
    const bookStatus = userBookStatus.find(status => status.book_summary_id === bookId);
    return bookStatus?.is_read || false;
  };

  // Auto-scroll to bookmark when opening a book summary with a bookmark
  useEffect(() => {
    if (selectedBook && popupRef.current) {
      const bookStatus = userBookStatus.find(status => status.book_summary_id === selectedBook.id);
      const bookmark = bookStatus?.bookmark_position || 0;
      if (bookmark > 0) {
        setTimeout(() => {
          if (!popupRef.current) return;
          const scrollHeight = popupRef.current.scrollHeight - popupRef.current.clientHeight;
          const targetScroll = Math.round((bookmark / 100) * scrollHeight);
          popupRef.current.scrollTo({ top: targetScroll, behavior: 'smooth' });
        }, 100); // Wait for popup to mount
      }
    }
  }, [selectedBook, userBookStatus]);

  const getBookmarkPosition = (bookId: string) => {
    const bookStatus = userBookStatus.find(status => status.book_summary_id === bookId);
    return bookStatus?.bookmark_position || 0;
  };

  const hasBookmark = (bookId: string) => {
    const bookStatus = userBookStatus.find(status => status.book_summary_id === bookId);
    return (bookStatus?.bookmark_position || 0) > 0;
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

        {/* Navigation bar with more spacing and clear section labels */}
        <div className={`flex flex-col md:flex-row md:items-center md:space-x-8 mb-12 w-full justify-center transition-opacity duration-300 ${transitioning ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}>
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

        {/* Section spacing and clear labels */}
        <div className="space-y-16 w-full">
          {/* Unread Books - Horizontal Scroll (no title) */}
          <div className="w-full max-w-4xl mb-12 relative">
            <div
              className="flex flex-row space-x-8 overflow-x-auto pb-4 custom-scrollbar-horizontal"
              style={{ minHeight: '200px' }}
              ref={unreadRef}
              onScroll={() => updateGradientAndLoadMore(unreadRef, setShowLeftUnread, setShowRightUnread, unreadVisibleCount, setUnreadVisibleCount, filteredBooks.length)}
            >
              {filteredBooks.length > 0 ? (
                filteredBooks.slice(0, unreadVisibleCount).map((book) => (
                  <div
                    key={book.id}
                    onClick={() => handleBookClick(book)}
                    className="bg-emerald-900/60 p-5 rounded-2xl border border-emerald-700 hover:bg-emerald-800/60 transition-all cursor-pointer min-w-[260px] max-w-[260px] flex-shrink-0 shadow-lg"
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
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-emerald-800/60 text-emerald-300 hover:text-yellow-400'
                          }`}
                      >
                        <Star size={16} fill={isBookFavourited(book.id) ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                    <p className="text-emerald-200 text-sm leading-relaxed line-clamp-3">
                      {book.summary}
                    </p>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-16 min-w-[260px] w-full">
                  <Emoji emoji="🔍" png="search.png" alt="search" className="text-6xl mb-4 w-16 h-16 object-contain" />
                  <h3 className="text-xl font-bold text-white mb-2">No books found</h3>
                  <p className="text-white/70 text-center">
                    {searchTerm || selectedCategory !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'Book summaries will appear here'
                    }
                  </p>
                </div>
              )}
            </div>
            {/* Dynamic gradient overlays only if there are books */}
            {filteredBooks.length > 0 && showRightUnread && (
              <div className="pointer-events-none absolute top-0 right-0 h-full w-8 z-10" style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.18), transparent)' }} />
            )}
            {filteredBooks.length > 0 && showLeftUnread && (
              <div className="pointer-events-none absolute top-0 left-0 h-full w-8 z-10" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.18), transparent)' }} />
            )}
          </div>

          {/* Currently Reading Books - Horizontal Scroll (moved below unread, brown bookmark) */}
          {currentlyReadingSummaries.length > 0 && (
            <div className="w-full max-w-4xl mb-12 relative">
              <h3 className="text-xl font-bold text-white mb-6 text-center tracking-wide">Currently Reading</h3>
              <div
                className="flex flex-row space-x-8 overflow-x-auto pb-4 custom-scrollbar-horizontal"
                style={{ minHeight: '200px' }}
                ref={unreadRef}
                onScroll={() => updateGradientAndLoadMore(unreadRef, setShowLeftUnread, setShowRightUnread, unreadVisibleCount, setUnreadVisibleCount, currentlyReadingSummaries.length)}
              >
                {currentlyReadingSummaries.slice(0, unreadVisibleCount).map((book) => (
                  <div
                    key={book.id}
                    onClick={() => handleBookClick(book)}
                    className="bg-emerald-900/60 p-5 rounded-2xl border border-emerald-700 hover:bg-emerald-800/60 transition-all cursor-pointer min-w-[260px] max-w-[260px] flex-shrink-0 shadow-lg"
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
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-emerald-800/60 text-emerald-300 hover:text-yellow-400'
                          }`}
                      >
                        <Star size={16} fill={isBookFavourited(book.id) ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                    <p className="text-emerald-200 text-sm leading-relaxed line-clamp-3">
                      {book.summary}
                    </p>
                    {/* Show bookmark progress */}
                    <div className="mt-2 flex items-center space-x-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" fill="currentColor" />
                      </svg>
                      <span className="text-xs text-amber-400 font-semibold">{getBookmarkPosition(book.id)}%</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Dynamic gradient overlays */}
              {showRightUnread && (
                <div className="pointer-events-none absolute top-0 right-0 h-full w-8 z-10" style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.18), transparent)' }} />
              )}
              {showLeftUnread && (
                <div className="pointer-events-none absolute top-0 left-0 h-full w-8 z-10" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.18), transparent)' }} />
              )}
            </div>
          )}

          {/* Read Summaries - Horizontal Scroll */}
          {readSummaries.length > 0 && (
            <div className="w-full max-w-4xl mb-12 relative">
              <h3 className="text-xl font-bold text-white mb-6 text-center tracking-wide">Your Read Summaries</h3>
              <div
                className="flex flex-row space-x-8 overflow-x-auto pb-4 custom-scrollbar-horizontal"
                style={{ minHeight: '160px' }}
                ref={readRef}
                onScroll={() => updateGradientAndLoadMore(readRef, setShowLeftRead, setShowRightRead, readVisibleCount, setReadVisibleCount, readSummaries.length)}
              >
                {readSummaries.slice(0, readVisibleCount).map((book) => (
                  <div
                    key={book.id}
                    onClick={() => handleBookClick(book)}
                    className="bg-emerald-400/20 p-5 rounded-2xl border border-emerald-400/30 hover:bg-emerald-400/30 transition-all cursor-pointer min-w-[220px] max-w-[220px] flex-shrink-0 shadow-lg"
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
          )}
        </div>

        {/* Progress Bar - fixed to viewport (outside popup) */}
        {showBookPopup && selectedBook && (
          <div
            className={`fixed top-1/2 right-4 w-2 h-64 bg-white/10 rounded-full z-[60] overflow-hidden transform -translate-y-1/2 transition-opacity duration-500 ${scrollProgress > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            <div
              className="w-2 bg-emerald-400 rounded-full transition-all duration-500 ease-out"
              style={{ height: `${scrollProgress}%` }}
            ></div>
            {/* Bookmark indicator */}
            {hasBookmark(selectedBook.id) && (
              <div
                className="absolute w-2.5 h-2.5 bg-amber-800 rounded-full shadow-lg border-3 border-white z-10"
                style={{
                  top: `${getBookmarkPosition(selectedBook.id)}%`,
                  transform: 'translate(-10%, -50%)'
                }}
                title={`Bookmark at ${getBookmarkPosition(selectedBook.id)}%`}
              ></div>
            )}
          </div>
        )}

        {/* Bookmark button at top of progress bar */}
        {showBookPopup && selectedBook && (
          <div
            className={`fixed top-1/2 right-1 transform z-[60] transition-all duration-500 ease-out ${scrollProgress > 0 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}
            style={{ transform: 'translateY(-170px)' }}
          >
            <button
              onClick={e => {
                e.stopPropagation();
                handleSetBookmark(selectedBook.id);
              }}
              className={`p-2 rounded-full shadow-lg transition-all duration-300 ${hasBookmark(selectedBook.id)
                ? 'bg-amber-800/90 text-white shadow-amber-800/30'
                : 'bg-emerald-800/90 text-emerald-200 hover:bg-amber-800/90 hover:text-white'
                }`}
              title={hasBookmark(selectedBook.id) ? `Bookmark at ${getBookmarkPosition(selectedBook.id)}%` : 'Set bookmark'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" fill={hasBookmark(selectedBook.id) ? 'currentColor' : 'none'} />
              </svg>
            </button>
          </div>
        )}

        {/* Scroll to Top Nudge */}
        {showBookPopup && selectedBook && (
          <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999] transition-all duration-500 ease-in-out ${showScrollToTop ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
            <button
              onClick={() => {
                if (popupRef.current) {
                  popupRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                  setShowScrollToTop(false);
                  if (scrollTimeoutRef.current) {
                    clearTimeout(scrollTimeoutRef.current);
                    scrollTimeoutRef.current = null;
                  }
                }
              }}
              className="bg-emerald-400/70 text-emerald-900 rounded-full p-3 shadow-lg hover:bg-emerald-400/90 transition-all duration-200 transform hover:scale-105 active:scale-95 backdrop-blur-sm"
              aria-label="Scroll to top"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m18 15-6-6-6 6" />
              </svg>
            </button>
          </div>
        )}

        {/* Book Detail Popup Page */}
        {/* Book Detail Popup Page - Timers.tsx style animation logic, always rendered for transition */}
        {/* Book Detail Popup Page - Timers.tsx style animation logic, always rendered for transition */}
        <div
          ref={popupRef}
          className={`fixed inset-0 z-50 min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-700 flex flex-col w-screen h-screen overflow-y-auto scrollbar-hide transition-all duration-300 ${showBookPopup || transitioning ? (transitioning ? 'opacity-0 translate-y-8 pointer-events-none' : 'opacity-100 translate-y-0') : 'opacity-0 translate-y-8 pointer-events-none'}`}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
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
            {(showBookPopup || transitioning) && (
              <div className="w-full flex flex-col">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-3 break-words">
                      {selectedBook?.title ?? ''}
                    </h2>
                    {selectedBook?.category && (
                      <span className="inline-block px-3 py-1 bg-emerald-400/20 text-emerald-300 text-sm font-medium rounded-full">
                        {selectedBook.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (selectedBook) handleToggleFavourite(selectedBook.id);
                      }}
                      className={`p-2 rounded-xl transition-colors ${selectedBook && isBookFavourited(selectedBook.id)
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-emerald-800/60 text-emerald-300 hover:text-yellow-400'
                        }`}
                    >
                      <Star size={18} fill={selectedBook && isBookFavourited(selectedBook.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>
                <div className="mb-8 max-w-prose mx-auto pr-4" style={{ whiteSpace: 'pre-line' }}>
                  <div className="text-emerald-100 text-lg leading-relaxed tracking-wide" style={{ letterSpacing: '0.01em' }}>
                    {selectedBook?.summary ? renderSummaryWithBoldAndItalic(selectedBook.summary) : null}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (selectedBook) {
                      if (isBookRead(selectedBook.id)) {
                        handleMarkAsUnread(selectedBook.id);
                      } else {
                        handleMarkAsRead(selectedBook.id);
                      }
                    }
                  }}
                  className={`w-full py-4 px-6 font-bold text-lg rounded-2xl shadow-lg transition flex items-center justify-center space-x-2 ${selectedBook && isBookRead(selectedBook.id)
                    ? 'bg-emerald-400/50 text-emerald-800 hover:bg-emerald-400/70 hover:text-emerald-900 cursor-pointer'
                    : 'bg-emerald-400 text-emerald-900 active:bg-emerald-300'
                    }`}
                >
                  {selectedBook && isBookRead(selectedBook.id) ? (
                    <>
                      <Check size={20} />
                      <span>Read</span>
                    </>
                  ) : (
                    <span>Mark as Read</span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

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