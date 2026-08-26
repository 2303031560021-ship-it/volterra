export default function StationFilters({ activeFilter, onFilterChange, availableFilters = ['All', 'AC', 'DC'] }) {
  const filters = availableFilters;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
      {filters.map((filter) => (
        <button
          key={filter}
          onClick={() => onFilterChange(filter)}
          className={`px-5 py-2 rounded-full font-label-sm text-sm whitespace-nowrap transition-colors border ${
            activeFilter === filter
              ? 'bg-primary text-secondary-container border-primary'
              : 'bg-white/50 text-on-surface-variant border-outline-variant/20 hover:bg-white hover:text-primary'
          }`}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}
