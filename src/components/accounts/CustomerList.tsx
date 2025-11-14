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
  Archive,
  RefreshCw,
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
import { Calendar } from "@/components/ui/calendar"; // If you have a calendar/date picker
import { format } from "date-fns"; // For date formatting

// Updated form schema to include block, lot, and meterNumber
const formSchema = z.object({
  firstName: z.string()
    .trim()
    .min(2, { message: "First name must be at least 2 characters." })
    .max(15, { message: "First name cannot exceed 15 characters." }) // Added max length validation
    .regex(/^[A-Za-zÑñ.\- ]+$/, "Only letters (including Ñ, ñ), dot (.), dash (-), and spaces are allowed")
    .refine((val) => val.trim().length > 0, { message: "First name cannot be empty or spaces only." }),

  lastName: z.string()
    .trim()
    .min(2, { message: "Last name must be at least 2 characters." })
    .max(15, { message: "Last name cannot exceed 15 characters." }) // Added max length validation
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
    .min(11, { message: "Phone must be exactly 11 digits and start with 0" })
    .max(11, { message: "Phone must be exactly 11 digits and start with 0" })
    .regex(/^0\d{10}$/, "Phone must be exactly 11 digits and start with 0"),

  site: z.string().min(1, { message: "Please select a site location." }),

  isSenior: z.boolean().default(false),

  accountNumber: z.string(),

  meterNumber: z.string()
    .min(1, { message: "Meter number is required" })
    .max(15, { message: "Meter number cannot exceed 15 characters" })
    .regex(/^[A-Za-z0-9\-]+$/, "Meter number can only contain letters, numbers, and dash (-)"), // Allow letters

  block: z.string()
    .min(2, { message: "Block must be at least 2 characters." })
    .max(3, { message: "Block cannot exceed 3 characters." })
    .regex(/^[A-Za-z0-9]+$/, "Block can only contain letters and numbers"),

  lot: z.string()
    .min(2, { message: "Lot must be at least 2 characters." })
    .max(3, { message: "Lot cannot exceed 3 characters." })
    .regex(/^[A-Za-z0-9]+$/, "Lot can only contain letters and numbers"),

  status: z.enum(["active", "inactive"], {
    required_error: "Status is required.",
  }),
})
.refine((data) => data.email || data.phone, {
    message: "At least one of Email or Phone is required.",
    path: ["email"], // Highlight the email field by default
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
  status: "active" | "inactive" | "pending" ;
  lastBillingDate: string;
  amountDue: number;
  site?: string;
  isSenior?: boolean;
  phone?: string;
  hasSCF: boolean;
  scfAmount?: number;
}

interface CustomerListProps {
  customers: Customer[];
  onViewCustomer?: (customerId: string) => void;
  onFilteredDataChange?: (filteredData: Customer[]) => void;
}
const handleNumberOnly = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (!/^[0-9]$/.test(e.key) && e.key !== "Backspace" && e.key !== "Tab") {
    e.preventDefault();
  }
};

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
  const [filterStatus, setFilterStatus] = useState("all"); // <-- Add this line
  const [scfCustomer, setScfCustomer] = useState<Customer | null>(null);
  const [isScfSubmitting, setIsScfSubmitting] = useState(false);
  const [scfError, setScfError] = useState("");
  const [showScfConfirm, setShowScfConfirm] = useState(false); // Add this state at the top inside CustomerList component

  // --- Archive states ---
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archivedCustomers, setArchivedCustomers] = useState<Customer[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [archiveSearchTerm, setArchiveSearchTerm] = useState("");
  const [archivePage, setArchivePage] = useState(1);

  // Process state to prevent multiple clicks on restore/delete for archived items
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingArchivedId, setDeletingArchivedId] = useState<string | null>(null);

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
  
  // Update the fetchCustomers function
