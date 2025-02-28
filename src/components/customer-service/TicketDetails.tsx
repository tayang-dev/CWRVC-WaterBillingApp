import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { Separator } from "../ui/separator";
import {
  Clock,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Flag,
  User,
  Calendar,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface TicketResponse {
  id: string;
  author: string;
  authorAvatar?: string;
  content: string;
  timestamp: string;
  isStaff: boolean;
}

interface TicketDetailsProps {
  ticketId?: string;
  subject?: string;
  description?: string;
  status?: "open" | "in-progress" | "resolved" | "closed";
  priority?: "low" | "medium" | "high" | "urgent";
  customer?: {
    name: string;
    email: string;
    avatar?: string;
  };
  createdAt?: string;
  responses?: TicketResponse[];
}

const TicketDetails = ({
  ticketId = "TKT-1234",
  subject = "Billing discrepancy on latest invoice",
  description = "I noticed that my latest water bill is significantly higher than usual, but my usage hasn't changed. I believe there might be an error in the calculation or reading.",
  status = "in-progress",
  priority = "high",
  customer = {
    name: "Jane Smith",
    email: "jane.smith@example.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jane",
  },
  createdAt = "2023-06-15T10:30:00Z",
  responses = [
    {
      id: "1",
      author: "Jane Smith",
      authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jane",
      content:
        "I've attached my last three bills for reference. The most recent one is almost double the usual amount.",
      timestamp: "2023-06-15T10:35:00Z",
      isStaff: false,
    },
    {
      id: "2",
      author: "Support Agent",
      authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=agent",
      content:
        "Thank you for bringing this to our attention. I'll review your billing history and check if there were any meter reading issues. We'll get back to you shortly.",
      timestamp: "2023-06-15T11:20:00Z",
      isStaff: true,
    },
    {
      id: "3",
      author: "Billing Specialist",
      authorAvatar:
        "https://api.dicebear.com/7.x/avataaars/svg?seed=specialist",
      content:
        "After reviewing your account, we found that there was indeed an error in the meter reading. We'll issue a corrected bill within 48 hours. We apologize for the inconvenience.",
      timestamp: "2023-06-16T09:15:00Z",
      isStaff: true,
    },
  ],
}: TicketDetailsProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-blue-500">Open</Badge>;
      case "in-progress":
        return <Badge className="bg-yellow-500">In Progress</Badge>;
      case "resolved":
        return <Badge className="bg-green-500">Resolved</Badge>;
      case "closed":
        return <Badge className="bg-gray-500">Closed</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "low":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-500">
            Low
          </Badge>
        );
      case "medium":
        return (
          <Badge
            variant="outline"
            className="border-yellow-500 text-yellow-500"
          >
            Medium
          </Badge>
        );
      case "high":
        return (
          <Badge
            variant="outline"
            className="border-orange-500 text-orange-500"
          >
            High
          </Badge>
        );
      case "urgent":
        return (
          <Badge variant="outline" className="border-red-500 text-red-500">
            Urgent
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-6xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{subject}</h1>
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Clock size={16} />
              {formatDate(createdAt)}
            </span>
            <span className="flex items-center gap-1 ml-4">
              <User size={16} />
              Ticket #{ticketId}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          {getStatusBadge(status)}
          {getPriorityBadge(priority)}
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={customer.avatar} alt={customer.name} />
                <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{customer.name}</CardTitle>
                <p className="text-sm text-gray-500">{customer.email}</p>
              </div>
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <Calendar size={16} />
              {formatDate(createdAt)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 whitespace-pre-line">{description}</p>
        </CardContent>
      </Card>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Ticket History</h2>
        <div className="space-y-4">
          {responses.map((response) => (
            <Card
              key={response.id}
              className={response.isStaff ? "border-l-4 border-l-blue-500" : ""}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage
                        src={response.authorAvatar}
                        alt={response.author}
                      />
                      <AvatarFallback>
                        {response.author.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {response.author}
                      </CardTitle>
                      {response.isStaff && (
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          Staff
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDate(response.timestamp)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-line">
                  {response.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator className="my-6" />

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Add Response</h2>
        <Textarea
          placeholder="Type your response here..."
          className="min-h-[120px] mb-4"
        />
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Select defaultValue={status}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Update Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue={priority}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Update Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">Cancel</Button>
            <Button>
              <MessageSquare className="mr-2 h-4 w-4" />
              Send Response
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" className="gap-2">
          <Flag className="h-4 w-4" />
          Flag for Review
        </Button>
        <Button variant="outline" className="gap-2">
          <AlertCircle className="h-4 w-4" />
          Escalate
        </Button>
        <Button
          variant="outline"
          className="gap-2 bg-green-50 text-green-600 hover:bg-green-100 border-green-200"
        >
          <CheckCircle className="h-4 w-4" />
          Mark as Resolved
        </Button>
      </div>
    </div>
  );
};

export default TicketDetails;
