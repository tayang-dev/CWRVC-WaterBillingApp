import React, { useState, useEffect, useMemo } from "react"; 
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
  setDoc, 
  updateDoc, 
  deleteDoc, 
  where
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

// Updated form schema to include block, lot, and meterNumber
const formSchema = z.object({
  firstName: z.string()
    .trim()
    .min(2, { message: "First name must be at least 2 characters." })
    .regex(/^[A-Za-zÑñ.\- ]+$/, "Only letters (including Ñ, ñ), dot (.), dash (-), and spaces are allowed")
    .refine((val) => val.trim().length > 0, { message: "First name cannot be empty or spaces only." }),

  lastName: z.string()
    .trim()
    .min(2, { message: "Last name must be at least 2 characters." })
    .regex(/^[A-Za-zÑñ.\- ]+$/, "Only letters (including Ñ, ñ), dot (.), dash (-), and spaces are allowed")
    .refine((val) => val.trim().length > 0, { message: "Last name cannot be empty or spaces only." }),

  middleInitial: z.string()
    .max(2, { message: "Middle initial can be up to 2 characters." }) // Up to 2 characters
    .regex(/^[A-Z]{1,2}$/, "Middle initial must be 1 or 2 uppercase letters.") // Enforce uppercase
    .or(z.literal(""))
    .optional(),

    email: z.string()
    .regex(/^[A-Za-z0-9Ññ._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, "Invalid email address. Ensure it follows the format: example@domain.com") // Custom email validation allowing ñ, Ñ
    .or(z.literal("")) // Allows empty string
    .optional(),

  phone: z.string()
    .optional()
    .refine((val) => !val || (/^0\d{10}$/.test(val)), { message: "Phone must be exactly 11 digits and start with 0" }),

  site: z.string().min(1, { message: "Please select a site location." }),

  isSenior: z.boolean().default(false),

  accountNumber: z.string(),

  meterNumber: z.string()
    .min(1, { message: "Meter number is required" })
    .regex(/^[A-Za-z0-9\-]+$/, "Meter number can only contain letters, numbers, and dash (-)"), // Allow letters

  block: z.string()
    .min(2, { message: "Block must be at least 2 characters." })
    .max(3, { message: "Block cannot exceed 3 characters." })
    .regex(/^[A-Za-z0-9]+$/, "Block can only contain letters and numbers"),

  lot: z.string()
    .min(2, { message: "Lot must be at least 2 characters." })
    .max(3, { message: "Lot cannot exceed 3 characters." })
    .regex(/^[A-Za-z0-9]+$/, "Lot can only contain letters and numbers"),

  status: z.enum(["active", "inactive", "delinquent"], {
    required_error: "Status is required.",
  }),
});


interface Customer {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  middleInitial?: string;
  email: string;
  address: string;
  accountNumber: string;
  meterNumber: string;
  block: string;
  lot: string;
  status: "active" | "inactive" | "pending" | "delinquent";
  lastBillingDate: string;
  amountDue: number;
  site?: string;
  isSenior?: boolean;
  phone?: string;
}

interface CustomerListProps {
  customers: Customer[];
  onViewCustomer?: (customerId: string) => void;
  onFilteredDataChange?: (filteredData: Customer[]) => void;
}

const CustomerList: React.FC<CustomerListProps> = ({
  onViewCustomer = (id) => console.log(`View customer ${id}`),
  onFilteredDataChange = () => {}, // Default empty function
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [filterSite, setFilterSite] = useState("all");
  const [filterSenior, setFilterSenior] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const itemsPerPage = 10;

  // Account Number Generation Logic
  const generateAccountNumber = (block: string, lot: string, selectedSite: string) => {
    const siteCode = selectedSite === "site1" ? "15" :
                     selectedSite === "site2" ? "14" :
                     selectedSite === "site3" ? "12" : "00";

    if (!block || !lot) return "";

    const blockNum = block.padStart(2, "0");
    const blockLot = (block + lot).padStart(4, "0");

    return `${blockNum}-${siteCode}-${blockLot}`;
  };
  

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
            firstName: customerData.firstName || "", // Add this line
            lastName: customerData.lastName || "",   // Add this line
            middleInitial: customerData.middleInitial || "", // Add this line
            email: customerData.email || customerData.phone, // Use phone if email is missing
            address: customerData.address,
            accountNumber: accountNumber,
            status: customerData.status,
            lastBillingDate: customerData.lastBillingDate || "N/A",
            amountDue: latestAmountDue,
            site: customerData.site,
            isSenior: customerData.isSenior,
            phone: customerData.phone,
            meterNumber: customerData.meterNumber || "",   // <-- added
            block: customerData.block || "",               // <-- added
            lot: customerData.lot || "",    
          };
        })
      );
  
    // Sort customers alphabetically by name
    customersList.sort((a, b) => a.name.localeCompare(b.name));

      setCustomers(customersList);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };
  
  const checkIfDetailsExist = async (accountNumber: string, meterNumber: string, email?: string, phone?: string, excludeCustomerId?: string) => {
    try {
      // Check if account number exists
      const accountQuery = query(
        collection(db, "customers"),
        where("accountNumber", "==", accountNumber)
      );
      const accountSnapshot = await getDocs(accountQuery);
  
      if (!accountSnapshot.empty && accountSnapshot.docs[0].id !== excludeCustomerId) {
        setError("Account number already exists. Please use a different block/lot/site combination.");
        return true;
      }
  
      // Check if meter number exists
      const meterQuery = query(
        collection(db, "customers"),
        where("meterNumber", "==", meterNumber)
      );
      const meterSnapshot = await getDocs(meterQuery);
  
      if (!meterSnapshot.empty && meterSnapshot.docs[0].id !== excludeCustomerId) {
        setError("Meter number already exists. Please enter a different meter number.");
        return true;
      }
  
      // Check if email exists
      if (email) {
        const emailQuery = query(
          collection(db, "customers"),
          where("email", "==", email)
        );
        const emailSnapshot = await getDocs(emailQuery);
  
        if (!emailSnapshot.empty && emailSnapshot.docs[0].id !== excludeCustomerId) {
          setError("Email address already exists. Please use a different email.");
          return true;
        }
      }
  
      // Check if phone number exists
      if (phone) {
        const phoneQuery = query(
          collection(db, "customers"),
          where("phone", "==", phone)
        );
        const phoneSnapshot = await getDocs(phoneQuery);
  
        if (!phoneSnapshot.empty && phoneSnapshot.docs[0].id !== excludeCustomerId) {
          setError("Phone number already exists. Please use a different phone number.");
          return true;
        }
      }
  
      setError("");
      return false;
    } catch (error: any) {
      setError("Error validating customer details: " + error.message);
      return true;
    }
  };

  // Edit Customer Handler
  const handleEditCustomer = async (data: z.infer<typeof formSchema>) => {
    if (!editingCustomer) return;
  
    setIsSubmitting(true);
    setError("");
  
    try {
      const accountNumber = generateAccountNumber(data.block || "", data.lot || "", data.site || "");
  
      // Check if account number, meter number, email, or phone already exists
      const detailsExist = await checkIfDetailsExist(
        accountNumber,
        data.meterNumber,
        data.email,
        data.phone,
        editingCustomer.id // Exclude the current customer being edited
      );
  
      if (detailsExist) {
        setIsSubmitting(false);
        return;
      }
  
      const siteAddresses = {
        site1: "Site 1, Brgy. Dayap, Calauan, Laguna",
        site2: "Site 2, Brgy. Dayap, Calauan, Laguna",
        site3: "Site 3, Brgy. Dayap, Calauan, Laguna",
      };
  
      const fullName = `${data.firstName} ${data.middleInitial ? data.middleInitial + ". " : ""}${data.lastName}`.trim();
  
      const customerRef = doc(db, "customers", editingCustomer.id);
      await updateDoc(customerRef, {
        ...data,
        name: fullName,
        accountNumber, // Updated account number
        email: data.email || null,
        address: siteAddresses[data.site as keyof typeof siteAddresses],
      });
  
      await fetchCustomers();
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
    // Prepare sanitized archive data to avoid undefined fields
    const {
      id,
      name = "",
      email = "",
      phone = "",
      address = "",
      accountNumber = "",
      block = "",
      lot = "",
      site = "",
      meterNumber = "",
      isSenior = false,
      // add any other fields that might exist
    } = deletingCustomer;

    const archiveRef = doc(db, "archiveCustomer", id);
    await setDoc(archiveRef, {
      id,
      name,
      email,
      phone,
      address,
      accountNumber,
      block,
      lot,
      site,
      meterNumber,
      isSenior,
      archivedAt: new Date().toISOString(),
    });

    // Delete the customer document
    const customerRef = doc(db, "customers", id);
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
      defaultValues: editingCustomer
        ? {
            firstName: editingCustomer.firstName || "",
            lastName: editingCustomer.lastName || "",
            middleInitial: editingCustomer.middleInitial || "",
            email: editingCustomer.email || "",
            phone: editingCustomer.phone || "",
            site: editingCustomer.site || "site1",
            isSenior: editingCustomer.isSenior || false,
            accountNumber: editingCustomer.accountNumber,
            meterNumber: editingCustomer.meterNumber || "",
            block: editingCustomer.block || "",
            lot: editingCustomer.lot || "",
            // Map "pending" to a valid status value
            status: editingCustomer.status === "pending" ? "inactive" : editingCustomer.status,
          }
        : undefined,
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
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="middleInitial" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Middle Initial</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
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

                <FormField control={form.control} name="meterNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meter Number</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="block" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Block</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="lot" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lot</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
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

                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="delinquent">Delinquent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
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

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearchTerm =
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.accountNumber.toLowerCase().includes(searchTerm.toLowerCase());
  
      const matchesSite = filterSite === "all" || customer.site === filterSite;
      const matchesSenior = !filterSenior || customer.isSenior === true;
  
      return matchesSearchTerm && matchesSite && matchesSenior;
    });
  }, [customers, searchTerm, filterSite, filterSenior]);
  
  useEffect(() => {
    if (onFilteredDataChange) {
      onFilteredDataChange(filteredCustomers);
    }
  }, [filteredCustomers, onFilteredDataChange]);
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
        return "bg-green-100 text-green-800"; // Green for active
      case "inactive":
        return "bg-gray-100 text-gray-800"; // Gray for inactive
      case "delinquent":
        return "bg-red-100 text-red-800"; // Red for delinquent
      default:
        return "bg-gray-100 text-gray-800"; // Default gray
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
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setShowFilters((prev) => !prev)}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        {showFilters && (
          <div className="flex space-x-2 items-center mt-2">
            {/* Filter by Site */}
            <Select value={filterSite} onValueChange={(value) => setFilterSite(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by Site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                <SelectItem value="site1">Site 1</SelectItem>
                <SelectItem value="site2">Site 2</SelectItem>
                <SelectItem value="site3">Site 3</SelectItem>
              </SelectContent>
            </Select>
            {/* Filter for Senior Citizens */}
            <label className="flex items-center space-x-2">
              <Checkbox checked={filterSenior} onCheckedChange={(val) => setFilterSenior(val as boolean)} />
              <span className="text-sm">Senior Only</span>
            </label>
          </div>
        )}
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
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = Math.max(1, currentPage - 2) + i; // Show 5 pages centered around the current page
              if (page <= totalPages) {
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </Button>
                );
              }
              return null;
            })}
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