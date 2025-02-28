import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

interface Ticket {
  id: string;
  title: string;
  customer: string;
  dateCreated: string;
  status: "open" | "in-progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
}

interface TicketListProps {
  tickets?: Ticket[];
  onSelectTicket?: (ticketId: string) => void;
}

const TicketList = ({
  tickets = [
    {
      id: "TKT-001",
      title: "Water meter reading incorrect",
      customer: "John Smith",
      dateCreated: "2023-06-15",
      status: "open",
      priority: "medium",
    },
    {
      id: "TKT-002",
      title: "Billing dispute for May invoice",
      customer: "Sarah Johnson",
      dateCreated: "2023-06-14",
      status: "in-progress",
      priority: "high",
    },
    {
      id: "TKT-003",
      title: "Request for payment extension",
      customer: "Michael Brown",
      dateCreated: "2023-06-12",
      status: "resolved",
      priority: "low",
    },
    {
      id: "TKT-004",
      title: "Water service interruption",
      customer: "Emily Davis",
      dateCreated: "2023-06-10",
      status: "open",
      priority: "urgent",
    },
    {
      id: "TKT-005",
      title: "Online account access issues",
      customer: "Robert Wilson",
      dateCreated: "2023-06-08",
      status: "closed",
      priority: "medium",
    },
  ],
  onSelectTicket = () => {},
}: TicketListProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Calculate pagination
  const totalPages = Math.ceil(tickets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTickets = tickets.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getStatusIcon = (status: Ticket["status"]) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "in-progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "resolved":
      case "closed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getPriorityBadge = (priority: Ticket["priority"]) => {
    switch (priority) {
      case "low":
        return <Badge variant="secondary">Low</Badge>;
      case "medium":
        return <Badge variant="default">Medium</Badge>;
      case "high":
        return <Badge className="bg-orange-500">High</Badge>;
      case "urgent":
        return <Badge variant="destructive">Urgent</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="w-full bg-white rounded-md shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ticket ID</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Date Created</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentTickets.map((ticket) => (
            <TableRow
              key={ticket.id}
              className="cursor-pointer hover:bg-blue-50"
              onClick={() => onSelectTicket(ticket.id)}
            >
              <TableCell className="font-medium">{ticket.id}</TableCell>
              <TableCell>{ticket.title}</TableCell>
              <TableCell>{ticket.customer}</TableCell>
              <TableCell>{ticket.dateCreated}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getStatusIcon(ticket.status)}
                  <span className="capitalize">
                    {ticket.status.replace("-", " ")}
                  </span>
                </div>
              </TableCell>
              <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
            </TableRow>
          ))}
          {currentTickets.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                No tickets found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="py-4 border-t">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  className={
                    currentPage === 1 ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={currentPage === page}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    handlePageChange(Math.min(totalPages, currentPage + 1))
                  }
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default TicketList;
