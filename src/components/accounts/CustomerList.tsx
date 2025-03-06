import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash,
  Eye,
} from "lucide-react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Badge } from "../ui/badge";

interface Customer {
  id: string;
  name: string;
  email: string;
  address: string;
  accountNumber: string;
  status: "active" | "inactive" | "pending";
  lastBillingDate: string;
  amountDue: number;
}

interface CustomerListProps {
  customers?: Customer[];
  onViewCustomer?: (customerId: string) => void;
  onEditCustomer?: (customerId: string) => void;
  onDeleteCustomer?: (customerId: string) => void;
}

const CustomerList: React.FC<CustomerListProps> = ({
  customers = [
    {
      id: "1",
      name: "John Doe",
      email: "john.doe@example.com",
      address: "123 Main St, Anytown, USA",
      accountNumber: "WB-10001",
      status: "active",
      lastBillingDate: "2023-04-15",
      amountDue: 78.5,
    },
    {
      id: "2",
      name: "Jane Smith",
      email: "jane.smith@example.com",
      address: "456 Oak Ave, Somewhere, USA",
      accountNumber: "WB-10002",
      status: "active",
      lastBillingDate: "2023-04-15",
      amountDue: 65.75,
    },
    {
      id: "3",
      name: "Robert Johnson",
      email: "robert.johnson@example.com",
      address: "789 Pine Rd, Elsewhere, USA",
      accountNumber: "WB-10003",
      status: "inactive",
      lastBillingDate: "2023-03-15",
      amountDue: 0,
    },
    {
      id: "4",
      name: "Sarah Williams",
      email: "sarah.williams@example.com",
      address: "101 Cedar Ln, Nowhere, USA",
      accountNumber: "WB-10004",
      status: "pending",
      lastBillingDate: "2023-04-15",
      amountDue: 92.25,
    },
    {
      id: "5",
      name: "Michael Brown",
      email: "michael.brown@example.com",
      address: "202 Elm St, Anyplace, USA",
      accountNumber: "WB-10005",
      status: "active",
      lastBillingDate: "2023-04-15",
      amountDue: 45.0,
    },
  ],
  onViewCustomer = (id) => console.log(`View customer ${id}`),
  onEditCustomer = (id) => console.log(`Edit customer ${id}`),
  onDeleteCustomer = (id) => console.log(`Delete customer ${id}`),
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const itemsPerPage = 10;
  const totalPages = Math.ceil(customers.length / itemsPerPage);

  // Filter customers based on search term
  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Get current page customers
  const indexOfLastCustomer = currentPage * itemsPerPage;
  const indexOfFirstCustomer = indexOfLastCustomer - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(
    indexOfFirstCustomer,
    indexOfLastCustomer,
  );

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const getStatusBadgeColor = (status: Customer["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="w-full bg-white p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          Customer Accounts
        </h2>
        <div className="flex space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search customers..."
              className="pl-10 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account #</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Billing</TableHead>
              <TableHead>Amount Due</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentCustomers.length > 0 ? (
              currentCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">
                    {customer.accountNumber}
                  </TableCell>
                  <TableCell>{customer.name}</TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getStatusBadgeColor(customer.status)}
                    >
                      {customer.status.charAt(0).toUpperCase() +
                        customer.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{customer.lastBillingDate}</TableCell>
                  <TableCell>₱{customer.amountDue.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onViewCustomer(customer.id)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onEditCustomer(customer.id)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDeleteCustomer(customer.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-6 text-gray-500"
                >
                  No customers found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {filteredCustomers.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500">
            Showing {indexOfFirstCustomer + 1} to{" "}
            {Math.min(indexOfLastCustomer, filteredCustomers.length)} of{" "}
            {filteredCustomers.length} customers
          </div>
          <div className="flex space-x-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(page)}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerList;
