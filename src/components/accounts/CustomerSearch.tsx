// Updated CustomerSearch.tsx
import React, { useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CustomerSearchProps {
  onSearch?: (query: string, filters: CustomerSearchFilters) => void;
  className?: string;
}

interface CustomerSearchFilters {
  site: string;
  isSenior: string;
}

const CustomerSearch = ({
  onSearch = () => {},
  className = "",
}: CustomerSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<CustomerSearchFilters>({
    site: "all",
    isSenior: "all",
  });

  const handleSearch = () => {
    onSearch(searchQuery, filters);
  };

  const handleFilterChange = (
    key: keyof CustomerSearchFilters,
    value: string
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const clearFilters = () => {
    setFilters({
      site: "all",
      isSenior: "all",
    });
  };

  return (
    <Card className={`w-full bg-white ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-blue-800">Customer Search</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-grow">
              <Input
                type="text"
                placeholder="Search by name, account number, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSearch}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Search
              </Button>
              <Button
                variant="outline"
                onClick={toggleFilters}
                className="border-blue-300 text-blue-600"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="bg-blue-50 p-4 rounded-md">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-blue-800">Filter Options</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Clear All
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    Site
                  </label>
                  <Select
                    value={filters.site}
                    onValueChange={(value) => handleFilterChange("site", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select site" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sites</SelectItem>
                      <SelectItem value="site1">Site 1</SelectItem>
                      <SelectItem value="site2">Site 2</SelectItem>
                      <SelectItem value="site3">Site 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    Senior Citizen
                  </label>
                  <Select
                    value={filters.isSenior}
                    onValueChange={(value) => handleFilterChange("isSenior", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select senior status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="true">Senior Citizen</SelectItem>
                      <SelectItem value="false">Not Senior</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerSearch;
