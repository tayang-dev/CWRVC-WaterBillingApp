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

interface Feedback {
  id: string;
  categories: string[];
  feedback: string;
  rating: number;
  timestamp: any;
  userId: string;
}

const Feedbacks = () => {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    averageRating: 0,
    paymentProcess: 0,
    otherCategories: 0,
  });

  useEffect(() => {
    const fetchFeedback = async () => {
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

  const formatDate = (timestamp: any) => {
    return new Date(timestamp.seconds * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-8">
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {feedbackList.map((feedback) => (
                          <TableRow key={feedback.id}>
                            <TableCell>
                              {feedback.categories.join(", ")}
                            </TableCell>
                            <TableCell>{feedback.feedback}</TableCell>
                            <TableCell>
                              <Badge className="bg-yellow-500">
                                {feedback.rating}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(feedback.timestamp)}</TableCell>
                            <TableCell>{feedback.userId}</TableCell>
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
      </div>
    </div>
  );
};

export default Feedbacks;