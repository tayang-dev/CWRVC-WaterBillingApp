import React, { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
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
import { exportFeedbackToExcel } from "./exportFeedbackToExcel"; // Import the export function
import { FileSpreadsheet } from "lucide-react"; // Import icon

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

const Feedbacks: React.FC = () => {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
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

  const formatDate = (timestamp: { seconds: number; nanoseconds?: number }): string => {
    return new Date(timestamp.seconds * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleViewFeedback = (feedback: Feedback): void => {
    setSelectedFeedback(feedback);
    setIsModalOpen(true);
  };

  const handleExportToExcel = async (): Promise<void> => {
    // First switch to the feedback-list tab
    setActiveTab("feedback-list");
    
    // Then start export process
    setIsExporting(true);
    try {
      await exportFeedbackToExcel(feedbackList);
      // Success notification could be added here
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      // Error notification could be added here
    } finally {
      setIsExporting(false);
    }
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
          
          {/* Single Export Button */}
          <div className="mt-4 sm:mt-0">
            <Button 
              onClick={handleExportToExcel}
              disabled={isExporting || feedbackList.length === 0}
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
                {feedbackList.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mt-1">
                      No feedback available at the moment.
                    </p>
                  </div>
                ) : (
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
                        {feedbackList.map((feedback) => (
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