import { useState, useRef, useEffect } from "react";
import { MapPin, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pastEventsData } from "@/data/sections-data";
import { OptimizedImage } from "@/components/common/OptimizedImage";

export const PastEvents = () => {
  const { header, events } = pastEventsData;
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Derive unique sorted years from events
  const years = Array.from(new Set(events.map((e) => e.year))).sort(
    (a, b) => b - a
  );

  const filteredEvents = selectedYear
    ? events.filter((e) => e.year === selectedYear)
    : events;

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-8">
      <div className="mb-16 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h2 className="text-foreground text-4xl font-black tracking-tight md:text-5xl">
            {header.title}
          </h2>
          <p className="text-primary mt-2 text-2xl font-bold">
            {selectedYear ?? header.year}
          </p>
        </div>

        {/* Year Filter Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="outline"
            onClick={() => setDropdownOpen((o) => !o)}
            className="text-muted-foreground flex items-center gap-2 rounded-full border-gray-200 bg-gray-100/40 px-6 py-6 font-semibold"
          >
            {selectedYear ? `Year ${selectedYear}` : "Select a Year"}
            <ChevronDown
              className={`h-5 w-5 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </Button>

          {dropdownOpen && (
            <div className="absolute top-full right-0 z-50 mt-2 w-44 rounded-2xl border border-gray-100 bg-white shadow-xl">
              <button
                onClick={() => {
                  setSelectedYear(null);
                  setDropdownOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-t-2xl px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                All Years
                {selectedYear === null && (
                  <Check className="h-4 w-4 text-sky-500" />
                )}
              </button>
              {years.map((year) => (
                <button
                  key={year}
                  onClick={() => {
                    setSelectedYear(year);
                    setDropdownOpen(false);
                  }}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 last:rounded-b-2xl hover:bg-gray-50"
                >
                  {year}
                  {selectedYear === year && (
                    <Check className="h-4 w-4 text-sky-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-20">
        {filteredEvents.length === 0 ? (
          <p className="text-muted-foreground py-20 text-center text-lg">
            No events found for {selectedYear}.
          </p>
        ) : (
          filteredEvents.map((event) => {
            const isExpanded = expandedIds.has(event.id);
            return (
              <div
                key={event.id}
                className="group flex flex-col gap-8 md:flex-row md:gap-12"
              >
                {/* Date column */}
                <div className="flex min-w-[120px] shrink-0 flex-col items-start justify-start md:items-center">
                  <span className="text-muted-foreground/80 mb-1 text-base font-bold tracking-widest uppercase">
                    {event.date.month}
                  </span>
                  <span className="text-foreground text-6xl leading-[0.8] font-black md:text-7xl">
                    {event.date.day}
                  </span>
                </div>

                {/* Image column */}
                <div className="aspect-[16/10] w-full shrink-0 overflow-hidden rounded-[2.5rem] border-none shadow-sm md:w-[420px]">
                  <OptimizedImage
                    src={event.image}
                    alt={event.title}
                    containerClassName="h-full w-full"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>

                {/* Content column */}
                <div className="flex flex-1 flex-col justify-start pt-2">
                  <h3 className="text-foreground group-hover:text-primary mb-3 text-3xl leading-[1.1] font-black transition-colors duration-300 md:text-4xl">
                    {event.title}
                  </h3>

                  <div className="text-muted-foreground/70 mb-5 flex items-center gap-2">
                    <MapPin className="text-primary/60 h-4 w-4 shrink-0" />
                    <span className="text-base font-semibold">
                      {event.location}
                    </span>
                  </div>

                  <div className="text-muted-foreground text-base leading-[1.6] md:text-lg">
                    <p
                      className={
                        isExpanded ? "" : "line-clamp-3 md:line-clamp-4"
                      }
                    >
                      {event.description}
                    </p>
                    <button
                      onClick={() => toggleExpand(event.id)}
                      className="text-primary mt-2 inline-flex cursor-pointer items-center font-extrabold transition-all hover:underline"
                    >
                      {isExpanded ? "See less" : "See more"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
