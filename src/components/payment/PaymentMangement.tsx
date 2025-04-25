import React, { useState, useEffect } from "react";
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

// Fetch payment history (verified payments)
useEffect(() => {
  const fetchPaymentHistory = async () => {
    try {
      const { collection, query, where, getDocs, orderBy } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");

      const paymentVerificationsCollection = collection(db, "paymentVerifications");

      // Build the query based on the selected site filter
      let verifiedPaymentsQuery = query(
        paymentVerificationsCollection,
        where("status", "==", "verified"),
        orderBy("verifiedAt", "desc") // Order by most recent
      );

      if (filterSite !== "all") {
        verifiedPaymentsQuery = query(
          paymentVerificationsCollection,
          where("status", "==", "verified"),
          where("site", "==", filterSite), // Filter by site
          orderBy("verifiedAt", "desc")
        );
      }

      const snapshot = await getDocs(verifiedPaymentsQuery);
      const history = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PaymentVerification[];

      setPaymentHistory(history);
      setFilteredHistory(history); // Initialize filtered history
    } catch (error) {
      console.error("Error fetching payment history:", error);
    }
  };

  fetchPaymentHistory();
}, [filterSite]); // Re-run when filterSite changes

// Filter and search logic
useEffect(() => {
  const filtered = paymentHistory.filter((payment) => {
    const matchesSearch =
      payment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSite = filterSite === "all"; // Simplified

    const matchesDate =
      !filterDate || new Date(payment.paymentDate).toLocaleDateString() === new Date(filterDate).toLocaleDateString();

    return matchesSearch && matchesSite && matchesDate;
  });

  setFilteredHistory(filtered);
  setCurrentPage(1); // Reset to the first page when filters change
}, [searchTerm, filterSite, filterDate, paymentHistory]);

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

// Fetch payment history (verified payments)
useEffect(() => {
  const fetchPaymentHistory = async () => {
    try {
      const { collection, query, where, getDocs } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");

      const paymentVerificationsCollection = collection(db, "paymentVerifications");
      const verifiedPaymentsQuery = query(
        paymentVerificationsCollection,
        where("status", "==", "verified")
      );

      const snapshot = await getDocs(verifiedPaymentsQuery);
      const history = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PaymentVerification[];

      setPaymentHistory(history);
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
      const billsSnap = await getDocs(billsCollectionRef);
      
      // Fix the duplicate map with proper type definition
      const pendingBills = billsSnap.docs
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
            penaltyApplied: data.penaltyApplied || false  // Renamed from taxApplied to penaltyApplied
          };
        })
        .sort((a, b) => parseInt(a.billNumber || "0") - parseInt(b.billNumber || "0"));
  
      // Save the original payment amount for later calculation.
      let remainingPayment = paymentAmount;
  
      // Process each pending bill in order.
      for (const bill of pendingBills) {
        // Check if penalty should be applied
        let billAmount = bill.amount;
        let penaltyApplied = bill.penaltyApplied || false;
        
        // Only apply penalty if:
        // 1. Amount is greater than 0
        // 2. Due date has passed
        // 3. Penalty hasn't been applied yet
        if (billAmount > 0 && !penaltyApplied) {
          // Parse the due date correctly
          let dueDate;
          
          // Handle different date formats that might exist in the database
          if (bill.dueDate && typeof bill.dueDate === 'string') {
            // Check if the date is in DD/MM/YYYY format
            if (bill.dueDate.includes('/')) {
              const [day, month, year] = bill.dueDate.split('/');
              dueDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            } 
            // Check if the date is in YYYY-MM-DD format
            else if (bill.dueDate.includes('-')) {
              dueDate = new Date(bill.dueDate);
            }
            // Handle ISO string format
            else {
              dueDate = new Date(bill.dueDate);
            }
          } else {
            // If it's already a Date object or timestamp
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
          } else {
            console.log(`❌ No penalty applied to bill ${bill.billNumber} as it's not yet due.`);
          }
        } else if (penaltyApplied) {
          console.log(`ℹ️ Penalty already applied to bill ${bill.billNumber}.`);
        } else if (billAmount <= 0) {
          console.log(`ℹ️ No penalty needed for bill ${bill.billNumber} as amount is ${billAmount}.`);
        }
        
        if (remainingPayment <= 0) break;
  
        if (remainingPayment >= billAmount) {
          // Payment fully covers this bill.
          remainingPayment -= billAmount;
          await updateDoc(bill.ref, {
            amount: 0,
            currentAmountDue: 0,
            paidAt: new Date().toISOString(),
            penaltyApplied: penaltyApplied  // Keep the penaltyApplied status for record
          });
        } else {
          // Partial payment: update the bill's amount.
          const newRemaining = billAmount - remainingPayment;
          await updateDoc(bill.ref, {
            amount: newRemaining,
            currentAmountDue: newRemaining,
            penaltyApplied: penaltyApplied  // Keep the penaltyApplied status
          });
          remainingPayment = 0;
        }
      }
  
      // If there is an overpayment (remainingPayment > 0), update the latest bill record (by dueDate)
      // with the extra payment.
      if (remainingPayment > 0) {
        // Get all bills and sort them by billNumber in descending order
        const billsQuery = query(
          billsCollectionRef
        );
        const billsSnapshot = await getDocs(billsQuery);
        
        if (!billsSnapshot.empty) {
          // Extract and sort bills by their numeric billNumber
          const sortedBills = billsSnapshot.docs
            .map(doc => ({
              ref: doc.ref,
              data: doc.data(),
              billNumber: doc.data().billNumber || "0"
            }))
            .sort((a, b) => {
              // Convert billNumbers to integers for proper numeric comparison
              // Remove leading zeros and parse as integers
              const aNum = parseInt(a.billNumber.replace(/^0+/, '') || "0", 10);
              const bNum = parseInt(b.billNumber.replace(/^0+/, '') || "0", 10);
              return bNum - aNum; // Descending order (highest first)
            });
          
          // Get the bill with the highest billNumber (first in the sorted array)
          const latestBill = sortedBills[0];
          const previousOverPayment = parseFloat(latestBill.data.overPayment || "0");
          const newOverPayment = previousOverPayment + remainingPayment;
          
          await updateDoc(latestBill.ref, { overPayment: newOverPayment });
          console.log(
            `✅ Overpayment of ${remainingPayment} applied to latest bill with billNumber ${latestBill.billNumber}`
          );
        }
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
          status: "verified", // Updated status for verified payment
          paymentAmount: paymentAmount,
          description: `Your payment verification has been successfully verified. Payment Amount: ₱${paymentAmount.toFixed(2)}.`,
          createdAt: formatNotificationTimestamp(),
        }
      );
  
      // ✅ Remove disconnection notice if less than 3 unpaid bills remain
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "PHP" }).format(amount);
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                  <Select>
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
                <CardTitle>Payment History</CardTitle>
                <CardDescription>View the payment history of customers</CardDescription>
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
                        <SelectItem value="Site 1">Site 1</SelectItem>
                        <SelectItem value="Site 2">Site 2</SelectItem>
                        <SelectItem value="Site 3">Site 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  
                </div>

                {filteredHistory.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
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
                          <TableRow key={payment.id}>
                            <TableCell>{payment.accountNumber}</TableCell>
                            <TableCell>{payment.customerName}</TableCell>
                            <TableCell>{formatCurrency(Number(payment.amount))}</TableCell>
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
                  <p className="text-center py-8">No payment history found.</p>
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
