export default function StationSearch({ value, onChange }) {
  return (
    <div className="relative w-full max-w-md">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <span className="material-symbols-outlined text-primary/40 text-lg">search</span>
      </div>
      <input
        type="text"
        className="w-full bg-white/70 dark:bg-black/70 backdrop-blur-md border border-outline-variant/30 text-primary dark:text-white rounded-full py-3 pl-12 pr-4 font-body-md shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary-container/50 transition-all placeholder:text-primary/40 dark:placeholder:text-white/40"
        placeholder="Search city, area or station..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