const fetchCustomers = async () => {
  try {
    const customersCollection = collection(db, "customers");
    const customersSnapshot = await getDocs(customersCollection);

    // Fetch all SCFs once
    const scfCollection = collection(db, "scf");
    const scfSnapshot = await getDocs(scfCollection);
    
    // Get current month and year
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Create a map of accountNumber -> latest SCF status
    const scfMap: { [key: string]: boolean } = {};
    scfSnapshot.forEach((doc) => {
      const scfData = doc.data();
      if (scfData.accountNumber) {
        // Convert SCF date string to Date object
        const scfDate = new Date(scfData.date);
        // Check if SCF is from current month
        const isCurrentMonth = scfDate.getMonth() === currentMonth && 
                             scfDate.getFullYear() === currentYear;
        
        // Only mark as having SCF if it's from current month
        if (isCurrentMonth) {
          scfMap[scfData.accountNumber] = true;
        }
      }
    });

    let customersList = customersSnapshot.docs.map((customerDoc) => {
      const customerData = customerDoc.data();
      const accountNumber = customerData.accountNumber;

      // Check if customer has SCF in current month
      const hasSCF = scfMap[accountNumber] || false;

      return {
        id: customerDoc.id,
        name: customerData.name,
        firstName: customerData.firstName || "",
        lastName: customerData.lastName || "",
        middleInitial: customerData.middleInitial || "",
        email: customerData.email || "",
        address: customerData.address,
        accountNumber: accountNumber,
        status: customerData.status,
        site: customerData.site,
        isSenior: customerData.isSenior,
        phone: customerData.phone || "",
        meterNumber: customerData.meterNumber || "",
        block: customerData.block || "",
        lot: customerData.lot || "",
        hasSCF: hasSCF, // Will only be true if SCF exists for current month
        lastBillingDate: customerData.lastBillingDate || "",
        amountDue: customerData.amountDue ?? 0,
        scfAmount: customerData.scfAmount ?? 0, // <-- ADD THIS LINE

      };
    });

    // Sort customers by name
    customersList.sort((a, b) => {
      const nameA = a.name || "";
      const nameB = b.name || "";
      return nameA.localeCompare(nameB);
    });

    setCustomers(customersList);
  } catch (error) {
    console.error("Error fetching customers:", error);
  }
};

  // --- Fetch archived customers ---
  const fetchArchivedCustomers = async () => {
    setArchiveLoading(true);
    setArchiveError("");
    try {
      const archiveCol = collection(db, "archiveCustomer");
      const snapshot = await getDocs(archiveCol);
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      })) as Customer[];
      // archived docs may contain archivedAt field; keep it in list (UI can ignore)
      setArchivedCustomers(list);
    } catch (e: any) {
      console.error("Error fetching archived customers:", e);
      setArchiveError(e.message || "Failed to fetch archived customers");
    } finally {
      setArchiveLoading(false);
    }
  };
  
  // Fetch archived customers when dialog opens
  useEffect(() => {
    if (archiveDialogOpen) {
      fetchArchivedCustomers();
    }
  }, [archiveDialogOpen]);

    // Restore an archived customer
  const handleRestoreArchived = async (arch: any) => {
    if (!arch?.id) return;
    // prevent concurrent restores
    if (restoringId) return;
    setRestoringId(arch.id);
    setIsSubmitting(true);
    try {
      // Prepare data to restore (remove archivedAt)
      const { archivedAt, id, ...rest } = arch;
      const customerRef = doc(db, "customers", arch.id);
      // Use setDoc to restore using same id so references remain stable
      await setDoc(customerRef, {
        ...rest,
        // ensure fields that should not be undefined are normalized
        email: rest.email || null,
        phone: rest.phone || null,
      });
      // remove from archive collection
      await deleteDoc(doc(db, "archiveCustomer", arch.id));
      await fetchCustomers();
      await fetchArchivedCustomers();
      alert(`Restored ${rest.name || arch.id}`);
    } catch (e: any) {
      console.error("Error restoring archived customer:", e);
      alert("Failed to restore archived customer: " + (e.message || ""));
    } finally {
      setIsSubmitting(false);
      setRestoringId(null);
    }
  };

  // Permanently delete archived customer
  const handlePermanentlyDeleteArchived = async (arch: any) => {
    if (!arch?.id) return;
    // prevent concurrent deletes
    if (deletingArchivedId) return;

    const ok = window.confirm(
      `Permanently delete archived customer ${arch.name || arch.id}? This action cannot be undone.`
    );
    if (!ok) return;

    setDeletingArchivedId(arch.id);
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "archiveCustomer", arch.id));
      await fetchArchivedCustomers();
      alert(`Permanently deleted ${arch.name || arch.id}`);
    } catch (e: any) {
      console.error("Error deleting archived customer:", e);
      alert("Failed to delete archived customer: " + (e.message || ""));
    } finally {
      setIsSubmitting(false);
      setDeletingArchivedId(null);
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
    const nowIso = new Date().toISOString();
    // Build a complete archive object with safe defaults, mirror your customers document shape
    const archiveData = {
      accountNumber: deletingCustomer.accountNumber || "",
      firstName: deletingCustomer.firstName || "",
      lastName: deletingCustomer.lastName || "",
      middleInitial: deletingCustomer.middleInitial ?? "",
      name: deletingCustomer.name || `${deletingCustomer.firstName || ""} ${deletingCustomer.middleInitial ? deletingCustomer.middleInitial + ". " : ""}${deletingCustomer.lastName || ""}`.trim(),
      email: deletingCustomer.email ?? null,
      phone: deletingCustomer.phone ?? null,
      address: deletingCustomer.address ?? `Site ${deletingCustomer.site ?? "3"}, Brgy. Dayap, Calauan, Laguna`,
      site: deletingCustomer.site ?? "site3",
      block: deletingCustomer.block ?? "",
      lot: deletingCustomer.lot ?? "",
      meterNumber: deletingCustomer.meterNumber ?? "",
      hasSCF: typeof deletingCustomer.hasSCF === "boolean" ? deletingCustomer.hasSCF : false,
      scfAmount: typeof deletingCustomer.scfAmount === "number" ? deletingCustomer.scfAmount : 0,
      amountDue: typeof deletingCustomer.amountDue === "number" ? deletingCustomer.amountDue : 0,
      lastReading: (deletingCustomer as any).lastReading ?? 0,
      previousReading: (deletingCustomer as any).previousReading ?? "",
      lastBillingDate: deletingCustomer.lastBillingDate ?? null,
      joinDate: (deletingCustomer as any).joinDate ?? (deletingCustomer.lastBillingDate ?? null),
      status: deletingCustomer.status ?? "inactive",
      archivedAt: nowIso,
    };

    // Write to archive collection using same document id so restore is straightforward
    const archiveRef = doc(db, "archiveCustomer", deletingCustomer.id);
    await setDoc(archiveRef, archiveData);

    // Delete the original customer document
    const customerRef = doc(db, "customers", deletingCustomer.id);
    await deleteDoc(customerRef);

    // Refresh lists
    await fetchCustomers();
    await fetchArchivedCustomers();

    // Close dialog
    setDeletingCustomer(null);
  } catch (error: any) {
    console.error("Error deleting customer:", error);
    setError(error.message || "An error occurred while deleting the customer");
  } finally {
    setIsSubmitting(false);
  }
};

