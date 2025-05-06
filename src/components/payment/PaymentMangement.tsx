import React, { useState, useEffect } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { FileSpreadsheet } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sendEmail } from "../../lib/emailService";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  X,
  Edit,
  CreditCard,
  ExternalLink,
  FileText,
  Plus,
  Loader2,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Checkbox } from "@radix-ui/react-checkbox";
import jsPDF from "jspdf";

interface PaymentMethod {
  id: string;
  type: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
  isActive: boolean;
  qrCodeUrl?: string;
}

interface PaymentVerification {
  time: string;
  site: string;
  verifiedAt: string | number | Date;
  id: string;
  customerId: string;
  customerName: string;
  billId: string;
  amount: number;
  referenceNumber: string;
  paymentDate: string;
  paymentMethod: string;
  status: "pending" | "verified" | "rejected";
  notes?: string;
  submissionDateTime?: string;
  accountNumber?: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  accountNumber: string;
  amountDue: number;
  phone: string;
  site: string;
  isSenior: boolean;
  meterNumber: string;
}

// Add this type definition for your payment history items
interface PaymentHistoryItem {
  customerName: string;
  accountNumber: string;
  amount: string | number;
  paymentDate: string;
  referenceNumber: string;
  paymentMethod: string;
  site: string;
  time?: string; // Optional time field
}
// Utility function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
};

interface Bill {
  id?: string;
  customerId: string;
  date: string;
  amount: number;         // This is the current (remaining) amount due
  originalAmount: number; // This holds the original bill amount
  status: "pending" | "paid" | "overdue";
  dueDate: string;
  description?: string;
  waterUsage?: number;
  billingPeriod?: string;
  meterReading?: {
    current: number;
    previous: number;
    consumption: number;
  };
  accountNumber?: string;
  meterNumber?: string;
  waterCharge?: number;
  waterChargeBeforeTax?: number;
  tax?: number;
  seniorDiscount: number;
  penalty?: number;
  amountAfterDue?: number;
  currentAmountDue?: number;
  billNumber?: string;
}


