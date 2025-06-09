import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Filter, Search } from "lucide-react";

interface FilterState {
  search: string;
  role: string;
  gender: string;
  religion: string;
  education: string;
  province: string;
  is_active: string;
  sort_by: string;
  sort_order: "asc" | "desc";
}

interface FilterUserProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onResetFilters: () => void;
}

const GENDER_OPTIONS = [
  { value: "male", label: "Laki-laki" },
  { value: "female", label: "Perempuan" },
  { value: "other", label: "Lainnya" },
];

const RELIGION_OPTIONS = [
  { value: "islam", label: "Islam" },
  { value: "kristen", label: "Kristen" },
  { value: "katolik", label: "Katolik" },
  { value: "hindu", label: "Hindu" },
  { value: "buddha", label: "Buddha" },
  { value: "konghucu", label: "Konghucu" },
  { value: "other", label: "Lainnya" },
];

const EDUCATION_OPTIONS = [
  { value: "sd", label: "SD" },
  { value: "smp", label: "SMP" },
  { value: "sma", label: "SMA" },
  { value: "diploma", label: "Diploma" },
  { value: "s1", label: "S1" },
  { value: "s2", label: "S2" },
  { value: "s3", label: "S3" },
  { value: "other", label: "Lainnya" },
];

export function FilterUser({
  filters,
  onFilterChange,
  onResetFilters,
}: FilterUserProps) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Filter className="size-4" />
          Filter & Pencarian
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, email, NIK, atau telepon..."
                value={filters.search}
                onChange={(e) => onFilterChange("search", e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Role Filter */}
          <Select
            value={filters.role}
            onValueChange={(value) => onFilterChange("role", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Semua Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Role</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="participant">Peserta</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={filters.is_active}
            onValueChange={(value) => onFilterChange("is_active", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="true">Aktif</SelectItem>
              <SelectItem value="false">Nonaktif</SelectItem>
            </SelectContent>
          </Select>

          {/* Gender Filter */}
          <Select
            value={filters.gender}
            onValueChange={(value) => onFilterChange("gender", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Semua Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Gender</SelectItem>
              {GENDER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Religion Filter */}
          <Select
            value={filters.religion}
            onValueChange={(value) => onFilterChange("religion", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Semua Agama" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Agama</SelectItem>
              {RELIGION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Education Filter */}
          <Select
            value={filters.education}
            onValueChange={(value) => onFilterChange("education", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Semua Pendidikan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Pendidikan</SelectItem>
              {EDUCATION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select
            value={`${filters.sort_by}-${filters.sort_order}`}
            onValueChange={(value) => {
              const [sortBy, sortOrder] = value.split("-");
              onFilterChange("sort_by", sortBy);
              onFilterChange("sort_order", sortOrder as "asc" | "desc");
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Urutkan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at-desc">Terbaru</SelectItem>
              <SelectItem value="created_at-asc">Terlama</SelectItem>
              <SelectItem value="name-asc">Nama A-Z</SelectItem>
              <SelectItem value="name-desc">Nama Z-A</SelectItem>
              <SelectItem value="email-asc">Email A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reset Filters */}
        <div className="flex justify-end mt-4">
          <Button variant="outline" size="sm" onClick={onResetFilters}>
            Reset Filter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
