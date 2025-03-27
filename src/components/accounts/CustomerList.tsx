import React, { useState, useEffect } from "react"; 
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash,
  Eye,
  AlertCircle,
} from "lucide-react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc 
} from "firebase/firestore";
import { db } from "../../lib/firebase";

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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "../ui/dialog";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "../ui/alert-dialog";

// Reuse the form schema from AddCustomerForm
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(10, { message: "Phone number must be at least 10 characters." }),
  site: z.string().min(1, { message: "Please select a site location." }),
  isSenior: z.boolean().default(false),
  accountNumber: z.string().min(7, { message: "Invalid account number format." }),
});

interface Customer {
  id: string;
  name: string;
  email: string;
  address: string;
  accountNumber: string;
  status: "active" | "inactive" | "pending";
  lastBillingDate: string;
  amountDue: number;
  site?: string;
  isSenior?: boolean;
  phone?: string;
}

interface CustomerListProps {
  customers: Customer[];
  onViewCustomer?: (customerId: string) => void;
}

const CustomerList: React.FC<CustomerListProps> = ({
  onViewCustomer = (id) => console.log(`View customer ${id}`),
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const itemsPerPage = 10;

  useEffect(() => {
    fetchCustomers();
  }, []);
  
  const fetchCustomers = async () => {
    try {
      const customersCollection = collection(db, "customers");
      const customersSnapshot = await getDocs(customersCollection);
  
      // Fetch updatedPayments collection
      const paymentsCollection = collection(db, "updatedPayments");
      const paymentsSnapshot = await getDocs(paymentsCollection);
      
      // Create a map of accountNumber -> amount from updatedPayments
      const paymentsMap: { [key: string]: number } = {};
      paymentsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.accountNumber && data.amount) {
          paymentsMap[data.accountNumber] = data.amount;
        }
      });
  
      let customersList = await Promise.all(
        customersSnapshot.docs.map(async (customerDoc) => {
          const customerData = customerDoc.data();
          const accountNumber = customerData.accountNumber;
  
          let latestAmountDue = 0;
  
          // Check if amount is available in updatedPayments
          if (accountNumber && paymentsMap[accountNumber] !== undefined) {
            latestAmountDue = paymentsMap[accountNumber];
          } else if (accountNumber) {
            // Fetch the latest bill from `bills/{accountNumber}/records/`
            const billsCollection = collection(db, "bills", accountNumber, "records");
            const billsQuery = query(billsCollection, orderBy("date", "desc"));
            const billsSnapshot = await getDocs(billsQuery);
  
            if (!billsSnapshot.empty) {
              const latestBill = billsSnapshot.docs[0].data();
              latestAmountDue = latestBill.currentAmountDue ?? latestBill.amount ?? 0;
            }
          }
  
          return {
            id: customerDoc.id,
            name: customerData.name,
            email: customerData.email || customerData.phone, // Use phone if email is missing
            address: customerData.address,
            accountNumber: accountNumber,
            status: customerData.status,
            lastBillingDate: customerData.lastBillingDate || "N/A",
            amountDue: latestAmountDue,
            site: customerData.site,
            isSenior: customerData.isSenior,
            phone: customerData.phone,
          };
        })
      );
  
      setCustomers(customersList);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };
  
  

  // Edit Customer Handler
  const handleEditCustomer = async (data: z.infer<typeof formSchema>) => {
    if (!editingCustomer) return;

    setIsSubmitting(true);
    setError("");

    try {
      const siteAddresses = {
        site1: "Site 1, Brgy. Dayap, Calauan, Laguna",
        site2: "Site 2, Brgy. Dayap, Calauan, Laguna",
        site3: "Site 3, Brgy. Dayap, Calauan, Laguna",
      };

      const customerRef = doc(db, "customers", editingCustomer.id);
      await updateDoc(customerRef, {
        ...data,
        email: data.email || null,
        address: siteAddresses[data.site as keyof typeof siteAddresses],
      });

      // Refresh customer list
      await fetchCustomers();
      
      // Close dialog
      setEditingCustomer(null);
    } catch (error: any) {
      setError(error.message || "An error occurred while updating the customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Customer Handler
  const handleDeleteCustomer = async () => {
    if (!deletingCustomer) return;

    setIsSubmitting(true);

    try {
      const customerRef = doc(db, "customers", deletingCustomer.id);
      await deleteDoc(customerRef);

      // Refresh customer list
      await fetchCustomers();
      
      // Close dialog
      setDeletingCustomer(null);
    } catch (error: any) {
      console.error("Error deleting customer:", error);
      setError(error.message || "An error occurred while deleting the customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Customer Form
  const EditCustomerDialog = () => {
    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: editingCustomer ? {
        name: editingCustomer.name,
        email: editingCustomer.email || "",
        phone: editingCustomer.phone || "",
        site: editingCustomer.site || "site1",
        isSenior: editingCustomer.isSenior || false,
        accountNumber: editingCustomer.accountNumber,
      } : undefined,
    });

    return (
      <Dialog open={!!editingCustomer} onOpenChange={() => setEditingCustomer(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer information for {editingCustomer?.name}
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 text-sm rounded-md bg-red-50 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditCustomer)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address (Optional)</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="accountNumber" render={() => (
                  <FormItem>
                    <FormLabel>Account Number</FormLabel>
                    <FormControl>
                      <Input 
                        value={editingCustomer?.accountNumber} 
                        disabled 
                      />
                    </FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="site" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site Location</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select site location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="site1">Site 1</SelectItem>
                        <SelectItem value="site2">Site 2</SelectItem>
                        <SelectItem value="site3">Site 3</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="isSenior" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Senior Citizen</FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )} />
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setEditingCustomer(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? "Updating..." : "Update Customer"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  };

  // Delete Confirmation Dialog
  const DeleteConfirmationDialog = () => (
    <AlertDialog open={!!deletingCustomer} onOpenChange={() => setDeletingCustomer(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the customer record for {deletingCustomer?.name}. 
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDeleteCustomer} 
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? "Deleting..." : "Delete Customer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // Filter customers based on search term
  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.accountNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get current page customers
  const indexOfLastCustomer = currentPage * itemsPerPage;
  const indexOfFirstCustomer = indexOfLastCustomer - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(
    indexOfFirstCustomer,
    indexOfLastCustomer
  );

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  // Function to get badge color based on status
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
        <h2 className="text-xl font-semibold text-gray-800">Customer Accounts</h2>
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
              <TableHead>Email/Phone</TableHead>
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
                      {customer.status}
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
                        <DropdownMenuItem onClick={() => onViewCustomer(customer.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingCustomer(customer)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeletingCustomer(customer)}
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
                <TableCell colSpan={7} className="text-center py-6 text-gray-500">
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

      {/* Add these dialogs at the end of the return */}
      <EditCustomerDialog />
      <DeleteConfirmationDialog />
    </div>
  );
};

export default CustomerList;