const PaymentManagement = () => {
  const [activeTab, setActiveTab] = useState("payment-methods");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<PaymentVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [isAddMethodDialogOpen, setIsAddMethodDialogOpen] = useState(false);
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState<PaymentVerification | null>(null);
  const [isBillDialogOpen, setBillDialogOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Payment Method form states
  const [methodType, setMethodType] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [instructions, setInstructions] = useState("");
  const [qrImage, setQrImage] = useState<File | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string>("");

  // Verification form states
  const [verificationStatus, setVerificationStatus] = useState<"verified" | "rejected">("verified");
  const [verificationNotes, setVerificationNotes] = useState("");

  // Bill creation form states
  const [billAmount, setBillAmount] = useState("");
  const [billDueDate, setBillDueDate] = useState("");
  const [billDescription, setBillDescription] = useState("Monthly water bill");
  const [billingPeriod, setBillingPeriod] = useState("");
  const [currentReading, setCurrentReading] = useState("");
  const [previousReading, setPreviousReading] = useState("");
  const [waterUsage, setWaterUsage] = useState("");
  const [billAccountNumber, setBillAccountNumber] = useState("");
  const [meterNumber, setMeterNumber] = useState("");
  // Water charge (pre-tax only)
  const [waterCharge, setWaterCharge] = useState("");
  // We still store tax in code but won't display in the UI
  const [taxAmount, setTaxAmount] = useState("");
  const [seniorDiscount, setSeniorDiscount] = useState("0.00");
  const [isSenior, setIsSenior] = useState(false);
  const [penaltyAmount, setPenaltyAmount] = useState("");
  // New "Amount (₱)" near "Amount After Due"
  const [immediateAmount, setImmediateAmount] = useState("");
  const [amountAfterDue, setAmountAfterDue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [billingSearchTerm, setBillingSearchTerm] = useState("");
  const [billingFilterSite, setBillingFilterSite] = useState("all");
  const [billingFilterSenior, setBillingFilterSenior] = useState(false);
  const [billingShowFilters, setBillingShowFilters] = useState(false);
  const [printMonth, setPrintMonth] = useState("");
  const [printYear, setPrintYear] = useState("");
  const [printSite, setPrintSite] = useState("all");
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [filterMonth, setFilterMonth] = useState<string>("all");
const [filterYear, setFilterYear] = useState<string>("all");
  const formatDateTime = (dateTimeString: string) => {
    if (!dateTimeString) return "N/A";
    const dateTimeParts = dateTimeString.split(" ");
    if (dateTimeParts.length !== 2) return "Invalid Date";
    const [datePart, timePart] = dateTimeParts;
    const dateParts = datePart.split("/");
    if (dateParts.length !== 3) return "Invalid Date";
    const [day, month, year] = dateParts.map(Number);
    if (!day || !month || !year) return "Invalid Date";
    const formattedDate = new Date(year, month - 1, day);
    const timePartsArr = timePart.split(":").map(Number);
    if (timePartsArr.length === 3) {
      formattedDate.setHours(timePartsArr[0], timePartsArr[1], timePartsArr[2]);
    }
    return formattedDate.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const formatSubmissionDateTime = (date: Date) => {
    // Format as "dd/mm/yyyy hh:mm:ss"
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
  
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const dateParts = dateString.split("/");
    if (dateParts.length !== 3) return "Invalid Date";
    const [day, month, year] = dateParts.map(Number);
    if (!day || !month || !year) return "Invalid Date";
    const formattedDate = new Date(year, month - 1, day);
    return formattedDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  const formatPaymentDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const generateReferenceNumber = () => {
    const timestamp = Date.now().toString(36); // Convert current timestamp to base-36
    const randomString = Math.random().toString(36).substring(2, 8).toUpperCase(); // Generate a random string
    return `${timestamp}-${randomString}`; // Combine timestamp and random string
  };

const [isCreateReceiptDialogOpen, setIsCreateReceiptDialogOpen] = useState(false);
const [formData, setFormData] = useState({
  accountNumber: "",
  amount: "",
  customerName: "",
  paymentDate: formatPaymentDate(new Date()), // Default to today's date
  paymentMethod: "Cash",
  referenceNumber: generateReferenceNumber(), // Generate a unique reference number
  status: "pending",
  submissionDateTime: formatSubmissionDateTime(new Date()), // Format as "dd/mm/yyyy hh:mm:ss"
});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateReceipt = async () => {
    setIsProcessing(true);
    try {
      const { collection, addDoc } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");

      await addDoc(collection(db, "paymentVerifications"), formData);
      alert("Cash receipt created successfully!");
      setIsCreateReceiptDialogOpen(false);
    } catch (error) {
      console.error("Error creating cash receipt:", error);
      alert("Failed to create cash receipt. Please try again.");
    } finally {
      setIsProcessing(false); // Reset processing state
    }
  };
// Add these state variables near your other state declarations:
const [currentPage, setCurrentPage] = useState(1);
// Removed duplicate declaration of itemsPerPage

const filteredBillingCustomers = customers.filter((customer) => {
  const searchLower = billingSearchTerm.toLowerCase();
  const matchesSearch =
    customer.name.toLowerCase().includes(searchLower) ||
    (customer.email && customer.email.toLowerCase().includes(searchLower)) ||
    customer.accountNumber.toLowerCase().includes(searchLower) ||
    (customer.phone && customer.phone.toLowerCase().includes(searchLower));

  const matchesSite = billingFilterSite === "all" || customer.site === billingFilterSite;
  const matchesSenior = !billingFilterSenior || customer.isSenior === true;

  return matchesSearch && matchesSite && matchesSenior;
});

// Compute pagination values
// Removed duplicate declaration of indexOfLastItem

const [paymentHistory, setPaymentHistory] = useState<PaymentVerification[]>([]);
const [filteredHistory, setFilteredHistory] = useState<PaymentVerification[]>([]);
const [searchTerm, setSearchTerm] = useState("");
const [filterSite, setFilterSite] = useState("all");
const [filterDate, setFilterDate] = useState("");
const itemsPerPage = 10; // Number of items per page

useEffect(() => {
  const fetchPaymentHistory = async () => {
    try {
      const { collection, query, where, getDocs, orderBy } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");

      const paymentVerificationsCollection = collection(db, "paymentVerifications");
      const customersCollection = collection(db, "customers");

      const verifiedPaymentsQuery = query(
        paymentVerificationsCollection,
        where("status", "==", "verified"),
        orderBy("verifiedAt", "desc")
      );

      const snapshot = await getDocs(verifiedPaymentsQuery);
      const payments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PaymentVerification[];

      // Fetch all customers once
      const customerSnapshot = await getDocs(customersCollection);
      const customerMap = new Map<string, Customer>();
      customerSnapshot.docs.forEach((doc) => {
        const data = doc.data() as Customer;
        customerMap.set(data.accountNumber, { ...data, id: doc.id });
      });

      // Attach the 'site' info from customer data
      const paymentsWithSite = payments.map((payment) => {
        const customer = customerMap.get(payment.accountNumber || "");
        return {
          ...payment,
          site: customer?.site || "unknown",
        };
      });

      setPaymentHistory(paymentsWithSite);
      setFilteredHistory(paymentsWithSite);
    } catch (error) {
      console.error("Error fetching payment history:", error);
    }
  };

  fetchPaymentHistory();
}, []);

// Inside your payment verification component
useEffect(() => {
  // Get URL parameters
  const searchParams = new URLSearchParams(window.location.search);
  const verificationId = searchParams.get('id');
  
  // If an ID is provided in the URL, find and select that verification
  if (verificationId && pendingVerifications.length > 0) {
    const targetVerification = pendingVerifications.find(v => v.id === verificationId);
    if (targetVerification) {
      handleOpenVerificationDialog(targetVerification);
    }
  }
}, [pendingVerifications]);

useEffect(() => {
  const searchParams = new URLSearchParams(window.location.search);
  const tab = searchParams.get("tab");
  if (tab) {
    setActiveTab(tab);
  }
}, []);

useEffect(() => {
  const filtered = paymentHistory.filter((payment) => {
    // Parse the payment date in dd/mm/yyyy format
    const [day, month, year] = payment.paymentDate.split("/").map(Number);
    const paymentDate = new Date(year, month - 1, day);

    const matchesSearch =
      payment.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.accountNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSite =
      filterSite === "all" || (payment.site || "").toLowerCase() === filterSite.toLowerCase();

    const matchesMonth =
      filterMonth === "all" || paymentDate.getMonth() + 1 === parseInt(filterMonth);

    const matchesYear =
      filterYear === "all" || paymentDate.getFullYear() === parseInt(filterYear);

    return matchesSearch && matchesSite && matchesMonth && matchesYear;
  });

  setFilteredHistory(filtered);
  setCurrentPage(1);
}, [searchTerm, filterSite, filterMonth, filterYear, paymentHistory]);



// Pagination logic
const indexOfFirstItem = (currentPage * itemsPerPage) - itemsPerPage;
const currentItems = filteredHistory.slice(indexOfFirstItem, currentPage * itemsPerPage);

const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

const handleNextPage = () => {
  if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
};

const handlePreviousPage = () => {
  if (currentPage > 1) setCurrentPage((prev) => prev - 1);
};

useEffect(() => {
  const fetchPaymentHistory = async () => {
    try {
      const { collection, query, where, getDocs, orderBy } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");

      const paymentVerificationsCollection = collection(db, "paymentVerifications");
      const customersCollection = collection(db, "customers");

      const verifiedPaymentsQuery = query(
        paymentVerificationsCollection,
        where("status", "==", "verified"),
        orderBy("verifiedAt", "desc")
      );

      const snapshot = await getDocs(verifiedPaymentsQuery);
      const payments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PaymentVerification[];

      // Fetch all customers once
      const customerSnapshot = await getDocs(customersCollection);
      const customerMap = new Map<string, Customer>();
      customerSnapshot.docs.forEach((doc) => {
        const data = doc.data() as Customer;
        customerMap.set(data.accountNumber, { ...data, id: doc.id });
      });

      // Attach the 'site' info from customer data
      const paymentsWithSite = payments.map((payment) => {
        const customer = customerMap.get(payment.accountNumber || "");
        return {
          ...payment,
          site: customer?.site || "unknown",
        };
      });

      setPaymentHistory(paymentsWithSite);
      setFilteredHistory(paymentsWithSite);
    } catch (error) {
      console.error("Error fetching payment history:", error);
    }
  };

  fetchPaymentHistory();
}, []);


  useEffect(() => {
    const fetchPaymentData = async () => {
      await initializeFirestoreCollections();
      const unsubscribeFetchCustomers = await fetchCustomers();

      try {
        const { collection, query, where, onSnapshot } = await import("firebase/firestore");
        const { db } = await import("../../lib/firebase");

        // Payment methods realtime subscription
        const methodsCollection = collection(db, "paymentMethods");
        const unsubscribeMethods = onSnapshot(methodsCollection, (methodsSnapshot) => {
          const methodsList = methodsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as PaymentMethod[];
          setPaymentMethods(
            methodsList.length > 0
              ? methodsList
              : [
                  {
                    id: "method-1",
                    type: "GCash",
                    accountName: "Water Billing Company",
                    accountNumber: "09123456789",
                    instructions: "Please include your account number in the reference field when making a payment.",
                    isActive: true,
                  },
                  {
                    id: "method-2",
                    type: "Bank Transfer",
                    accountName: "Water Billing Company Inc.",
                    accountNumber: "1234-5678-9012-3456",
                    instructions: "Please send a screenshot of your transfer receipt to our email after payment.",
                    isActive: true,
                  },
                ]
          );
        });

        // Pending verifications realtime subscription
        const verificationsCollection = collection(db, "paymentVerifications");
        const verificationsQuery = query(verificationsCollection, where("status", "==", "pending"));
        const unsubscribeVerifications = onSnapshot(verificationsQuery, (verificationsSnapshot) => {
          const verificationsList = verificationsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as PaymentVerification[];
          setPendingVerifications(verificationsList);
        });

        return () => {
          unsubscribeMethods();
          unsubscribeVerifications();
          if (unsubscribeFetchCustomers) unsubscribeFetchCustomers();
        };
      } catch (error) {
        console.error("Error fetching payment data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentData();
  }, []);

  const initializeFirestoreCollections = async () => {
    try {
      const { collection, getDocs, addDoc } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");

      const customersCollection = collection(db, "customers");
      const customersSnapshot = await getDocs(customersCollection);
      if (customersSnapshot.empty) {
        const defaultCustomers = [
          {
            name: "John Doe",
            email: "john.doe@example.com",
            phone: "(555) 123-4567",
            address: "123 Main St, Anytown, USA 12345",
            accountNumber: "WB-10001",
            status: "active",
            lastBillingDate: new Date().toISOString().split("T")[0],
            amountDue: 78.5,
            joinDate: "2022-05-15",
          },
          {
            name: "Jane Smith",
            email: "jane.smith@example.com",
            phone: "(555) 987-6543",
            address: "456 Oak Ave, Somewhere, USA 67890",
            accountNumber: "WB-10002",
            status: "active",
            lastBillingDate: new Date().toISOString().split("T")[0],
            amountDue: 65.75,
            joinDate: "2022-06-20",
          },
        ];

        for (const customer of defaultCustomers) {
          await addDoc(customersCollection, customer);
        }
      }
    } catch (error) {
      console.error("Error initializing Firestore collections:", error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { collection, onSnapshot } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");
      const customersCollection = collection(db, "customers");
      const updatedPaymentsCollection = collection(db, "updatedPayments");

      let customersData: Customer[] = [];
      let updatedPaymentsMap = new Map<string, number>();

      const unsubscribeCustomers = onSnapshot(customersCollection, (snapshot) => {
        customersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Customer),
          amountDue: 0,
        }));
        customersData.forEach((customer) => {
          const acct = customer.accountNumber;
          if (acct) {
            customer.amountDue = updatedPaymentsMap.get(acct) || 0;
          }
        });
        setCustomers(customersData);
      });

      const unsubscribeUpdatedPayments = onSnapshot(updatedPaymentsCollection, (snapshot) => {
        updatedPaymentsMap = new Map();
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          updatedPaymentsMap.set(doc.id, data.amount || 0);
        });
        customersData.forEach((customer) => {
          const acct = customer.accountNumber;
          if (acct) {
            customer.amountDue = updatedPaymentsMap.get(acct) || 0;
          }
        });
        setCustomers(customersData);
      });

      return () => {
        unsubscribeCustomers();
        unsubscribeUpdatedPayments();
      };
    } catch (error) {
      console.error("Error fetching customers and updated payments:", error);
    }
  };

  const handleAddMethod = async () => {
    try {
      const { collection, addDoc } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");

      let qrUrl = "";

      if (qrImage) {
        try {
          const { getStorage, ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
          const { getAuth } = await import("firebase/auth");
          const auth = getAuth();

          if (!auth.currentUser) {
            alert("You must be logged in to upload.");
            return;
          }

          const storage = getStorage(undefined, "gs://waterapp-ac2a4.firebasestorage.app");
          const fileName = `${Date.now()}_${qrImage.name.replace(/\s/g, "_")}`;
          const storageRef = ref(storage, `QRcodes/${fileName}`);

          const snapshot = await uploadBytes(storageRef, qrImage);
          qrUrl = await getDownloadURL(snapshot.ref);
        } catch (error) {
          console.error("Error uploading QR code:", error);
          alert("Error uploading QR Code. Please check Firebase Storage settings.");
        }
      }

      const newMethod = {
        type: methodType,
        accountName,
        accountNumber,
        instructions,
        isActive: true,
        qrCodeUrl: qrUrl || "",
      };

      const { doc: docRef } = await import("firebase/firestore");
      const docRefFn = await addDoc(collection(db, "paymentMethods"), newMethod);
      const addedMethod: PaymentMethod = {
        id: docRefFn.id,
        ...newMethod,
      };

      setPaymentMethods([...paymentMethods, addedMethod]);

      alert("Payment method added successfully!");
      setIsAddMethodDialogOpen(false);
    } catch (error) {
      console.error("Error adding payment method:", error);
      alert("Error adding payment method. Please try again.");
    }
  };

  const handleEditMethod = (method: PaymentMethod) => {
    setEditingMethod(method);
    setMethodType(method.type);
    setAccountName(method.accountName);
    setAccountNumber(method.accountNumber);
    setInstructions(method.instructions);
    setIsAddMethodDialogOpen(true);
  };

  const handleQrImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setQrImage(e.target.files[0]);
    }
  };

  const handleUpdateMethod = async () => {
    if (!editingMethod) return;

    try {
      let qrUrl = editingMethod.qrCodeUrl || "";

      if (qrImage) {
        try {
          const { getStorage, ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
          const { getAuth } = await import("firebase/auth");
          const auth = getAuth();

          if (!auth.currentUser) {
            alert("You must be logged in to upload.");
            return;
          }

          const storage = getStorage(undefined, "gs://waterapp-ac2a4.firebasestorage.app");
          const fileName = `${Date.now()}_${qrImage.name.replace(/\s/g, "_")}`;
          const storageRef = ref(storage, `QRcodes/${fileName}`);

          const snapshot = await uploadBytes(storageRef, qrImage);
          qrUrl = await getDownloadURL(snapshot.ref);
        } catch (error) {
          console.error("Error uploading QR code:", error);
          alert("Error uploading QR Code. Please check Firebase Storage settings.");
        }
      }

      const updatedMethod = {
        type: methodType,
        accountName,
        accountNumber,
        instructions,
        qrCodeUrl: qrUrl,
      };

      const { doc, updateDoc } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");

      await updateDoc(doc(db, "paymentMethods", editingMethod.id), updatedMethod);

      setPaymentMethods(
        paymentMethods.map((m) =>
          m.id === editingMethod.id ? { ...m, ...updatedMethod } : m
        )
      );

      setEditingMethod(null);
      setMethodType("");
      setAccountName("");
      setAccountNumber("");
      setInstructions("");
      setIsAddMethodDialogOpen(false);
    } catch (error) {
      console.error("Error updating payment method:", error);
    }
  };

  const handleToggleMethodStatus = async (method: PaymentMethod) => {
    try {
      const updatedMethod = { ...method, isActive: !method.isActive };

      try {
        const { doc, updateDoc } = await import("firebase/firestore");
        const { db } = await import("../../lib/firebase");

        await updateDoc(doc(db, "paymentMethods", method.id), {
          isActive: !method.isActive,
        });
      } catch (firestoreError) {
        console.error("Firestore toggle error:", firestoreError);
      }

      setPaymentMethods(
        paymentMethods.map((m) => (m.id === method.id ? updatedMethod : m))
      );
    } catch (error) {
      console.error("Error toggling payment method status:", error);
    }
  };

  const handleOpenVerificationDialog = (verification: PaymentVerification) => {
    setSelectedVerification(verification);
    setVerificationStatus("verified");
    setVerificationNotes("");
    setIsVerificationDialogOpen(true);
  };

  const sendEmailToCustomer = async (to: string, subject: string, body: string) => {
    try {
      await fetch("https://us-central1-waterapp-ac2a4.cloudfunctions.net/sendReceiptEmail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to, subject, body }),
      });
      console.log(`✅ Email sent to ${to}`);
    } catch (error) {
      console.error("❌ Failed to send email:", error);
    }
  };






  const handleVerifyPayment = async () => {
    // Disable the button immediately
    setIsProcessing(true);
  
    try {
      if (!selectedVerification) {
        console.error("❌ Error: No selected verification.");
        alert("No verification selected. Please choose a payment to verify.");
        setIsProcessing(false);
        return;
      }
  
      const {
        doc,
        updateDoc,
        getDoc,
        deleteDoc,
        collection,
        getDocs,
        where,
        query,
        addDoc,
        orderBy,
        limit
      } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");
  
      console.log("🔄 Processing payment verification:", selectedVerification);
  
      // Determine account number and customerId
      let { accountNumber, customerId } = selectedVerification;
      if (!accountNumber && customerId) {
        const customerRef = doc(db, "customers", customerId);
        const customerSnap = await getDoc(customerRef);
        if (customerSnap.exists()) {
          accountNumber = customerSnap.data().accountNumber;
          console.log(`✅ Retrieved accountNumber: ${accountNumber}`);
        }
      }
  
      // Check if accountNumber is valid
      if (!accountNumber) {
        console.error("❌ Error: No account number found.");
        alert("No account number found. Please check the verification details.");
        setIsProcessing(false);
        return;
      }
  
      // Check if the customer exists with the given account number
      const customersCollection = collection(db, "customers");
      const customerQuery = query(
        customersCollection,
        where("accountNumber", "==", accountNumber)
      );
      const customerSnapshot = await getDocs(customerQuery);
      if (customerSnapshot.empty) {
        console.error(`❌ No customer found with accountNumber: ${accountNumber}`);
        // Reject the verification if the account number is wrong
        await deleteDoc(doc(db, "paymentVerifications", selectedVerification.id));
        alert(
          "No customer found with the provided account number. Payment verification has been rejected."
        );
        setSelectedVerification(null);
        setVerificationStatus("rejected");
        setVerificationNotes("");
        setIsVerificationDialogOpen(false);
        setIsProcessing(false);
        return;
      }
  
      // If customer is found, retrieve customerId
      const customerDoc = customerSnapshot.docs[0];
      customerId = customerDoc.id;
      console.log(`✅ Found customerId: ${customerId} for accountNumber: ${accountNumber}`);
  
      // Compute paymentAmount early so it can be used in the duplicate check notification.
      const paymentAmount =
        typeof selectedVerification.amount === "string"
          ? parseFloat(selectedVerification.amount)
          : selectedVerification.amount;
      if (isNaN(paymentAmount)) {
        console.error("❌ Error: Invalid payment amount.");
        alert("Invalid payment amount. Please check the payment details.");
        setIsProcessing(false);
        return;
      }
  
      // Check for duplicate payment verification with the same reference number that is already verified.
      const paymentVerificationsCollection = collection(db, "paymentVerifications");
      const referenceQuery = query(
        paymentVerificationsCollection,
        where("referenceNumber", "==", selectedVerification.referenceNumber)
      );
      const refVerificationSnap = await getDocs(referenceQuery);
  
      let alreadyVerified = false;
      refVerificationSnap.forEach((docSnap) => {
        // Skip the current verification document.
        if (docSnap.id !== selectedVerification.id) {
          const data = docSnap.data();
          if (data.status === "verified") {
            alreadyVerified = true;
          }
        }
      });
  
      if (alreadyVerified) {
        // Delete the current verification doc and create a rejected notification.
        await deleteDoc(doc(db, "paymentVerifications", selectedVerification.id));
        console.log("❌ Payment verification deleted due to duplicate verified reference.");
  
        await addDoc(
          collection(db, "notifications", accountNumber, "records"),
          {
            type: "payment",
            verificationId: selectedVerification.id,
            accountNumber: accountNumber,
            customerId: customerId,
            status: "rejected",
            paymentAmount: paymentAmount,
            description: `Payment verification rejected because reference number ${selectedVerification.referenceNumber} is already verified.`,
            createdAt: formatNotificationTimestamp(),
          }
        );
  
        alert("Payment verification rejected because this reference number has already been verified.");
        setSelectedVerification(null);
        setVerificationStatus("rejected");
        setVerificationNotes("");
        setIsVerificationDialogOpen(false);
        setIsProcessing(false);
        return;
      }
  
      // If verification is rejected (via admin action), handle that case.
      if (verificationStatus === "rejected") {
        // Delete the verification document since it is rejected
        await deleteDoc(doc(db, "paymentVerifications", selectedVerification.id));
        console.log("❌ Payment verification deleted (rejected).");
  
        // Create a notification with the appropriate status and description
        await addDoc(
          collection(db, "notifications", accountNumber, "records"),
          {
            type: "payment",
            verificationId: selectedVerification.id,
            customerId: customerId,
            accountNumber: accountNumber,
            status: "rejected",
            paymentAmount: paymentAmount,
            description: "Your payment verification has been rejected.",
            createdAt: formatNotificationTimestamp(),
          }
        );
  
        alert("Payment has been rejected and notification created.");
        setSelectedVerification(null);
        // Reset verification status back to a default value if needed
        setVerificationStatus("verified");
        setVerificationNotes("");
        setIsVerificationDialogOpen(false);
        setIsProcessing(false);
        return;
      }
  
      // Process verified payment.
      // Update updatedPayments document.
      const updatedPaymentsRef = doc(db, "updatedPayments", accountNumber);
      const updatedPaymentsSnap = await getDoc(updatedPaymentsRef);
      if (!updatedPaymentsSnap.exists()) {
        console.error(`❌ Error: No updatedPayments record found for account ${accountNumber}.`);
        alert(`No payment record found for account ${accountNumber}.`);
        setIsProcessing(false);
        return;
      }
      const updatedPaymentsData = updatedPaymentsSnap.data();
      const prevPaymentsAmount = parseFloat(updatedPaymentsData?.amount ?? 0);
      const newUpdatedAmount = Math.max(0, prevPaymentsAmount - paymentAmount);
  
      // Update both the amount and the customerId.
      await updateDoc(updatedPaymentsRef, { amount: newUpdatedAmount, customerId: customerId });
      console.log(`✅ updatedPayments updated for account ${accountNumber}: amount = ${newUpdatedAmount}`);
  
      // Process pending bills in the bills collection.
      const billsCollectionRef = collection(db, "bills", accountNumber, "records");
      
      // Get all bills sorted by billNumber in ascending order (oldest first)
      const billsQueryOrderedByNumber = query(
        billsCollectionRef,
        orderBy("billNumber", "asc")
      );
      
      const billsSnap = await getDocs(billsQueryOrderedByNumber);
      
      // Extract bills with positive amounts (unpaid bills)
      const pendingBills = billsSnap.docs
        .filter(doc => doc.data().amount > 0)
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ref: doc.ref,
            billNumber: data.billNumber || "",
            amount: data.amount || 0,
            currentAmountDue: data.currentAmountDue || 0,
            dueDate: data.dueDate,
            overPayment: data.overPayment || 0,
            penaltyApplied: data.penaltyApplied || false,
            originalAmount: data.originalAmount || 0,
            status: data.status || "pending"
          };
        });
  
      // Save the original payment amount for later calculation.
      let remainingPayment = paymentAmount;
      let currentBillPaid = null; // Track which bill was just paid (for overpayment)
  
      // Process each pending bill in order of billNumber (oldest first).
      for (const bill of pendingBills) {
        if (remainingPayment <= 0) break;
  
        // Check if penalty should be applied
        let billAmount = bill.amount;
        let penaltyApplied = bill.penaltyApplied || false;
        
        // Apply penalty if needed (due date passed and not yet applied)
        if (billAmount > 0 && !penaltyApplied) {
          // Parse the due date correctly
          let dueDate;
          
          if (bill.dueDate && typeof bill.dueDate === 'string') {
            if (bill.dueDate.includes('/')) {
              const [day, month, year] = bill.dueDate.split('/');
              dueDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            } 
            else if (bill.dueDate.includes('-')) {
              dueDate = new Date(bill.dueDate);
            }
            else {
              dueDate = new Date(bill.dueDate);
            }
          } else {
            dueDate = new Date(bill.dueDate);
          }
          
          const currentDate = new Date();
          
          console.log(`Checking bill ${bill.billNumber}: Due date ${dueDate.toISOString()}, Current date ${currentDate.toISOString()}`);
          
          if (dueDate < currentDate) {
            // Apply 10% penalty to the bill amount
            const penaltyAmount = billAmount * 0.1;
            billAmount += penaltyAmount;
            penaltyApplied = true;
            
            console.log(`✅ Applied penalty of ${penaltyAmount.toFixed(2)} to bill ${bill.billNumber}. New amount: ${billAmount.toFixed(2)}`);
            
            // Update the bill with the new amount and penaltyApplied status
            await updateDoc(bill.ref, {
              amount: billAmount,
              currentAmountDue: billAmount,
              penaltyApplied: true
            });
          }
        }
        
        // Process payment for this bill
        if (remainingPayment >= billAmount) {
          // Full payment
          await updateDoc(bill.ref, {
            amount: 0,
            currentAmountDue: 0,
            paidAt: new Date().toISOString(),
            penaltyApplied: penaltyApplied,
            status: "paid"
          });
          
          remainingPayment -= billAmount;
          currentBillPaid = bill; // Track this bill for potential overpayment
          
          console.log(`✅ Bill ${bill.billNumber} fully paid. Remaining payment: ${remainingPayment.toFixed(2)}`);
        } else {
          // Partial payment
          const newRemaining = billAmount - remainingPayment;
          await updateDoc(bill.ref, {
            amount: newRemaining,
            currentAmountDue: newRemaining,
            penaltyApplied: penaltyApplied,
            status: newRemaining < bill.originalAmount ? "partially paid" : "pending"
          });
          
          console.log(`✅ Bill ${bill.billNumber} partially paid. Remaining bill amount: ${newRemaining.toFixed(2)}`);
          remainingPayment = 0;
        }
      }
  
      // Handle overpayment: apply to the last bill that was fully paid
      if (remainingPayment > 0 && currentBillPaid) {
        // Record overpayment on the bill that was just paid
        await updateDoc(currentBillPaid.ref, {
          overPayment: remainingPayment,
          status: "paid" // Ensure status is marked as paid
        });
        
        console.log(`✅ Overpayment of ${remainingPayment.toFixed(2)} recorded on bill ${currentBillPaid.billNumber}`);
        
        // Send a notification about the overpayment
        await addDoc(collection(db, "notifications", accountNumber, "records"), {
          type: "payment",
          verificationId: selectedVerification.id,
          customerId: customerId,
          accountNumber: accountNumber,
          status: "overpayment",
          paymentAmount: remainingPayment,
          description: `An overpayment of ₱${remainingPayment.toFixed(2)} has been recorded for your account. The amount will be applied to future bills.`,
          createdAt: formatNotificationTimestamp(),
        });
      }
  
      // Update the payment verification document as verified.
      await updateDoc(doc(db, "paymentVerifications", selectedVerification.id), {
        status: "verified",
        verifiedAt: new Date().toISOString(),
      });
      console.log(`✅ Payment verified for customer ${customerId}`);
  
      // Send email receipt.
      const customerRef = doc(db, "customers", customerId);
      const customerSnap = await getDoc(customerRef);
      if (!customerSnap.exists()) {
        console.error(`❌ Error: Customer with ID ${customerId} not found.`);
        setIsProcessing(false);
        return;
      }
      const customerData = customerSnap.data();
      const customerEmail = customerData.email;
      if (customerEmail) {
        console.log(`📧 Sending receipt to ${customerEmail}...`);
        await sendEmailToCustomer(
          customerEmail,
          "Payment Receipt - Centennial Water",
          `<h2>Payment Receipt</h2>
           <p>Dear ${customerData.name},</p>
           <p>Thank you for your payment of <strong>₱${paymentAmount.toFixed(2)}</strong> for your water bill.</p>
           <p><strong>Reference Number:</strong> ${selectedVerification.referenceNumber}</p>
           <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString("en-GB")}</p>
           <p><strong>Remaining Balance:</strong> ₱${newUpdatedAmount.toFixed(2)}</p>
           ${remainingPayment > 0 ? `<p><strong>Overpayment:</strong> ₱${remainingPayment.toFixed(2)}</p>` : ''}
           <p>If you have any questions, feel free to contact us.</p>
           <br>
           <p>Best regards,</p>
           <p>Centennial Water Billing</p>`
        );
        console.log(`✅ Receipt sent to ${customerEmail}`);
      } else {
        console.warn("⚠️ No email found for customer.");
      }
  
      alert(`✅ Payment of ₱${paymentAmount.toFixed(2)} verified successfully.`);
      await addDoc(
        collection(db, "notifications", accountNumber, "records"),
        {
          type: "payment",
          verificationId: selectedVerification.id,
          customerId: customerId,
          accountNumber: accountNumber,
          status: "verified",
          paymentAmount: paymentAmount,
          description: `Your payment verification has been successfully verified. Payment Amount: ₱${paymentAmount.toFixed(2)}.`,
          createdAt: formatNotificationTimestamp(),
        }
      );
  
      // Remove disconnection notice if less than 3 unpaid bills remain
      const unpaidBillsQuery = query(
        collection(db, "bills", accountNumber, "records"),
        where("amount", ">", 0)
      );
      const unpaidBillsSnapshot = await getDocs(unpaidBillsQuery);
  
      if (unpaidBillsSnapshot.size < 3) {
        const noticeQuery = query(
          collection(db, "notice"),
          where("accountNumber", "==", accountNumber)
        );
        const noticeSnapshot = await getDocs(noticeQuery);
        for (const docSnap of noticeSnapshot.docs) {
          await deleteDoc(doc(db, "notice", docSnap.id));
          console.log(`🗑️ Deleted disconnection notice: ${docSnap.id}`);
        }
      }
  
      // Reset state and close the dialog.
      setSelectedVerification(null);
      setVerificationStatus("verified");
      setVerificationNotes("");
      setIsVerificationDialogOpen(false);
    } catch (error) {
      console.error("❌ Error verifying payment:", error);
      alert("An error occurred while verifying the payment. Please try again.");
    } finally {
      // Always re-enable the button, regardless of success or failure
      setIsProcessing(false);
    }
  };
  


  const handlePrintReceipts = (month: string, year: string, site: string) => {
    const filtered = paymentHistory.filter((payment) => {
      const [day, mon, yr] = payment.paymentDate.split("/");
      const matchesMonth = mon === month;
      const matchesYear = yr === year;
      const matchesSite = site === "all" || payment.site === site;
      return matchesMonth && matchesYear && matchesSite;
    });
  
    if (filtered.length === 0) {
      alert("No receipts found for the selected filters.");
      return;
    }
  
    // Create a new jsPDF instance
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [100, 180] // Custom size to match mobile receipt
    });
  
    // Load image - we'll need to add it for each receipt
    const img = new Image();
    img.src = "src/assets/logo.png";
    
    // Process and add receipts after image is loaded
    img.onload = () => {
      filtered.forEach((payment, index) => {
        if (index !== 0) doc.addPage();
        
        // Add background color (light blue header)
        doc.setFillColor(62, 84, 172); // Adjust color to match the screenshot
        doc.rect(0, 0, 100, 35, 'F');
        
        // Add logo - scale appropriately
        const logoWidth = 10;
        const aspectRatio = img.height / img.width;
        const logoHeight = logoWidth * aspectRatio;
        doc.addImage(img, 'PNG', 10, 10, logoWidth, logoHeight);
        
        // Add header text
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("CENTENNIAL WATER RESOURCE", 25, 15);
        doc.text("VENTURE CORPORATION", 25, 20);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("Official Payment Receipt", 25, 25);
        
        // Add verification badge
        doc.setFillColor(76, 175, 80); // Green color for verified badge
        doc.roundedRect(65, 30, 25, 7, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("VERIFIED", 77.5, 35, { align: "center" });
        
        // Reset text color for remaining content
        doc.setTextColor(0, 0, 0);
        
        // Reference number
        doc.setFillColor(240, 240, 250); // Light background
        doc.rect(0, 40, 100, 10, 'F');
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("Reference #:", 10, 46);
        doc.setFont("helvetica", "bold");
        doc.text(payment.referenceNumber || "N/A", 30, 46);
        
        // Add timestamp on right side
        // Extract time from verifiedAt or use default
        const verifiedAt = payment.verifiedAt ? new Date(payment.verifiedAt).toLocaleString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }) : "N/A";

        doc.setFont("helvetica", "normal");
        doc.text(`${verifiedAt}`, 90, 46, { align: "right" });
        
        // Customer Information section
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(62, 84, 172); // Blue color for section headers
        doc.text("CUSTOMER INFORMATION", 10, 58);
        doc.setTextColor(0, 0, 0);
        
        // Customer details
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text("Customer Name:", 10, 65);
        doc.text(payment.customerName || "N/A", 50, 65);
        
        doc.text("Account Number:", 10, 72);
        doc.text(payment.accountNumber || "N/A", 50, 72);
        
        // Payment Details section
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(62, 84, 172); // Blue color for section headers
        doc.text("PAYMENT DETAILS", 10, 85);
        doc.setTextColor(0, 0, 0);
        
        // Payment details
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text("Payment Date:", 10, 92);
        doc.text(payment.paymentDate || "N/A", 50, 92);
        
        doc.text("Payment Method:", 10, 99);
        doc.text(payment.paymentMethod || "N/A", 50, 99);
        
        // Amount paid section
        doc.setFillColor(240, 240, 250); // Light background
        doc.rect(0, 110, 100, 30, 'F');
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(62, 84, 172); // Blue color for section headers
        doc.text("AMOUNT PAID", 50, 120, { align: "center" });
        
        // Currency and amount
        doc.setFont("helvetica", "bold");
        doc.setTextColor(62, 84, 172); // Blue color for the amount
        doc.setFontSize(18);
        doc.text(`Php ${formatCurrency(typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount)}`, 50, 130, { align: "center" });        
        
        // Thank you note
        doc.setTextColor(100, 100, 100); // Gray color for thank you
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.text("Thank you for your payment!", 50, 145, { align: "center" });
        
        // Contact information
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text("For inquiries, please contact:", 50, 152, { align: "center" });
        doc.text("centennialwaterresourceventure@gmail.com", 50, 157, { align: "center" });
      });
      
      // Save the PDF
      doc.save(`Receipts_${month}_${year}_${site}.pdf`);
    };
    
  }
  
  
  



  
