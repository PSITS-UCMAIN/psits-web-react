import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AccountSortValue } from "../hooks/useAccountListFilter";

const SORT_OPTIONS: Array<{ value: AccountSortValue; label: string }> = [
  { value: "name:asc", label: "Name (A–Z)" },
  { value: "name:desc", label: "Name (Z–A)" },
  { value: "idNumber:asc", label: "ID number (low–high)" },
  { value: "idNumber:desc", label: "ID number (high–low)" },
  { value: "campus:asc", label: "Campus (A–Z)" },
  { value: "campus:desc", label: "Campus (Z–A)" },
];

interface AccountListToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  campus: string;
  onCampusChange: (value: string) => void;
  campusOptions: string[];
  sort: AccountSortValue;
  onSortChange: (value: AccountSortValue) => void;
  searchPlaceholder?: string;
  /** Extra controls shown after the campus and sort selects (e.g. a role filter). */
  children?: ReactNode;
}

export const AccountListToolbar = ({
  search,
  onSearchChange,
  campus,
  onCampusChange,
  campusOptions,
  sort,
  onSortChange,
  searchPlaceholder = "Search name, ID, campus...",
  children,
}: AccountListToolbarProps) => (
  <div className="flex w-full flex-wrap items-center gap-2">
    <div className="relative w-full sm:w-56">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#9a9a9a]" />
      <Input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        className="h-9 rounded-2xl pr-8 pl-9 text-sm"
      />
      {search && (
        <button
          type="button"
          onClick={() => onSearchChange("")}
          className="absolute top-1/2 right-2 -translate-y-1/2 text-[#9a9a9a] hover:text-[#555]"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
    <Select value={campus} onValueChange={onCampusChange}>
      <SelectTrigger className="h-9 w-[150px] rounded-full text-sm" aria-label="Filter by campus">
        <SelectValue placeholder="All Campuses" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Campuses</SelectItem>
        {campusOptions.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Select
      value={sort}
      onValueChange={(value) => onSortChange(value as AccountSortValue)}
    >
      <SelectTrigger className="h-9 w-[180px] rounded-full text-sm" aria-label="Sort by">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {children}
  </div>
);
