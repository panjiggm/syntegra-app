import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  X,
  Calendar,
  Clock,
  Hash,
  RotateCcw,
  RefreshCcw,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Checkbox } from "~/components/ui/checkbox";

import { useTests } from "~/hooks/use-tests";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "~/lib/utils";

export interface TestFilters {
  search?: string;
  module_type?: string;
  category?: string;
  status?: string;
  time_limit_min?: number;
  time_limit_max?: number;
  total_questions_min?: number;
  total_questions_max?: number;
  difficulty_level?: string;
  created_from?: string;
  created_to?: string;
  tags?: string[];
}

interface TestTableFiltersProps {
  filters: TestFilters;
  onFiltersChange: (filters: TestFilters) => void;
  onReset: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function TestTableFilters({
  filters,
  onFiltersChange,
  onReset,
  onRefresh,
  isLoading,
}: TestTableFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search || "");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { useGetTestFilterOptions } = useTests();
  const { data: filterOptions, isLoading: isLoadingOptions } =
    useGetTestFilterOptions();

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      onFiltersChange({ ...filters, search: searchValue || undefined });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue]);

  const handleFilterChange = (key: keyof TestFilters, value: any) => {
    const newFilters = { ...filters };
    if (value === "" || value === null || value === undefined) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    onFiltersChange(newFilters);
  };

  const getActiveFiltersCount = () => {
    const excludeKeys = ["search"]; // Don't count search as active filter
    return Object.keys(filters).filter(
      (key) => !excludeKeys.includes(key) && filters[key as keyof TestFilters]
    ).length;
  };

  const clearFilter = (key: keyof TestFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  const formatModuleType = (moduleType: string) => {
    const moduleTypeMap: Record<string, string> = {
      intelligence: "Inteligensi",
      personality: "Kepribadian",
      cognitive: "Kognitif",
      projective: "Proyektif",
      interest: "Minat",
      aptitude: "Bakat",
    };
    return moduleTypeMap[moduleType] || moduleType;
  };

  const formatCategory = (category: string) => {
    const categoryMap: Record<string, string> = {
      wais: "WAIS",
      mbti: "MBTI",
      wartegg: "Wartegg",
      riasec: "RIASEC (Holland)",
      kraepelin: "Kraepelin",
      pauli: "Pauli",
      big_five: "Big Five",
      papi_kostick: "PAPI Kostick",
      dap: "DAP",
      raven: "Raven",
      epps: "EPPS",
      army_alpha: "Army Alpha",
      htp: "HTP",
      disc: "DISC",
      iq: "IQ",
      eq: "EQ",
    };
    return categoryMap[category] || category.toUpperCase();
  };

  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      active: "Aktif",
      inactive: "Nonaktif",
      draft: "Draft",
      archived: "Arsip",
    };
    return statusMap[status] || status;
  };

  const formatDifficultyLevel = (level: string) => {
    const levelMap: Record<string, string> = {
      easy: "Mudah",
      medium: "Sedang",
      hard: "Sulit",
      expert: "Ahli",
    };
    return levelMap[level] || level;
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari tes berdasarkan nama atau deskripsi..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9"
          />
        </div>
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="mr-2 h-4 w-4" />
              Filter
              {getActiveFiltersCount() > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -right-2 -top-2 h-5 w-5 rounded-full p-0 text-xs"
                >
                  {getActiveFiltersCount()}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filter Tes</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onReset();
                    setSearchValue("");
                    setIsFilterOpen(false);
                  }}
                >
                  Reset
                </Button>
              </div>

              <Separator />

              {/* Module Type Filter */}
              <div className="space-y-2">
                <Label htmlFor="module-type">Tipe Modul</Label>
                <Select
                  value={filters.module_type || ""}
                  onValueChange={(value) =>
                    handleFilterChange("module_type", value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Semua tipe modul" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions?.module_types?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {formatModuleType(option.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <Label htmlFor="category">Kategori</Label>
                <Select
                  value={filters.category || ""}
                  onValueChange={(value) =>
                    handleFilterChange("category", value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Semua kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions?.categories?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {formatCategory(option.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={filters.status || ""}
                  onValueChange={(value) => handleFilterChange("status", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Semua status" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions?.statuses?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {formatStatus(option.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty Level Filter */}
              <div className="space-y-2">
                <Label htmlFor="difficulty">Tingkat Kesulitan</Label>
                <Select
                  value={filters.difficulty_level || ""}
                  onValueChange={(value) =>
                    handleFilterChange("difficulty_level", value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Semua tingkat" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions?.difficulty_levels?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {formatDifficultyLevel(option.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tags Filter */}
              {filterOptions?.tags && filterOptions.tags.length > 0 && (
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {filterOptions.tags.map((tag) => (
                      <div
                        key={tag.value}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`tag-${tag.value}`}
                          checked={filters.tags?.includes(tag.value) || false}
                          onCheckedChange={(checked) => {
                            const currentTags = filters.tags || [];
                            if (checked) {
                              handleFilterChange("tags", [
                                ...currentTags,
                                tag.value,
                              ]);
                            } else {
                              handleFilterChange(
                                "tags",
                                currentTags.filter((t) => t !== tag.value)
                              );
                            }
                          }}
                        />
                        <Label
                          htmlFor={`tag-${tag.value}`}
                          className="text-sm font-normal flex-1 cursor-pointer"
                        >
                          {tag.label} ({tag.count})
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Active Filters */}
      {getActiveFiltersCount() > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter aktif:</span>

          {filters.module_type && (
            <Badge variant="secondary" className="gap-1">
              Tipe: {formatModuleType(filters.module_type)}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
                onClick={() => clearFilter("module_type")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {filters.category && (
            <Badge variant="secondary" className="gap-1">
              Kategori: {formatCategory(filters.category)}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
                onClick={() => clearFilter("category")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {filters.status && (
            <Badge variant="secondary" className="gap-1">
              Status: {formatStatus(filters.status)}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
                onClick={() => clearFilter("status")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {filters.difficulty_level && (
            <Badge variant="secondary" className="gap-1">
              Tingkat: {formatDifficultyLevel(filters.difficulty_level)}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
                onClick={() => clearFilter("difficulty_level")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {(filters.time_limit_min || filters.time_limit_max) && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              Durasi: {filters.time_limit_min || 0} -{" "}
              {filters.time_limit_max || "∞"} menit
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  clearFilter("time_limit_min");
                  clearFilter("time_limit_max");
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {(filters.total_questions_min || filters.total_questions_max) && (
            <Badge variant="secondary" className="gap-1">
              <Hash className="h-3 w-3" />
              Soal: {filters.total_questions_min || 0} -{" "}
              {filters.total_questions_max || "∞"}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  clearFilter("total_questions_min");
                  clearFilter("total_questions_max");
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {(filters.created_from || filters.created_to) && (
            <Badge variant="secondary" className="gap-1">
              <Calendar className="h-3 w-3" />
              Tanggal:{" "}
              {filters.created_from
                ? format(new Date(filters.created_from), "dd/MM", {
                    locale: id,
                  })
                : "∞"}{" "}
              -{" "}
              {filters.created_to
                ? format(new Date(filters.created_to), "dd/MM", { locale: id })
                : "∞"}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  clearFilter("created_from");
                  clearFilter("created_to");
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {filters.tags && filters.tags.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              Tags: {filters.tags.length} dipilih
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
                onClick={() => clearFilter("tags")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onReset();
              setSearchValue("");
            }}
            className="text-red-500 hover:text-red-500 border-red-500 cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            Reset filter
          </Button>
        </div>
      )}
    </div>
  );
}
