import { useState, useEffect, useRef } from 'react';
import { fetchSearchSuggestions } from '../../services/api';

export default function StationSearch({ 
  value, 
  onChange, 
  onSelectSuggestion,
  onClear,
  onSearchSubmit 
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isFetching, setIsFetching] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Debounced suggestion fetching as user types
  useEffect(() => {
    if (!value || value.trim().length < 1) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsFetching(true);
      try {
        const results = await fetchSearchSuggestions(value);
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setSelectedIndex(-1);
      } catch (err) {
        setSuggestions([]);
      } finally {
        setIsFetching(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (onSearchSubmit) onSearchSubmit(value);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelect(suggestions[selectedIndex]);
      } else {
        setIsOpen(false);
        if (onSearchSubmit) onSearchSubmit(value);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (item) => {
    setIsOpen(false);
    setSelectedIndex(-1);
    if (onSelectSuggestion) {
      onSelectSuggestion(item);
    } else if (onChange) {
      onChange(item.value);
    }
  };

  const handleClear = () => {
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange('');
    }
    inputRef.current?.focus();
  };

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'state':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'city':
        return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
      case 'area':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'station':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-lg z-30">
      <div className="relative flex items-center">
        {/* Search Icon */}
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-primary/50 dark:text-white/50">
          <span className="material-symbols-outlined text-[20px]">search</span>
        </div>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          className="w-full bg-white dark:bg-zinc-900 border border-outline-variant/40 text-primary dark:text-white rounded-full py-3.5 pl-12 pr-11 font-body-md text-[15px] shadow-sm hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-secondary-container/40 transition-all placeholder:text-primary/40 dark:placeholder:text-white/40"
          placeholder="Search city, state, or area..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck="false"
        />

        {/* Clear Button or Spinner */}
        {isFetching ? (
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : value ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-3.5 my-auto w-7 h-7 flex items-center justify-center rounded-full text-primary/40 hover:text-primary dark:text-white/40 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="Clear search"
            aria-label="Clear search"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        ) : null}
      </div>

      {/* Helper text */}
      <div className="mt-1.5 px-4 flex items-center gap-1.5 text-[11px] text-primary/50 dark:text-white/50 font-medium tracking-wide">
        <span className="opacity-75">Precision format:</span>
        <span className="font-mono text-primary/70 dark:text-white/70">State, City, Area</span>
        <span className="opacity-50">·</span>
        <span className="italic opacity-70">e.g. Gujarat, Surat, Vesu</span>
      </div>

      {/* Autocomplete Dropdown - 100% Solid/Opaque Background */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-outline-variant/30 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.18)] py-2 z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 max-h-80 overflow-y-auto">
          <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-primary/40 dark:text-white/40 uppercase">
            Location Suggestions
          </div>
          {suggestions.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={`${item.type}-${item.value}-${idx}`}
                type="button"
                className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                  isSelected
                    ? 'bg-primary/5 dark:bg-white/10 text-primary dark:text-white'
                    : 'hover:bg-primary/5 dark:hover:bg-white/5 text-primary/90 dark:text-white/90'
                }`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getBadgeStyle(item.type)}`}>
                    {item.type}
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium text-[13.5px] truncate">
                      {item.title}
                    </div>
                  </div>
                </div>
                <div className="text-[12px] text-primary/50 dark:text-white/50 font-medium whitespace-nowrap pl-2">
                  {item.subtitle}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