// Update SCF schema to include amount
const scfSchema = z.object({
  amount: z
  .number()
  .min(0, { message: "SCF amount must be at least ₱0." })
  .max(99999, { message: "SCF amount cannot exceed ₱99,999." }),
});

  // SCF Dialog Component
  const ScfDialog = () => {
    const form = useForm<z.infer<typeof scfSchema>>({
      resolver: zodResolver(scfSchema),
      defaultValues: {
        amount: 0,
      },
    });

    // Add confirmation state
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingData, setPendingData] = useState<z.infer<typeof scfSchema> | null>(null);
    
    // Reset form whenever scfCustomer changes so input is prefilled with existing scfAmount
    useEffect(() => {
      form.reset({ amount: scfCustomer?.scfAmount ?? 0 });
    }, [scfCustomer]);

    const onSubmit = (data: z.infer<typeof scfSchema>) => {
      setPendingData(data);
      setShowConfirm(true);
    };

const handleConfirmedSubmit = async () => {
  if (!pendingData || !scfCustomer) return;

  setIsScfSubmitting(true);
  setScfError("");

  try {
    // Update customer's scfAmount field only (no SCF collection)
    // Replace customer's scfAmount with the entered value (allows setting to 0)
    const customerRef = doc(db, "customers", scfCustomer.id);
    await updateDoc(customerRef, {
      scfAmount: pendingData.amount
    });

    // Reset everything
    form.reset();
    setScfCustomer(null);
    setShowConfirm(false);
    setPendingData(null);

    await fetchCustomers();
  } catch (e: any) {
    setScfError(e.message || "Failed to add SCF");
  } finally {
    setIsScfSubmitting(false);
  }
};



