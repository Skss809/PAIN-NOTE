import React, { useState } from 'react';
import { Search, Sparkles, Loader2 } from 'lucide-react';
import { Note } from '../types';

interface AISearchBoxProps {
  notes: Note[];
  onSearchResults: (results: string[] | null) => void;
  isDark: boolean;
}

export function AISearchBox({ notes, onSearchResults, isDark }: AISearchBoxProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      onSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch('/api/gemini/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: query,
          notes: notes.map(n => ({ id: n.id, title: n.title, content: n.content }))
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Search failed');
      }

      const data = await response.json();
      const relevantIds = data.results;
      onSearchResults(relevantIds);
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Failed to perform AI search.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    onSearchResults(null);
  };

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-md mx-auto">
      <div className={`relative flex items-center w-full rounded-full border ${isDark ? 'bg-black/40 border-white/10 focus-within:border-[#00E5FF]/50' : 'bg-white/60 border-black/5 focus-within:border-black/20'} backdrop-blur-md overflow-hidden transition-all shadow-sm h-9 sm:h-10`}>
        <div className="pl-2 sm:pl-3 pr-1 sm:pr-2 text-neutral-400 flex items-center">
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00E5FF]" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value) {
              onSearchResults(null);
            }
          }}
          placeholder="Search..."
          className={`w-full bg-transparent outline-none text-xs sm:text-sm font-medium ${isDark ? 'text-white placeholder:text-neutral-500' : 'text-neutral-900 placeholder:text-neutral-400'}`}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="px-2 py-0.5 mr-1 text-[10px] uppercase tracking-wider font-bold rounded-md bg-neutral-500/20 text-neutral-400 hover:text-white transition-colors hidden sm:block"
          >
            Clear
          </button>
        )}
        <button
          type="submit"
          disabled={!query.trim() || isSearching}
          className={`h-full px-3 sm:px-4 flex items-center justify-center font-semibold text-sm transition-all ${!query.trim() || isSearching ? 'opacity-50 cursor-not-allowed' : ''} ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-black'} border-l ${isDark ? 'border-white/10' : 'border-black/5'}`}
        >
          {isSearching ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
        </button>
      </div>
    </form>
  );
}
