import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Search } from "lucide-react";
import type { GetTestsRequest } from "~/hooks/use-tests";

interface FilterTestProps {
  filters: GetTestsRequest;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onSearch: () => void;
  onFilterChange: (key: keyof GetTestsRequest, value: any) => void;
  isLoading: boolean;
  filterOptions?: {
    categories: Array<{ value: string; label: string; count: number }>;
  };
}

export function FilterTest({
  filters,
  searchTerm,
  onSearchTermChange,
  onSearch,
  onFilterChange,
  isLoading,
  filterOptions,
}: FilterTestProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Filter & Pencarian</CardTitle>
        <CardDescription>
          Gunakan filter untuk menemukan tes yang sesuai
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="search">Cari Tes</Label>
            <div className="flex gap-2">
              <Input
                id="search"
                placeholder="Nama tes, deskripsi, atau kategori..."
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearch()}
              />
              <Button onClick={onSearch} disabled={isLoading}>
                <Search className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Tipe Modul</Label>
            <Select
              value={filters.module_type || "all"}
              onValueChange={(value) => onFilterChange("module_type", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Semua tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="intelligence">Intelligence</SelectItem>
                <SelectItem value="personality">Personality</SelectItem>
                <SelectItem value="cognitive">Cognitive</SelectItem>
                <SelectItem value="projective">Projective</SelectItem>
                <SelectItem value="interest">Interest</SelectItem>
                <SelectItem value="aptitude">Aptitude</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Status</Label>
            <Select
              value={filters.status || "all"}
              onValueChange={(value) => onFilterChange("status", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Semua status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Nonaktif</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Arsip</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Kategori</Label>
            <Select
              value={filters.category || "all"}
              onValueChange={(value) => onFilterChange("category", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Semua kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {filterOptions?.categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label} ({category.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Urutkan</Label>
            <Select
              value={`${filters.sort_by}-${filters.sort_order}`}
              onValueChange={(value) => {
                const [sortBy, sortOrder] = value.split("-");
                onFilterChange("sort_by", sortBy as any);
                onFilterChange("sort_order", sortOrder as any);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">Terbaru</SelectItem>
                <SelectItem value="created_at-asc">Terlama</SelectItem>
                <SelectItem value="name-asc">Nama A-Z</SelectItem>
                <SelectItem value="name-desc">Nama Z-A</SelectItem>
                <SelectItem value="total_questions-desc">
                  Soal Terbanyak
                </SelectItem>
                <SelectItem value="time_limit-desc">Waktu Terlama</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