// Then, modify the table header and remove the SCF Status column

    return (
      <>
        <Dialog open={!!scfCustomer} onOpenChange={(open) => {
          if (!open) {
            form.reset();
            setScfCustomer(null);
            setShowConfirm(false);
            setPendingData(null);
          }
        }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add SCF (Service Customer Fee)</DialogTitle>
              <DialogDescription>
                For {scfCustomer?.name} ({scfCustomer?.accountNumber})
              </DialogDescription>
            </DialogHeader>
            
            {scfError && (
              <div className="text-red-600 text-sm mb-2">{scfError}</div>
            )}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                


            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SCF Amount (₱) <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={99999}
                      value={field.value}
                      onChange={(e) => {
                        // Coerce to number and clamp between 0 and 99999
                        const raw = e.target.value === "" ? "" : Number(e.target.value);
                        if (raw === "") {
                          field.onChange(0);
                          return;
                        }
                        const clamped = Math.max(0, Math.min(99999, Math.floor(raw)));
                        field.onChange(clamped);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
                
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      form.reset();
                      setScfCustomer(null);
                    }}
                    disabled={isScfSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isScfSubmitting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Add SCF
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm SCF Addition</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to add this SCF for {scfCustomer?.name}?
                <div className="mt-4 space-y-2">

                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                onClick={() => setShowConfirm(false)}
                disabled={isScfSubmitting}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmedSubmit}
                disabled={isScfSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isScfSubmitting ? "Adding..." : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
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
                    <FormLabel>
                      First Name <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Last Name <span className="text-red-500">*</span>
                    </FormLabel>
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

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="09123456789"
                          maxLength={11}
                          inputMode="numeric"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const input = e.target.value;
                            // Allow digits only (so user can type progressively). final validation handled by schema.
                            if (/^[0-9]*$/.test(input)) {
                              field.onChange(input);
                            }
                          }}
                          onKeyDown={(e) => {
                            // Allow only numeric input, backspace, and tab
                            if (!/^[0-9]$/.test(e.key) && e.key !== "Backspace" && e.key !== "Tab") {
                              e.preventDefault();
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                    <FormLabel>
                      Site Location <span className="text-red-500">*</span>
                    </FormLabel>      
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
                    <FormLabel>
                      Meter Number <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="block" render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Block <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="lot" render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Lot <span className="text-red-500">*</span>
                    </FormLabel>
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
      (customer.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phone || "").toLowerCase().includes(searchTerm.toLowerCase()) || // <-- Add this line
      (customer.accountNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
      (customer.lastBillingDate || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSite = filterSite === "all" || customer.site === filterSite;
      const matchesSenior = !filterSenior || customer.isSenior === true;
      const matchesStatus = filterStatus === "all" || customer.status === filterStatus; // <-- Add this line


      return matchesSearchTerm && matchesSite && matchesSenior && matchesStatus;
    });
  }, [customers, searchTerm, filterSite, filterSenior, filterStatus]);
  
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

      default:
        return "bg-gray-100 text-gray-800"; // Default gray
    }
  };

  // Add this function to get SCF badge color
  const getScfStatusColor = (hasScf: boolean) => {
    return hasScf 
      ? "bg-yellow-100 text-yellow-800" 
      : "bg-gray-100 text-gray-800";
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

          {/* Archive button (opens archived customers dialog) */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setArchiveDialogOpen(true)}
            title="Archived customers"
          >
            <Archive className="h-4 w-4" />
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
                {/* Filter by Status */}
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>

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


    {/* Archived Customers Dialog - render only when open */}
{archiveDialogOpen && (
  <Dialog open={true} onOpenChange={(open) => setArchiveDialogOpen(open)}>
    <DialogContent className="w-full max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Archived Customers</h3>
        <div className="flex items-center space-x-2 mr-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchArchivedCustomers()}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Search Field */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search archived customers..."
          className="pl-10 w-full"
          value={archiveSearchTerm}
          onChange={(e) => {
            setArchiveSearchTerm(e.target.value);
            setArchivePage(1); 
          }}
        />
      </div>

      {archiveLoading ? (
        <div className="text-center py-8">Loading archived customers...</div>
      ) : archiveError ? (
        <div className="text-red-600">{archiveError}</div>
      ) : archivedCustomers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No archived customers</div>
      ) : (
        <>
          {/* Filter and Pagination Logic */}
          {(() => {
            const filteredArchived = archivedCustomers.filter((a) => {
              const t = archiveSearchTerm.toLowerCase();
              return (
                (a.name || "").toLowerCase().includes(t) ||
                (a.accountNumber || "").toLowerCase().includes(t) ||
                (a.site || "").toLowerCase().includes(t)
              );
            });

            const itemsPerPage = 8;
            const totalPages = Math.ceil(filteredArchived.length / itemsPerPage);
            const indexOfLast = archivePage * itemsPerPage;
            const indexOfFirst = indexOfLast - itemsPerPage;
            const currentArchived = filteredArchived.slice(indexOfFirst, indexOfLast);


            return (
              <>
                <div className="overflow-auto max-h-96">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="text-left">
                        <th className="p-2">Account #</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Site</th>
                        <th className="p-2">Archived At</th>
                        <th className="p-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentArchived.map((a) => (
                        <tr key={a.id} className="border-t">
                          <td className="p-2">{(a as any).accountNumber || "-"}</td>
                          <td className="p-2">{a.name}</td>
                          <td className="p-2">{(a as any).site || "-"}</td>
                          <td className="p-2">
                            {(a as any).archivedAt
                              ? new Date((a as any).archivedAt).toLocaleString()
                              : "-"}
                          </td>
                            <td className="p-2 text-right space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRestoreArchived(a)}
                                disabled={isSubmitting || restoringId === a.id}
                              >
                                {restoringId === a.id ? "Restoring..." : "Restore"}
                              </Button>
                              <Button
                                size="sm"
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => handlePermanentlyDeleteArchived(a)}
                                disabled={isSubmitting || deletingArchivedId === a.id}
                              >
                                {deletingArchivedId === a.id ? "Deleting..." : "Delete"}
                              </Button>
                            </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {filteredArchived.length > itemsPerPage && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-500">
                      Showing {indexOfFirst + 1} to{" "}
                      {Math.min(indexOfLast, filteredArchived.length)} of{" "}
                      {filteredArchived.length} archived customers
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setArchivePage(archivePage - 1)}
                        disabled={archivePage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      {Array.from({ length: totalPages }, (_, i) => (
                        <Button
                          key={i + 1}
                          variant={archivePage === i + 1 ? "default" : "outline"}
                          size="sm"
                          onClick={() => setArchivePage(i + 1)}
                        >
                          {i + 1}
                        </Button>
                      ))}

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setArchivePage(archivePage + 1)}
                        disabled={archivePage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>

                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}
    </DialogContent>
  </Dialog>
)}



      
<div className="border rounded-md">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Account #</TableHead>
        <TableHead>Name</TableHead>
        <TableHead>Email/Phone</TableHead>
        <TableHead>Block & Lot</TableHead>
        <TableHead>SCF Amount</TableHead>

        <TableHead>Status</TableHead>
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
            <TableCell>
              {customer.email && customer.phone
                ? `${customer.email} / ${customer.phone}`
                : customer.email || customer.phone || "-"}
            </TableCell>
            <TableCell>
              Block {customer.block} Lot {customer.lot}
            </TableCell>
            <TableCell>
              {typeof customer.scfAmount === "number"
                ? `₱${customer.scfAmount}`
                : "₱0"}
            </TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={getStatusBadgeColor(customer.status)}
              >
                {customer.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setScfCustomer(customer)}>
                    <AlertCircle className="mr-2 h-4 w-4" />
                    SCF
                  </DropdownMenuItem>
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
          <TableCell colSpan={6} className="text-center py-6 text-gray-500">
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
      <ScfDialog />
    </div>
  );
};

export default CustomerList;