// Add this helper function (inside PaymentManagement component or at a common location)
const formatNotificationTimestamp = () => {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Singapore", // This ensures UTC+8 time
    year: "numeric",
    month: "long",  
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true,
  };
  // Append " UTC+8" manually to the formatted string
  return new Date().toLocaleString("en-US", options) + " UTC+8";
};








// Format currency helper
const formatCurrency = (value) => {
  return (parseFloat(value) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const handleExportPaymentHistory = async () => {
  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  
  // Set document properties
  workbook.creator = "Centennial Water Resource";
  workbook.lastModifiedBy = "Water Billing System";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;
  
  // Custom properties
  workbook.creator = "Water Billing System";
  workbook.created = new Date();
  workbook.modified = new Date();
  
  // Color definitions (water themed)
  const colors = {
    darkBlue: { argb: 'FF0070C0' },      // Primary blue
    mediumBlue: { argb: 'FF1E88E5' },    // Medium blue
    lightBlue: { argb: 'FFB3E0FF' },     // Light blue
    paleBlue: { argb: 'FFE1F5FE' },      // Very light blue
    white: { argb: 'FFFFFFFF' },         // White
    gray: { argb: 'FFF5F5F5' }           // Light gray
  };
  
  // Add the main worksheet
  const sheet = workbook.addWorksheet('Payment Records', {
    properties: { tabColor: { argb: 'FF0070C0' } }
  });
  
  // ========== TITLE SECTION ==========
  
  // Add company header row (Row 1)
  sheet.mergeCells('A1:G1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = "CENTENNIAL WATER RESOURCE VENTURE CORPORATION";
  titleCell.font = {
    name: 'Arial',
    size: 16,
    bold: true,
    color: colors.darkBlue
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: colors.white
  };
  sheet.getRow(1).height = 30;
  
  // Add report name row (Row 2)
  sheet.mergeCells('A2:G2');
  const reportCell = sheet.getCell('A2');
  reportCell.value = "Water Billing Payment History Report";
  reportCell.font = {
    name: 'Arial',
    size: 12,
    bold: true,
    color: colors.darkBlue
  };
  reportCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 24;
  
  // Add date row (Row 3)
  sheet.mergeCells('A3:G3');
  const dateCell = sheet.getCell('A3');
  dateCell.value = `Report Generated: ${new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  })}`;
  dateCell.font = {
    name: 'Arial',
    size: 10,
    italic: true,
    color: { argb: 'FF666666' }
  };
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
  
  // Add filters information row (Row 4)
  sheet.mergeCells('A4:G4');
  const filterCell = sheet.getCell('A4');
  
  // Get filter information
  const siteFilter = filterSite !== 'all' ? `Site: ${filterSite}` : 'All Sites';
  const monthFilter = filterMonth !== 'all' 
    ? `Month: ${new Date(0, parseInt(filterMonth) - 1).toLocaleString('en-US', { month: 'long' })}` 
    : 'All Months';
  const yearFilter = filterYear !== 'all' ? `Year: ${filterYear}` : 'All Years';
  
  filterCell.value = `Filters Applied: ${siteFilter} | ${monthFilter} | ${yearFilter}`;
  filterCell.font = {
    name: 'Arial',
    size: 10,
    italic: true,
    color: { argb: 'FF666666' }
  };
  filterCell.alignment = { horizontal: 'center', vertical: 'middle' };
  
  // Add spacing (Row 5-6)
  sheet.addRow([]);
  sheet.addRow([]);
  
  // ========== TABLE HEADER ==========
  
  // First, set column widths without adding headers
  [
    { key: 'accountNumber', width: 18 },
    { key: 'customerName', width: 25 },
    { key: 'amount', width: 15 },
    { key: 'referenceNumber', width: 24 },
    { key: 'paymentDate', width: 18 },
    { key: 'paymentMethod', width: 15 },
    { key: 'verifiedAt', width: 24 }
  ].forEach((col, index) => {
    sheet.getColumn(index + 1).width = col.width;
    sheet.getColumn(index + 1).key = col.key;
  });
  
  // Add header row (Row 7)
  const headerRow = sheet.addRow([
    "Account #", "Customer", "Amount", "Reference #", 
    "Payment Date", "Method", "Verified At"
  ]);
  
  // Style the header row
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: colors.darkBlue
    };
    cell.font = {
      name: 'Arial',
      bold: true,
      color: colors.white,
      size: 12
    };
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };
    cell.border = {
      top: { style: 'thin', color: colors.darkBlue },
      left: { style: 'thin', color: colors.darkBlue },
      bottom: { style: 'medium', color: colors.darkBlue },
      right: { style: 'thin', color: colors.darkBlue }
    };
  });
  
  // ========== DATA ROWS ==========
  
  // Collect and count verified payments
  const verifiedPayments = filteredHistory.filter(payment => payment.status === "verified");
  let totalAmount = 0;
  let totalCount = 0;
  
  // Add data rows
  verifiedPayments.forEach((payment, idx) => {
    // Calculate running total
    const paymentAmount = typeof payment.amount === 'string' ? 
      parseFloat(payment.amount) : payment.amount;
    
    totalAmount += paymentAmount;
    totalCount++;
    
    // Format payment data
    const rowData = [
      payment.accountNumber,
      payment.customerName,
      `₱${formatCurrency(paymentAmount)}`,
      payment.referenceNumber,
      formatDate(payment.paymentDate),
      payment.paymentMethod,
      payment.verifiedAt ? new Date(payment.verifiedAt).toLocaleString("en-US", {
        year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
      }) : ""
    ];
    
    const row = sheet.addRow(rowData);
    
    // Apply alternating row colors
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: idx % 2 === 0 ? 'FFF5F9FF' : 'FFFFFFFF' }
    };
    
    // Set row height
    row.height = 22;
    
    // Apply cell styling
    row.eachCell((cell, colNumber) => {
      // Apply borders to all cells
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
      };
      
      // Apply specific styling based on column
      if (colNumber === 1) { // Account Number
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colNumber === 3) { // Amount
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else if (colNumber === 4) { // Reference Number
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });
  });
  
  // ========== SUMMARY SECTION ==========
  
  // Add spacing row
  sheet.addRow([]);
  
  // Add summary header row
  const summaryHeaderRow = sheet.addRow(['PAYMENT SUMMARY']);
  sheet.mergeCells(`A${summaryHeaderRow.number}:G${summaryHeaderRow.number}`);
  const summaryHeaderCell = summaryHeaderRow.getCell(1);
  summaryHeaderCell.font = {
    name: 'Arial',
    size: 14,
    bold: true,
    color: colors.darkBlue
  };
  summaryHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summaryHeaderCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE6F2FF' }
  };
  summaryHeaderRow.height = 28;
  
  // Add transaction count row
  const countRow = sheet.addRow(['**Total Transactions:', '', totalCount.toString(), '', '', '', '']);
  countRow.font = { bold: true, size: 11 };
  countRow.height = 24;
  
  // Format cells
  countRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
  countRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
  countRow.getCell(3).font = { bold: true, size: 11 };
  
  // Add total amount row
  const amountRow = sheet.addRow([
    '**Total Amount Collected:', '', `₱${formatCurrency(totalAmount)}`, '', '', '', ''
  ]);
  amountRow.font = { bold: true, size: 12 };
  amountRow.height = 24;
  
  // Format cells  
  amountRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
  amountRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
  amountRow.getCell(3).font = { 
    bold: true, 
    size: 12,
    color: colors.darkBlue
  };
  
  // Add background to total amount row
  amountRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F2FF' }
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
    };
  });
  
  // ========== FOOTER SECTION ==========
  
  // Add spacing rows
  sheet.addRow([]);
  sheet.addRow([]);
  
  // Add footer row
  const footerRow = sheet.addRow(['Centennial Water Resource Venture Corporation - Official Payment Records']);
  sheet.mergeCells(`A${footerRow.number}:G${footerRow.number}`);
  footerRow.getCell(1).font = {
    name: 'Arial',
    size: 10,
    italic: true,
    color: colors.darkBlue
  };
  footerRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  
  // Add contact row
  const contactRow = sheet.addRow(['For inquiries: centennialwaterresourceventure@gmail.com']);
  sheet.mergeCells(`A${contactRow.number}:G${contactRow.number}`);
  contactRow.getCell(1).font = {
    name: 'Arial',
    size: 10,
    italic: true,
    color: { argb: 'FF666666' }
  };
  contactRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  
  // Add generated info row
  const generatedRow = sheet.addRow(['This report is generated automatically from the Centennial Water Billing System']);
  sheet.mergeCells(`A${generatedRow.number}:G${generatedRow.number}`);
  generatedRow.getCell(1).font = {
    name: 'Arial',
    size: 9,
    italic: true,
    color: { argb: 'FF999999' }
  };
  generatedRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  
  // ========== EXCEL SETTINGS ==========
  
  // Add filter to the table
  sheet.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number + verifiedPayments.length, column: 7 }
  };
  
  // Freeze panes at the header row
  sheet.views = [{
    state: 'frozen',
    xSplit: 0,
    ySplit: headerRow.number,
    activeCell: 'A' + (headerRow.number + 1),
    zoomScale: 100
  }];
  
  // Set print settings
  sheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printArea: `A1:G${sheet.rowCount}`,
    margins: {
      left: 0.7,
      right: 0.7,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3
    }
  };
  
  // Add page numbers in footer
  sheet.headerFooter.oddFooter = "&CPage &P of &N";
  
  // ========== EXPORT FILE ==========
  
  // Generate the file buffer
  const buffer = await workbook.xlsx.writeBuffer();
  
  // Create filename with date
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `Centennial_Water_Billing_Payment_Report_${dateStr}.xlsx`;
  
  // Save file
  saveAs(
    new Blob([buffer], { 
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
    }),
    fileName
  );
};
  return (
    <div className="w-full h-full bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-800">Payment Management</h1>
            <p className="text-gray-600 mt-1">Manage payment methods and verify customer payments</p>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(tab) => {
            setActiveTab(tab);
            const params = new URLSearchParams(window.location.search);
            params.set("tab", tab);
            window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
          }}
          className="w-full"
        >

          <TabsList className="mb-6">
            <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
            <TabsTrigger value="payment-verification">Payment Verification</TabsTrigger>
            <TabsTrigger value="payment-history">Payment History</TabsTrigger> {/* New Tab */}
          </TabsList>

          {/* Payment Methods Tab */}
          <TabsContent value="payment-methods" className="space-y-6">
            <div className="flex justify-end mb-4">
              <Dialog open={isAddMethodDialogOpen} onOpenChange={setIsAddMethodDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <CreditCard className="mr-2 h-4 w-4" />
                    {editingMethod ? "Edit Payment Method" : "Add Payment Method"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>{editingMethod ? "Edit Payment Method" : "Add Payment Method"}</DialogTitle>
                    <DialogDescription>
                      {editingMethod
                        ? "Update the payment method details below."
                        : "Add a new payment method for customers to use."}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="method-type" className="text-right">
                        Method Type
                      </Label>
                      <div className="col-span-3">
                        <Select value={methodType} onValueChange={setMethodType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GCash">GCash</SelectItem>
                            <SelectItem value="PayMaya">PayMaya</SelectItem>
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="QR Code">QR Code</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="account-name" className="text-right">
                        Account Name
                      </Label>
                      <Input
                        id="account-name"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="account-number" className="text-right">
                        Account Number
                      </Label>
                      <Input
                        id="account-number"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="instructions" className="text-right">
                        Instructions
                      </Label>
                      <Textarea
                        id="instructions"
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        className="col-span-3"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="qr-code" className="text-right">
                        Upload QR Code
                      </Label>
                      <Input
                        id="qr-code"
                        type="file"
                        accept="image/*"
                        onChange={handleQrImageChange}
                        className="col-span-3"
                      />
                    </div>
                    {qrImageUrl && (
                      <div className="col-span-3 flex items-center">
                        <img src={qrImageUrl} alt="QR Code" className="h-16 w-16 object-cover rounded" />
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingMethod(null);
                        setMethodType("");
                        setAccountName("");
                        setAccountNumber("");
                        setInstructions("");
                        setIsAddMethodDialogOpen(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={editingMethod ? handleUpdateMethod : handleAddMethod}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {editingMethod ? "Update Method" : "Add Method"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Available Payment Methods</CardTitle>
                <CardDescription>Payment methods that customers can use to pay their bills</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center h-40">
                    <p>Loading payment methods...</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Method Type</TableHead>
                        <TableHead>Account Name</TableHead>
                        <TableHead>Account Number</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentMethods.length > 0 ? (
                        paymentMethods.map((method) => (
                          <TableRow key={method.id}>
                            <TableCell className="font-medium">{method.type}</TableCell>
                            <TableCell>{method.accountName}</TableCell>
                            <TableCell>{method.accountNumber}</TableCell>
                            <TableCell>
                              {method.isActive ? (
                                <Badge className="bg-green-500">Active</Badge>
                              ) : (
                                <Badge variant="outline" className="text-gray-500">
                                  Inactive
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditMethod(method)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant={method.isActive ? "destructive" : "outline"}
                                  size="sm"
                                  onClick={() => handleToggleMethodStatus(method)}
                                >
                                  {method.isActive ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            No payment methods found. Add one to get started.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Verification Tab */}
          <TabsContent value="payment-verification" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Payment Verifications</CardTitle>
                <CardDescription>Review and verify customer payment submissions</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Add the button for creating a cash receipt */}
                <div className="flex justify-end mb-4">
                <Dialog open={isCreateReceiptDialogOpen} onOpenChange={setIsCreateReceiptDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Cash Receipt
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Create Cash Receipt</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                      {/* Customer Information Section */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">Customer Information</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                          <div>
                            <Label htmlFor="accountNumber">Account Number</Label>
                            <Input
                              id="accountNumber"
                              name="accountNumber"
                              value={formData.accountNumber}
                              onChange={async (e) => {
                                const accountNumber = e.target.value;
                                setFormData((prev) => ({ ...prev, accountNumber }));

                                // Fetch customer name from Firestore
                                if (accountNumber) {
                                  try {
                                    const { collection, query, where, getDocs } = await import("firebase/firestore");
                                    const { db } = await import("../../lib/firebase");

                                    const customersCollection = collection(db, "customers");
                                    const customerQuery = query(
                                      customersCollection,
                                      where("accountNumber", "==", accountNumber)
                                    );
                                    const snapshot = await getDocs(customerQuery);

                                    if (!snapshot.empty) {
                                      const customer = snapshot.docs[0].data();
                                      setFormData((prev) => ({
                                        ...prev,
                                        customerName: customer.name || "",
                                      }));
                                    } else {
                                      setFormData((prev) => ({ ...prev, customerName: "" }));
                                    }
                                  } catch (error) {
                                    console.error("Error fetching customer name:", error);
                                  }
                                } else {
                                  setFormData((prev) => ({ ...prev, customerName: "" }));
                                }
                              }}
                            />
                          </div>
                          <div>
                            <Label htmlFor="customerName">Customer Name</Label>
                            <Input
                              id="customerName"
                              name="customerName"
                              value={formData.customerName}
                              onChange={handleInputChange}
                              disabled
                            />
                          </div>
                        </div>
                      </div>

                      {/* Payment Details Section */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">Payment Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                          <div>
                            <Label htmlFor="amount">Amount</Label>
                            <Input
                              id="amount"
                              name="amount"
                              value={formData.amount}
                              onChange={handleInputChange}
                            />
                          </div>
                          <div>
                            <Label htmlFor="paymentDate">Payment Date</Label>
                            <Input
                              id="paymentDate"
                              name="paymentDate"
                              value={formData.paymentDate}
                              onChange={handleInputChange}
                            />
                          </div>
                          <div>
                            <Label htmlFor="paymentMethod">Payment Method</Label>
                            <Input
                              id="paymentMethod"
                              name="paymentMethod"
                              value={formData.paymentMethod}
                              disabled
                            />
                          </div>
                          <div>
                            <Label htmlFor="referenceNumber">Reference Number</Label>
                            <Input
                              id="referenceNumber"
                              name="referenceNumber"
                              value={formData.referenceNumber}
                              disabled
                            />
                          </div>
                        </div>
                      </div>

                      {/* Status Section */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">Status</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                          <div>
                            <Label htmlFor="status">Status</Label>
                            <Input id="status" name="status" value={formData.status} disabled />
                          </div>
                          <div>
                            <Label htmlFor="submissionDateTime">Submission DateTime</Label>
                            <Input
                              id="submissionDateTime"
                              name="submissionDateTime"
                              value={formData.submissionDateTime}
                              disabled
                            />
                          </div>

                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateReceiptDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                      onClick={handleCreateReceipt}
                      disabled={isProcessing} // Disable the button while processing
                      className={`bg-green-600 hover:bg-green-700 ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Save Receipt"
                      )}
                    </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
                {loading ? (
                  <div className="flex justify-center items-center h-40">
                    <p>Loading payment verifications...</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Reference #</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingVerifications.map((verification) => (
                        <TableRow key={verification.id}>
                          <TableCell>{verification?.accountNumber || "N/A"}</TableCell>
                          <TableCell>{verification?.customerName || "N/A"}</TableCell>
                          <TableCell>{formatCurrency(verification?.amount || 0)}</TableCell>
                          <TableCell>{verification?.referenceNumber || "N/A"}</TableCell>
                          <TableCell>
                            {verification?.paymentDate ? formatDate(verification.paymentDate) : "N/A"}
                          </TableCell>
                          <TableCell>{verification?.paymentMethod || "N/A"}</TableCell>
                          <TableCell>
                            {verification?.submissionDateTime
                              ? formatDateTime(verification.submissionDateTime)
                              : "N/A"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenVerificationDialog(verification)}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Verify
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Dialog open={isVerificationDialogOpen} onOpenChange={setIsVerificationDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Verify Payment</DialogTitle>
              <DialogDescription>
                Review the payment details and verify or reject the payment.
              </DialogDescription>
            </DialogHeader>
            {selectedVerification && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">Account Number</Label>
                    <p className="font-medium">{selectedVerification.accountNumber}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Customer</Label>
                    <p className="font-medium">{selectedVerification.customerName}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Amount</Label>
                    <p className="font-medium">{formatCurrency(selectedVerification.amount)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Reference Number</Label>
                    <p className="font-medium">{selectedVerification.referenceNumber}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Payment Method</Label>
                    <p className="font-medium">{selectedVerification.paymentMethod}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Payment Date</Label>
                    <p className="font-medium">{formatDate(selectedVerification.paymentDate)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Submitted At</Label>
                    <p className="font-medium">
                      {new Date(selectedVerification.submissionDateTime!).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                <Select
                  value={verificationStatus}
                  onValueChange={(value) => setVerificationStatus(value as "verified" | "rejected")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select verification status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                </div>
                <div className="mt-2">
                  <Label htmlFor="verification-notes">Notes</Label>
                  <Textarea
                    id="verification-notes"
                    placeholder="Add any notes about this verification"
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedVerification(null);
                  setVerificationStatus("verified");
                  setVerificationNotes("");
                  setIsVerificationDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleVerifyPayment}
                disabled={isProcessing}
                className={`
                  ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
                  ${verificationStatus === "verified"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                  }
                `}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : verificationStatus === "verified" ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Verify Payment
                  </>
                ) : (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Reject Payment
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
          </TabsContent>

          {/* Payment History Tab */}
          <TabsContent value="payment-history" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-800">
                      Payment History
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600">
                      View the payment history of customers
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="bg-blue-600 hover:bg-green-700 text-white"
                      onClick={handleExportPaymentHistory}
                      disabled={filteredHistory.length === 0}
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Export to Excel
                    </Button>
                    <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="mt-4 md:mt-0">
                          <FileText className="mr-2 h-4 w-4" />
                          Print All Receipts
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                          <DialogTitle>Filter Receipts</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Month</Label>
                            <Select value={printMonth} onValueChange={setPrintMonth}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select month" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => {
                                  const month = String(i + 1).padStart(2, "0");
                                  return (
                                    <SelectItem key={month} value={month}>
                                      {month}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Year</Label>
                            <Select value={printYear} onValueChange={setPrintYear}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select year" />
                              </SelectTrigger>
                              <SelectContent>
                                {["2024", "2025", "2026"].map((year) => (
                                  <SelectItem key={year} value={year}>
                                    {year}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Site</Label>
                            <Select value={printSite} onValueChange={setPrintSite}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select site" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="site1">Site 1</SelectItem>
                                <SelectItem value="site2">Site 2</SelectItem>
                                <SelectItem value="site3">Site 3</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <Button
                            onClick={() => {
                              setIsPrintDialogOpen(false);
                              handlePrintReceipts( printMonth, printYear, printSite);
                            }}
                            className="w-full"
                          >
                            Print
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 space-y-4 md:space-y-0">
                  {/* Search */}
                  <Input
                    placeholder="Search by customer name, account #, or reference #"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-1/3"
                  />

                  {/* Filter by Site */}
                  <div className="w-full md:w-1/4">
                    <Select value={filterSite} onValueChange={setFilterSite}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by Site" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sites</SelectItem>
                        <SelectItem value="site1">Site 1</SelectItem>
                        <SelectItem value="site2">Site 2</SelectItem>
                        <SelectItem value="site3">Site 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Filter by Month */}
                  <div className="w-full md:w-1/4">
                    <Select value={filterMonth} onValueChange={setFilterMonth}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by Month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        {Array.from({ length: 12 }, (_, i) => {
                          const month = String(i + 1).padStart(2, "0");
                          return (
                            <SelectItem key={month} value={month}>
                              {new Date(0, i).toLocaleString("en-US", { month: "long" })}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Filter by Year */}
                  <div className="w-full md:w-1/4">
                    <Select value={filterYear} onValueChange={setFilterYear}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {["2023", "2024", "2025", "2026"].map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {filteredHistory.length > 0 ? (
                  <>
                    <Table className="border border-gray-200 rounded-lg overflow-hidden">
                      <TableHeader>
                        <TableRow className="bg-gray-100">
                          <TableHead>Account #</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Reference #</TableHead>
                          <TableHead>Payment Date</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Verified At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentItems.map((payment) => (
                          <TableRow
                            key={payment.id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <TableCell>{payment.accountNumber}</TableCell>
                            <TableCell>{payment.customerName}</TableCell>
                            <TableCell>
                              {formatCurrency(Number(payment.amount))}
                            </TableCell>
                            <TableCell>{payment.referenceNumber}</TableCell>
                            <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                            <TableCell>{payment.paymentMethod}</TableCell>
                            <TableCell>
                              {new Date(payment.verifiedAt).toLocaleString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                                hour12: true,
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    <div className="flex justify-between items-center mt-4">
                      <Button
                        variant="outline"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <p>
                        Page {currentPage} of {totalPages}
                      </p>
                      <Button
                        variant="outline"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-center py-8 text-gray-600">
                    No payment history found.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>

  );
};

export default PaymentManagement;
