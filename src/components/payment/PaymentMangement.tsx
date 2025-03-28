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
} from "lucide-react";

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
        return;
      }
  
      const { doc, updateDoc, getDoc, deleteDoc, collection, getDocs, where, query, addDoc } =
        await import("firebase/firestore");
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
        return;
      }
  
      // Check if the customer exists with the given account number
      const customersCollection = collection(db, "customers");
      const customerQuery = query(customersCollection, where("accountNumber", "==", accountNumber));
      const customerSnapshot = await getDocs(customerQuery);
      if (customerSnapshot.empty) {
        console.error(`❌ No customer found with accountNumber: ${accountNumber}`);
        // Reject the verification if the account number is wrong
        await deleteDoc(doc(db, "paymentVerifications", selectedVerification.id));
        alert("No customer found with the provided account number. Payment verification has been rejected.");
        setSelectedVerification(null);
        setVerificationStatus("rejected");
        setVerificationNotes("");
        setIsVerificationDialogOpen(false);
        return;
      }
  
      // If customer is found, retrieve customerId
      const customerDoc = customerSnapshot.docs[0];
      customerId = customerDoc.id;
      console.log(`✅ Found customerId: ${customerId} for accountNumber: ${accountNumber}`);
  
      // If verification is rejected, delete verification doc and notify.
      if (verificationStatus === "rejected") {
        await deleteDoc(doc(db, "paymentVerifications", selectedVerification.id));
        console.log("❌ Payment verification deleted (rejected).");
        await addDoc(collection(db, "notifications", accountNumber!, "records"), {
          type: "payment",
          verificationId: selectedVerification.id,
          customerId: selectedVerification.customerId || null,
          status: "rejected",
          message: "Your payment verification has been rejected.",
          createdAt: new Date().toISOString(),
        });
        alert("Payment has been rejected and verification deleted.");
        setSelectedVerification(null);
        setVerificationStatus("verified");
        setVerificationNotes("");
        setIsVerificationDialogOpen(false);
        return;
      }
  
      // Process verified payment.
      const paymentAmount = typeof selectedVerification.amount === "string"
        ? parseFloat(selectedVerification.amount)
        : selectedVerification.amount;
      if (isNaN(paymentAmount)) {
        console.error("❌ Error: Invalid payment amount.");
        alert("Invalid payment amount. Please check the payment details.");
        return;
      }
  
      // Update updatedPayments document.
      const updatedPaymentsRef = doc(db, "updatedPayments", accountNumber!);
      const updatedPaymentsSnap = await getDoc(updatedPaymentsRef);
      if (!updatedPaymentsSnap.exists()) {
        console.error(`❌ Error: No updatedPayments record found for account ${accountNumber}.`);
        alert(`No payment record found for account ${accountNumber}.`);
        return;
      }
      const updatedPaymentsData = updatedPaymentsSnap.data();
      const prevPaymentsAmount = parseFloat(updatedPaymentsData?.amount ?? 0);
      const newUpdatedAmount = Math.max(0, prevPaymentsAmount - paymentAmount);
      
      // Update both the amount and the customerId.
      await updateDoc(updatedPaymentsRef, { amount: newUpdatedAmount, customerId: customerId });
      console.log(`✅ updatedPayments updated for account ${accountNumber}: amount = ${newUpdatedAmount}`);
  
      // Process pending bills in the bills collection.
      const billsCollectionRef = collection(db, "bills", accountNumber!, "records");
      const billsSnap = await getDocs(billsCollectionRef);
      const pendingBills = billsSnap.docs
        .map((doc) => {
          const data = doc.data() as Bill;
          return { id: doc.id, ref: doc.ref, ...data };
        })
        .sort((a, b) => parseInt(a.billNumber || "0") - parseInt(b.billNumber || "0"));
  
      let remainingPayment = paymentAmount;
      for (const bill of pendingBills) {
        const billDue = bill.amount;
        if (remainingPayment <= 0) break;
  
        if (remainingPayment >= billDue) {
          remainingPayment -= billDue;
          // Payment fully covers this bill.
          await updateDoc(bill.ref, {
            amount: 0,
            currentAmountDue: 0,
            paidAt: new Date().toISOString(),
          });
        } else {
          // Partial payment: update the bill's amount (and currentAmountDue) by subtracting the payment.
          const newRemaining = billDue - remainingPayment;
          await updateDoc(bill.ref, {
            amount: newRemaining,
            currentAmountDue: newRemaining,
          });
          remainingPayment = 0;
        }
      }
  
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
      await addDoc(collection(db, "notifications", accountNumber!, "records"), {
        type: "payment",
        verificationId: selectedVerification.id,
        customerId: customerId,
        status: "verified",
        message: "Your payment has been verified.",
        createdAt: new Date().toISOString(),
      });
  
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

  const handleOpenBillDialog = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setBillAccountNumber(customer.accountNumber);

    const today = new Date();
    const firstDayOfBilling = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfBilling = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const dueDate = new Date(lastDayOfBilling);
    dueDate.setDate(dueDate.getDate() + 19);

    const formatShortDate = (date: Date) =>
      date.toLocaleDateString("en-GB").replace(/\//g, "/").slice(0, -2);

    setBillingPeriod(`${formatShortDate(firstDayOfBilling)} - ${formatShortDate(lastDayOfBilling)}`);
    setBillDueDate(formatShortDate(dueDate));

    setCurrentReading("");
    setWaterUsage("");
    setMeterNumber("12345678");

    try {
      const { doc, getDoc } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");
      const customerRef = doc(db, "customers", customer.id);
      const customerSnap = await getDoc(customerRef);

      if (customerSnap.exists()) {
        setPreviousReading(customerSnap.data().lastReading?.toString() || "0");
        setIsSenior(customerSnap.data().isSenior || false);
      } else {
        setPreviousReading("0");
        setIsSenior(false);
      }
    } catch (error) {
      console.error("Error fetching customer data:", error);
      setPreviousReading("0");
      setIsSenior(false);
    }

    setBillDialogOpen(true);
  };

  // Dynamically recalc when user updates meter readings
  const updateBillingFields = (prev: string, curr: string) => {
    const previous = parseInt(prev) || 0;
    const currentVal = parseInt(curr) || 0;
    const usage = Math.max(currentVal - previous, 0);
  
    // Calculate water charge (pre-tax) using the helper
    const waterChargeBeforeTax = calculateWaterCharge(usage);
    const tax = waterChargeBeforeTax * 0.02;
    const rawTotal = waterChargeBeforeTax + tax;
    const discount = isSenior ? rawTotal * 0.05 : 0;
    const discountedTotal = rawTotal - discount;
    const penalty = discountedTotal * 0.1;
    const totalDue = discountedTotal + penalty;
  
    setPreviousReading(prev);
    setCurrentReading(curr);
    setWaterUsage(usage.toString());
    setWaterCharge(waterChargeBeforeTax.toFixed(2)); // Pre-tax water charge
    setTaxAmount(tax.toFixed(2)); // Stored but not shown in UI
    setSeniorDiscount(discount.toFixed(2));
    setPenaltyAmount(penalty.toFixed(2));
    setImmediateAmount(discountedTotal.toFixed(2)); // Amount before penalty
    setAmountAfterDue(totalDue.toFixed(2));
  };

  // Helper function for water charge calculation
  const calculateWaterCharge = (consumed: number): number => {
    let total = 0;
    if (consumed > 0) {
      // First 10 m³ at 19.10 per m³
      const firstBlock = Math.min(consumed, 10);
      total += firstBlock * 19.10;
      consumed -= firstBlock;

      // Next 10 m³ (11-20) at 21.10 per m³
      if (consumed > 0) {
        const block2 = Math.min(consumed, 10);
        total += block2 * 21.10;
        consumed -= block2;
      }
      // Next 10 m³ (21-30) at 23.10 per m³
      if (consumed > 0) {
        const block3 = Math.min(consumed, 10);
        total += block3 * 23.10;
        consumed -= block3;
      }
      // Next 10 m³ (31-40) at 25.10 per m³
      if (consumed > 0) {
        const block4 = Math.min(consumed, 10);
        total += block4 * 25.10;
        consumed -= block4;
      }
      // Next 10 m³ (41-50) at 27.10 per m³
      if (consumed > 0) {
        const block5 = Math.min(consumed, 10);
        total += block5 * 27.10;
        consumed -= block5;
      }
      // Above 50 m³ at 29.10 per m³
      if (consumed > 0) {
        total += consumed * 29.10;
      }
      // Ensure minimum charge of ₱191 if any water is consumed.
      if (total < 191) total = 191;
    }
    return total;
  };

  const handleCreateBill = async () => {
    if (!selectedCustomer) return;
    setIsProcessing(true);
    try {
      // Parse meter readings and compute usage.
      const previous = parseInt(previousReading) || 0;
      const current = parseInt(currentReading) || 0;
      const usage = Math.max(current - previous, 0);
  
      // Calculate charges.
      const waterChargeBeforeTax = calculateWaterCharge(usage);
      const tax = waterChargeBeforeTax * 0.02;
      const rawTotal = waterChargeBeforeTax + tax;
      const discount = isSenior ? rawTotal * 0.05 : 0;
      const discountedTotal = rawTotal - discount;
      const penalty = discountedTotal * 0.1;
      const totalAmountDue = discountedTotal + penalty;
  
      // Helper to format due date as dd/mm/yyyy.
      const formatToDDMMYYYY = (dateString: string): string => {
        if (!dateString) return "";
        const dateObj = new Date(dateString);
        const day = String(dateObj.getDate()).padStart(2, "0");
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const year = dateObj.getFullYear();
        return `${day}/${month}/${year}`;
      };
  
      // Build the bill data object.
      // We extend the Bill type with an optional "arrears" field.
      const billData: Bill & { arrears?: number } = {
        customerId: selectedCustomer.id,
        date: new Date().toLocaleDateString("en-US"),
        amount: discountedTotal,        // Remaining amount, which will decrease with payments.
        originalAmount: discountedTotal, // Store the original bill amount here.
        status: "pending",
        dueDate: formatToDDMMYYYY(billDueDate),
        billingPeriod,
        description: billDescription,
        waterUsage: usage,
        meterReading: { current, previous, consumption: usage },
        accountNumber: billAccountNumber,
        meterNumber,
        waterCharge: rawTotal,
        waterChargeBeforeTax,
        tax,
        seniorDiscount: discount,
        penalty,
        amountAfterDue: totalAmountDue,
        currentAmountDue: totalAmountDue,
        // billNumber will be added after auto-increment logic.
      };
  
      // Import Firestore functions.
      const { collection, addDoc, doc, updateDoc, getDoc, setDoc, getDocs } =
        await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");
  
      // Reference the customer's bills collection.
      const billsCollectionRef = collection(db, "bills", billAccountNumber, "records");
  
      // Get all existing bills (the new bill is not added yet).
      const billsSnapshot = await getDocs(billsCollectionRef);
  
      // Sum the amount of all previous bills.
      let arrears = 0;
      billsSnapshot.forEach((billDoc) => {
        const bill = billDoc.data() as Bill;
        arrears += bill.amount || 0;
      });
      // Store the arrears in the new bill data.
      billData.arrears = arrears;
  
      // Auto-increment billNumber based on the number of existing bills.
      const currentBillCount = billsSnapshot.size;
      billData.billNumber = (currentBillCount + 1).toString().padStart(10, "0");
  
      // Create the new bill document.
      await addDoc(billsCollectionRef, billData);
  
      // Update customer's last reading.
      const customerRef = doc(db, "customers", selectedCustomer.id);
      await updateDoc(customerRef, { lastReading: current });
  
      // Update updatedPayments (add the discountedTotal to the existing amount).
      const updatedPaymentsRef = doc(db, "updatedPayments", billAccountNumber);
      const updatedPaymentsSnap = await getDoc(updatedPaymentsRef);
      const previousAmount = updatedPaymentsSnap.exists()
        ? updatedPaymentsSnap.data().amount || 0
        : 0;
      const newAmount = previousAmount + discountedTotal;
      await setDoc(
        updatedPaymentsRef,
        {
          accountNumber: billAccountNumber,
          customerId: selectedCustomer.id,
          amount: newAmount,
        },
        { merge: true }
      );
  
      // Create a notification.
      await addDoc(collection(db, "notifications", billAccountNumber, "records"), {
        type: "bill_created",
        customerId: selectedCustomer.id,
        accountNumber: billAccountNumber,
        message: `A new bill for the billing period ${billingPeriod} with due date ${billDueDate} has been created for your account. Please check your billing details.`,
        createdAt: new Date().toISOString(),
      });
  
      alert(`✅ Bill created successfully for ${selectedCustomer.name}`);
      setBillDialogOpen(false);
    } catch (error) {
      console.error("❌ Error creating bill:", error);
      alert("Error creating bill. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };
  





  

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDueDate = e.target.value;
    setBillDueDate(newDueDate);

    const dueDateObj = new Date(newDueDate + "T00:00:00");
    const startBillingDate = new Date(dueDateObj.getFullYear(), dueDateObj.getMonth() - 1, 1);
    const endBillingDate = new Date(dueDateObj.getFullYear(), dueDateObj.getMonth(), 1);

    const formatDateFn = (date: Date) =>
      `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${date.getFullYear()}`;

    const formattedBillingPeriod = `${formatDateFn(startBillingDate)} - ${formatDateFn(endBillingDate)}`;
    setBillingPeriod(formattedBillingPeriod);
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
            <TabsTrigger value="customer-billing">Customer Billing</TabsTrigger>
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
                      <Label htmlFor="verification-status">Verification Status</Label>
                      <Select
                        value={verificationStatus}
                        onValueChange={(value: "verified" | "rejected") => setVerificationStatus(value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
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

          {/* Customer Billing Tab */}
          <TabsContent value="customer-billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Billing</CardTitle>
                <CardDescription>Create and manage bills for customers</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account #</TableHead>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Current Amount Due</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.length > 0 ? (
                      customers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">{customer.accountNumber}</TableCell>
                          <TableCell>{customer.name}</TableCell>
                          <TableCell>{customer.email}</TableCell>
                          <TableCell>{formatCurrency(customer.amountDue)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenBillDialog(customer)}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Create Bill
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          No customers found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Dialog open={isBillDialogOpen} onOpenChange={setBillDialogOpen}>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Create New Bill</DialogTitle>
                  <DialogDescription>
                    Create a new bill for {selectedCustomer?.name} based on the billing statement.
                  </DialogDescription>
                </DialogHeader>
                {selectedCustomer && (
                  <div className="space-y-4">
                    {/* Customer Details */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h3 className="font-medium text-gray-700 mb-1">Customer Details</h3>
                      <div className="flex items-center gap-3">
                        <div className="grow">
                          <p className="font-medium">{selectedCustomer.name}</p>
                          <p className="text-sm text-gray-500">
                            Account #: {selectedCustomer.accountNumber}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <Input
                            id="bill-account-number"
                            type="text"
                            value={billAccountNumber}
                            readOnly
                          />
                        </div>
                      </div>
                    </div>
                    {/* Billing Period */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="billing-period">Billing Period</Label>
                        <Input
                          id="billing-period"
                          type="text"
                          value={billingPeriod}
                          onChange={(e) => setBillingPeriod(e.target.value)}
                          placeholder="e.g., 01/03/25 - 02/01/25"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="due-date">Due Date</Label>
                        <Input
                          id="due-date"
                          type="date"
                          value={billDueDate}
                          onChange={handleDueDateChange}
                        />
                      </div>
                    </div>
                    {/* Meter Reading */}
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <h3 className="font-medium text-blue-700 mb-1">Meter Reading</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="meter-number">Meter #</Label>
                          <Input
                            id="meter-number"
                            type="text"
                            value={meterNumber}
                            onChange={(e) => setMeterNumber(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="previous-reading">Previous Reading (m³)</Label>
                          <Input
                            id="previous-reading"
                            type="number"
                            value={previousReading}
                            onChange={(e) => updateBillingFields(e.target.value, currentReading)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="current-reading">Current Reading (m³)</Label>
                          <Input
                            id="current-reading"
                            type="number"
                            value={currentReading}
                            onChange={(e) => updateBillingFields(previousReading, e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    {/* Usage and Charges */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="water-usage">Water Usage (m³)</Label>
                        <Input id="water-usage" type="number" value={waterUsage} readOnly />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="water-charge">Water Charge (₱)</Label>
                        <Input id="water-charge" type="number" value={waterCharge} readOnly />
                      </div>
                    </div>
                    {/* Additional Charges */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h3 className="font-medium text-gray-700 mb-1">Additional Charges</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="senior-discount">Senior Discount (₱)</Label>
                          <Input
                            id="senior-discount"
                            type="number"
                            value={seniorDiscount}
                            readOnly
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="penalty-amount">Penalty (₱)</Label>
                          <Input id="penalty-amount" type="number" value={penaltyAmount} readOnly />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="amount-now">Amount (₱)</Label>
                          <Input id="amount-now" type="number" value={immediateAmount} readOnly />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="amount-after-due">Amount After Due (₱)</Label>
                          <Input
                            id="amount-after-due"
                            type="number"
                            value={amountAfterDue}
                            readOnly
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <DialogFooter className="mt-4 pt-3 border-t border-gray-200 sticky bottom-0 bg-white">
                  <Button variant="outline" onClick={() => setBillDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateBill} disabled={isProcessing}>
                    {isProcessing ? "Processing..." : "Create Bill"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PaymentManagement;
