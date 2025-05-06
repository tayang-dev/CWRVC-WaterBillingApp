import React, { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { useLocation } from "react-router-dom";

import { collection, getDocs } from "firebase/firestore";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon, ChevronLeft, ChevronRight, FileSpreadsheet, FilterIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { exportFeedbackToExcel } from "./exportFeedbackToExcel";

// TypeScript interfaces
interface Feedback {
  id: string;
  categories: string[];
  feedback: string;
  rating: number;
  timestamp: {
    seconds: number;
    nanoseconds: number;
  };
  userId: string;
}

interface FeedbackStats {
  total: number;
  averageRating: number;
  paymentProcess: number;
  otherCategories: number;
}

// Filtering interfaces
interface FeedbackFilters {
  category: string;
  rating: string;
  dateFrom: Date | null;
  dateTo: Date | null;
}

const Feedbacks: React.FC = () => {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [filteredFeedback, setFilteredFeedback] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats>({
    total: 0,
    averageRating: 0,
    paymentProcess: 0,
    otherCategories: 0,
  });
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  const location = useLocation();


  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  
  // Filter states
  const [filters, setFilters] = useState<FeedbackFilters>({
    category: "all",
    rating: "all",
    dateFrom: null,
    dateTo: null,
  });
  
  // For category filter dropdown
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);

  // Load feedback data
  useEffect(() => {
    const fetchFeedback = async (): Promise<void> => {
      try {
        const feedbackCollection = collection(db, "feedback");
        const feedbackSnapshot = await getDocs(feedbackCollection);
        const feedbackData = feedbackSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Feedback[];

        setFeedbackList(feedbackData);
        setFilteredFeedback(feedbackData);

        // Extract unique categories for filter dropdown
        const allCategories = new Set<string>();
        feedbackData.forEach(feedback => {
          feedback.categories.forEach(category => {
            allCategories.add(category);
          });
        });
        setUniqueCategories(Array.from(allCategories));

        // Calculate stats
        const total = feedbackData.length;
        const averageRating =
          total > 0
            ? feedbackData.reduce((sum, f) => sum + f.rating, 0) / total
            : 0;
        const paymentProcess = feedbackData.filter((f) =>
          f.categories.includes("Payment Process")
        ).length;
        const otherCategories = total - paymentProcess;

        setStats({
          total,
          averageRating,
          paymentProcess,
          otherCategories,
        });
      } catch (error) {
        console.error("Error fetching feedback:", error);
      }
    };

    fetchFeedback();
  }, []);

    // Handle tab and feedback selection from URL (for notification redirection)
    useEffect(() => {
      const searchParams = new URLSearchParams(location.search);
      const tab = searchParams.get("tab");
      const id = searchParams.get("id");
  
      if (tab) {
        setActiveTab(tab);
      }
  
      if (id && feedbackList.length > 0) {
        const target = feedbackList.find((f) => f.id === id);
        if (target) {
          setSelectedFeedback(target);
          setIsModalOpen(true);
        }
      }
    }, [location.search, feedbackList]);
  

  // Apply filters
  useEffect(() => {
    let result = [...feedbackList];
    
    // Filter by category
    if (filters.category && filters.category !== "all") {
      result = result.filter((feedback) =>
        feedback.categories.includes(filters.category)
      );
    }
    
    // Filter by rating
    if (filters.rating && filters.rating !== "all") {
      result = result.filter(
        (feedback) => feedback.rating === parseInt(filters.rating)
      );
    }
    
    // Filter by date range
    if (filters.dateFrom) {
      const fromTimestamp = filters.dateFrom.getTime() / 1000;
      result = result.filter(
        (feedback) => feedback.timestamp.seconds >= fromTimestamp
      );
    }
    
    if (filters.dateTo) {
      // Set time to end of day
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      const toTimestamp = toDate.getTime() / 1000;
      
      result = result.filter(
        (feedback) => feedback.timestamp.seconds <= toTimestamp
      );
    }
    
    setFilteredFeedback(result);
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [feedbackList, filters]);

  // Date formatting helper
  const formatDate = (timestamp: { seconds: number; nanoseconds?: number }): string => {
    return new Date(timestamp.seconds * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Handle feedback detail view
  const handleViewFeedback = (feedback: Feedback): void => {
    setSelectedFeedback(feedback);
    setIsModalOpen(true);
  };

  // Export to Excel
  const handleExportToExcel = async (): Promise<void> => {
    setActiveTab("feedback-list");
    setIsExporting(true);
    try {
      // Export filtered feedback instead of all feedback
      await exportFeedbackToExcel(filteredFeedback);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // Reset all filters
  const handleResetFilters = (): void => {
    setFilters({
      category: "all",
      rating: "all",
      dateFrom: null,
      dateTo: null,
    });
  };
  
  // Pagination calculation
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredFeedback.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredFeedback.length / itemsPerPage);
  
  // Pagination controls
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const handlePageSizeChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-blue-800">User Feedback</h1>
            <p className="text-gray-600 mt-1">
              Analyze and manage user feedback
            </p>
          </div>
          
          {/* Export Button */}
          <div className="mt-4 sm:mt-0">
            <Button 
              onClick={handleExportToExcel}
              disabled={isExporting || filteredFeedback.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isExporting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Exporting...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export to Excel
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="mb-4 border-b">
            <TabsTrigger value="overview" className="px-4 py-2">
              Overview
            </TabsTrigger>
            <TabsTrigger value="feedback-list" className="px-4 py-2">
              Feedback List
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="shadow-lg rounded-lg text-center">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-base font-medium">
                    Total Feedback
                  </CardTitle>
                  <CardDescription className="text-sm">
                    All feedback received
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.total}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg rounded-lg text-center">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-base font-medium">
                    Average Rating
                  </CardTitle>
                  <CardDescription className="text-sm">
                    User satisfaction score
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats.averageRating.toFixed(1)}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg rounded-lg text-center">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-base font-medium">
                    Payment Process
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Feedback on payments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.paymentProcess}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg rounded-lg text-center">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-base font-medium">
                    Other Categories
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Feedback on other topics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-600">
                    {stats.otherCategories}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Feedback List Tab */}
          <TabsContent value="feedback-list" className="space-y-6">
            <Card className="shadow-lg rounded-lg">
              <CardHeader>
                <CardTitle>Feedback List</CardTitle>
                <CardDescription>
                  View and analyze all user feedback
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Filters Section */}
                <div className="bg-gray-50 p-4 rounded-md border mb-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                    <h3 className="text-lg font-medium flex items-center">
                      <FilterIcon className="h-4 w-4 mr-2" />
                      Filter Feedback
                    </h3>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleResetFilters}
                      className="mt-2 md:mt-0"
                    >
                      Reset Filters
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Category Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="category-filter">Category</Label>
                      <Select
                        value={filters.category}
                        onValueChange={(value) =>
                          setFilters({ ...filters, category: value })
                        }
                      >
                        <SelectTrigger id="category-filter" className="w-full">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {uniqueCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Rating Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="rating-filter">Rating</Label>
                      <Select
                        value={filters.rating}
                        onValueChange={(value) =>
                          setFilters({ ...filters, rating: value })
                        }
                      >
                        <SelectTrigger id="rating-filter" className="w-full">
                          <SelectValue placeholder="All Ratings" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Ratings</SelectItem>
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <SelectItem key={rating} value={rating.toString()}>
                              {rating}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Date From Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="date-from">From Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="date-from"
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.dateFrom ? (
                              format(filters.dateFrom, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={filters.dateFrom || undefined}
                            onSelect={(date) =>
                              setFilters({ ...filters, dateFrom: date })
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    {/* Date To Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="date-to">To Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="date-to"
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.dateTo ? (
                              format(filters.dateTo, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={filters.dateTo || undefined}
                            onSelect={(date) =>
                              setFilters({ ...filters, dateTo: date })
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
                
                {filteredFeedback.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mt-1">
                      No feedback found matching your filters.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Table with data */}
                    <div className="rounded-md border shadow-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead>Feedback</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>User ID</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentItems.map((feedback) => (
                            <TableRow key={feedback.id}>
                              <TableCell>
                                {feedback.categories.join(", ")}
                              </TableCell>
                              <TableCell className="max-w-xs truncate">
                                {feedback.feedback}
                              </TableCell>
                              <TableCell>
                                <Badge className="bg-yellow-500">
                                  {feedback.rating}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatDate(feedback.timestamp)}</TableCell>
                              <TableCell className="max-w-xs truncate">{feedback.userId}</TableCell>
                              <TableCell>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleViewFeedback(feedback)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Pagination Controls */}
                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="page-size" className="text-sm">Items per page:</Label>
                        <Select
                          value={itemsPerPage.toString()}
                          onValueChange={handlePageSizeChange}
                        >
                          <SelectTrigger id="page-size" className="w-20">
                            <SelectValue placeholder={itemsPerPage.toString()} />
                          </SelectTrigger>
                          <SelectContent>
                            {[5, 10, 20, 50].map((size) => (
                              <SelectItem key={size} value={size.toString()}>
                                {size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-gray-500">
                          Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredFeedback.length)} of {filteredFeedback.length}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePrevPage}
                          disabled={currentPage === 1}
                          className={cn(
                            "h-8 w-8 p-0",
                            currentPage === 1 && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
                          Page {currentPage} of {totalPages || 1}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleNextPage}
                          disabled={currentPage === totalPages || totalPages === 0}
                          className={cn(
                            "h-8 w-8 p-0",
                            (currentPage === totalPages || totalPages === 0) && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Feedback Detail Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-lg">
            {selectedFeedback && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold">Feedback Details</DialogTitle>
                  <DialogDescription>
                    View complete feedback information
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-700">Categories</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedFeedback.categories.map((category, index) => (
                        <Badge key={index} className="bg-blue-100 text-blue-800">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-700">Rating</h3>
                    <Badge className="bg-yellow-500">
                      {selectedFeedback.rating} / 5
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-700">Date</h3>
                    <p>{formatDate(selectedFeedback.timestamp)}</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-700">User ID</h3>
                    <p className="text-sm font-mono bg-gray-100 p-2 rounded">
                      {selectedFeedback.userId}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-700">Feedback</h3>
                    <div className="bg-gray-50 p-4 rounded-md border text-gray-800">
                      {selectedFeedback.feedback}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => setIsModalOpen(false)}>Close</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Feedbacks;