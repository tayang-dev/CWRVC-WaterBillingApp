import React, { useState, useEffect } from "react";
import logoImage from "@/assets/logo.png"; // Adjust the path if necessary
import {
  collection,
  query,
  getDocs,
  writeBatch,
  collectionGroup,
  onSnapshot, 
  addDoc,
  doc,
  where,
  Timestamp,
  getDoc
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { AlertCircle, FileText, RefreshCw, Filter } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Adjusted the import path to match the correct folder structure
import { ChevronLeft, ChevronRight, Search, Filter as FilterIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"; 
import BillDisplay from "./BillDisplay"; 
import jsPDF from "jspdf"; // Import jsPDF for PDF generation
import "jspdf-autotable"; // Optional for table formatting
import html2canvas from "html2canvas"; // Import html2canvas for rendering HTML to canvas

// Utility function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
};

interface Customer {
  id: string;
  name: string;
  accountNumber: string;
  address?: string;
  block?: string;
  lot?: string;
  site?: string;
  status?: string;
  isSenior?: boolean;
  meterNumber?: string;
}

// Note: dueDate is now a string so it matches the stored format "dd/mm/yyyy".
interface MeterReading {
  accountNumber: string;
  currentReading: number;
  previousReading: number;
  dueDate: string;
  month: number;
  year: number;
  name: string;
  site: string;
  id?: string;
}

const Bill: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meterReadings, setMeterReadings] = useState<MeterReading[]>([]);
  const [filteredReadings, setFilteredReadings] = useState<MeterReading[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("All");
  const [isProcessing, setIsProcessing] = useState(false);
  const [siteOptions, setSiteOptions] = useState<string[]>([]);
  const [loadingState, setLoadingState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [notification, setNotification] = useState<{ message: string, type: "success" | "error" | "info" } | null>(null);
  const [selectedReadings, setSelectedReadings] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("customer-billing"); // State for active tab
  const [billingSearchTerm, setBillingSearchTerm] = useState("");
  const [billingFilterSite, setBillingFilterSite] = useState("all");
  const [billingFilterSenior, setBillingFilterSenior] = useState(false);
  const [billingShowFilters, setBillingShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [bills, setBills] = useState<any[]>([]); // Replace `any` with the appropriate type for bills
  const itemsPerPage = 10;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBills, setSelectedBills] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [noBillNotifications, setNoBillNotifications] = useState<any[]>([]);
  // Use the current date and set due date 15 days ahead.
  const currentDate = new Date();
  const defaultDueDate = new Date(currentDate);
  defaultDueDate.setDate(currentDate.getDate() + 15);

  // Keep billingData.dueDate as a string (formatted as "yyyy-MM-dd" for the date input)
  const [billingData, setBillingData] = useState({
    billDescription: "Monthly Water Bill",
    dueDate: defaultDueDate.toISOString().split('T')[0],
    waterRate: 19.1,
    taxRate: 0.02,
    penaltyRate: 0.1,
    seniorDiscountRate: 0.05
  });

  // Helper to convert a "yyyy-MM-dd" date (from the input) to "dd/mm/yyyy" format.
  const formatToDDMMYYYY = (dateString: string): string => {
    if (!dateString) return "";
    const dateObj = new Date(dateString);
    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const generateBillNumber = (count: number) => {
    return String(count + 1).padStart(10, "0");
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      collectionGroup(db, "records"),
      (snapshot) => {
        const newNotifs = snapshot.docs
          .filter(doc => doc.data().type === "no_bill_notice")
          .map(doc => ({ id: doc.id, ...doc.data() }));
  
        setNoBillNotifications(newNotifs);
      },
      (error) => {
        console.error("Error listening for notifications:", error);
      }
    );
  
    return () => unsub();
  }, []);

  useEffect(() => {
    if (billingData.dueDate) {
      const formattedDueDate = formatToDDMMYYYY(billingData.dueDate);
      fetchMeterReadingsByDueDate(formattedDueDate);
    }
  }, [billingData.dueDate]);

  const fetchCustomers = async () => {
    setLoadingState("loading");
    try {
      const querySnapshot = await getDocs(collection(db, "customers"));
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Customer[];
      setCustomers(data);

      // Get unique site options
      const uniqueSites = Array.from(new Set(data.map(c => c.site).filter(Boolean))) as string[];
      setSiteOptions(["All", ...uniqueSites]);
      setLoadingState("success");
    } catch (error) {
      console.error("Error fetching customers:", error);
      setLoadingState("error");
      showNotification("Failed to load customers. Please try again.", "error");
    }
  };

const fetchMeterReadingsByDueDate = async (formattedDueDate: string) => {
  setLoadingState("loading");
  try {
    const billingPeriod = calculateBillingPeriod(billingData.dueDate);

    const recordsQuery = query(
      collectionGroup(db, "records"),
      where("dueDate", "==", formattedDueDate)
    );

    const recordsSnapshot = await getDocs(recordsQuery);
    if (recordsSnapshot.empty) {
      setMeterReadings([]);
      setFilteredReadings([]);
      showNotification(`No meter readings found for due date: ${formattedDueDate}`, "info");
      setLoadingState("success");
      return;
    }

    const readingsData = await Promise.all(
      recordsSnapshot.docs.map(async (doc) => {
        const data = doc.data() as MeterReading;
        const pathSegments = doc.ref.path.split("/");
        const accountNumber = data.accountNumber || pathSegments[1];

        const billSnapshot = await getDocs(
          query(
            collection(db, "bills", accountNumber, "records"),
            where("billingPeriod", "==", billingPeriod)
          )
        );

        if (!billSnapshot.empty) return null;

        

        return {
          id: doc.id,
          ...data,
          accountNumber,
        };
      })
    );

    const filtered = readingsData.filter((r): r is Required<MeterReading> => r !== null && r?.id !== undefined);
    setMeterReadings(filtered);
    setFilteredReadings(filtered);
    setLoadingState("success");
  } catch (error) {
    console.error("Error fetching meter readings:", error);
    setLoadingState("error");
    showNotification("Failed to load meter readings. Please try again.", "error");
  }
};
  
  

  const showNotification = (message: string, type: "success" | "error" | "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    let filtered = [...meterReadings];

    // Apply site filter
    if (selectedSite !== "All") {
      filtered = filtered.filter(r => r.site === selectedSite);
    }
    
    setFilteredReadings(filtered);
  }, [meterReadings, selectedSite]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedReadings(filteredReadings.map(r => r.id || ''));
    } else {
      setSelectedReadings([]);
    }
  };

  const handleSelectReading = (id: string) => {
    if (selectedReadings.includes(id)) {
      setSelectedReadings(selectedReadings.filter(rId => rId !== id));
    } else {
      setSelectedReadings([...selectedReadings, id]);
    }
  };

  const calculateBillAmount = (usage: number, isSenior: boolean = false) => {
    let total = 0;
  
    if (usage > 0) {
      // First tier: 1-10 cubic meters
      const tier1 = Math.min(usage, 10);
      total += tier1 * 19.1;
      usage -= tier1;
  
      if (usage > 0) {
        // Second tier: 11-20 cubic meters
        const tier2 = Math.min(usage, 10);
        total += tier2 * 21.1;
        usage -= tier2;
      }
  
      if (usage > 0) {
        // Third tier: 21-30 cubic meters
        const tier3 = Math.min(usage, 10);
        total += tier3 * 23.1;
        usage -= tier3;
      }
  
      if (usage > 0) {
        // Fourth tier: 31-40 cubic meters
        const tier4 = Math.min(usage, 10);
        total += tier4 * 25.1;
        usage -= tier4;
      }
  
      if (usage > 0) {
        // Fifth tier: 41-50 cubic meters
        const tier5 = Math.min(usage, 10);
        total += tier5 * 27.1;
        usage -= tier5;
      }
  
      if (usage > 0) {
        // Sixth tier: 51+ cubic meters
        total += usage * 29.1;
      }
  
      // Apply minimum charge
      if (total < 191) {
        total = 191;
      }
    }
  
    const tax = total * billingData.taxRate;
    const discount = isSenior ? total * billingData.seniorDiscountRate : 0;
    const totalBeforePenalty = total + tax - discount;
    const penalty = totalBeforePenalty * billingData.penaltyRate;
    const totalAmountDue = totalBeforePenalty + penalty;
  
    return {
      waterCharge: total,
      tax,
      discount,
      penalty,
      totalAmountDue,
    };
  };

  const createBillData = (
    customer: Customer, 
    reading: MeterReading, 
    usage: number, 
    billCalc: ReturnType<typeof calculateBillAmount>
) => {
    // Create the complete address string using customer data
    const customerAddress = customer.address || ""; // Use empty string if address is undefined
    
    // Format the full address properly
    const formattedAddress = customer.block && customer.lot 
        ? `BLK ${customer.block}, LOT ${customer.lot}, ${customerAddress}`
        : customerAddress;
    
    return {
        customerId: customer.id,
        customerName: customer.name, // Add customer name
        customerAddress: formattedAddress, // Add formatted address
        date: new Date().toLocaleDateString("en-GB"),
        amount: billCalc.waterCharge,
        originalAmount: billCalc.waterCharge,
        status: "pending",
        dueDate: formatToDDMMYYYY(billingData.dueDate),
        billingPeriod: calculateBillingPeriod(billingData.dueDate),
        description: billingData.billDescription,
        waterUsage: usage,
        meterReading: { 
            current: reading.currentReading, 
            previous: reading.previousReading, 
            consumption: usage 
        },
        accountNumber: reading.accountNumber,
        meterNumber: customer.meterNumber || "Meter-Default",
        waterCharge: billCalc.waterCharge,
        waterChargeBeforeTax: billCalc.waterCharge,
        tax: billCalc.tax,
        seniorDiscount: billCalc.discount,
        penalty: billCalc.penalty,
        amountAfterDue: billCalc.totalAmountDue,
        currentAmountDue: billCalc.totalAmountDue,
        arrears: 0,
        billNumber: generateBillNumber(0),
        overPayment: 0,
        appliedOverpayment: 0,
        rawCalculatedAmount: billCalc.waterCharge,
    };
};

  const handleCreateSelectedBills = async () => {
    if (selectedReadings.length === 0) {
      showNotification("Please select at least one meter reading", "info");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      let successCount = 0;
      let errorCount = 0;
      let batchCount = 0;
      let currentBatch = writeBatch(db);
      
      for (const readingId of selectedReadings) {
        const reading = meterReadings.find(r => r.id === readingId);
        if (!reading) continue;
        
        const customer = customers.find(c => c.accountNumber === reading.accountNumber);
        if (!customer) {
          errorCount++;
          continue;
        }
        
        const usage = reading.currentReading - reading.previousReading;
        if (usage <= 0) {
          errorCount++;
          continue;
        }
        
        const billCalc = calculateBillAmount(usage, customer.isSenior);
        
        const billDocRef = doc(collection(db, "bills", reading.accountNumber, "records"));
        const billData = createBillData(customer, reading, usage, billCalc);
        
        currentBatch.set(billDocRef, billData);
        successCount++;
        batchCount++;
        
        if (batchCount >= 400) {
          await currentBatch.commit();
          currentBatch = writeBatch(db);
          batchCount = 0;
        }
      }
      
      if (batchCount > 0) {
        await currentBatch.commit();
      }
      
      if (successCount > 0) {
        showNotification(`Successfully created ${successCount} bills`, "success");
      } else {
        showNotification("No bills were created. Please check if selected meter readings are valid.", "error");
      }
    } catch (error) {
      console.error("Error creating bills:", error);
      showNotification("Failed to create bills. Please try again.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

    const handleCreateAllBills = async () => {
      if (filteredReadings.length === 0) {
        showNotification("No meter readings available to create bills", "info");
        return;
      }
    
      setIsProcessing(true);
    
      try {
        let successCount = 0;
        let errorCount = 0;
        
        const { collection, addDoc, doc, updateDoc, getDoc, setDoc, getDocs, Timestamp, query, where, orderBy, limit } = await import("firebase/firestore");
        const { db } = await import("../../lib/firebase");
    
        let currentGlobalBillNumber = await getLatestGlobalBillNumber();

        for (const reading of filteredReadings) {
          try {
            const customer = customers.find(c => c.accountNumber === reading.accountNumber);
            if (!customer) {
              errorCount++;
              console.error(`Customer not found for account ${reading.accountNumber}`);
              continue;
            }
    
            const usage = reading.currentReading - reading.previousReading;
            if (usage <= 0) {
              errorCount++;
              console.error(`Invalid usage for account ${reading.accountNumber}`);
              continue;
            }
    
            const billingPeriod = calculateBillingPeriod(billingData.dueDate);
            const billsCollectionRef = collection(db, "bills", reading.accountNumber, "records");
            const existingBillsSnapshot = await getDocs(
              query(billsCollectionRef, where("billingPeriod", "==", billingPeriod))
            );
            if (!existingBillsSnapshot.empty) {
              errorCount++;
              console.error(`Duplicate billing period for account ${reading.accountNumber}`);
              continue;
            }
    
            const unpaidBillsSnapshot = await getDocs(
              query(billsCollectionRef, where("amount", ">", 0))
            );
            if (unpaidBillsSnapshot.size >= 2) {
              const noticeData = {
                accountNumber: reading.accountNumber,
                name: customer.name,
                description: "Your account is at risk of disconnection due to unpaid bills.",
                timestamp: Timestamp.now(),
              };
              const noticeCollectionRef = collection(db, "notice");
              await addDoc(noticeCollectionRef, noticeData);
    
              const notificationData = {
                accountNumber: reading.accountNumber,
                customerId: customer.id,
                description: "Your account is at risk of disconnection due to unpaid bills.",
                type: "disconnection_warning",
                createdAt: Timestamp.now(),
              };
              const notificationRef = collection(db, "notifications", reading.accountNumber, "records");
              await addDoc(notificationRef, notificationData);
            }
    
            const isSenior = customer.isSenior || false;
            
            // Use the tiered billing calculation function instead of flat rate
            const billCalc = calculateBillAmount(usage, isSenior);
            
            // Extract the calculated values from the billCalc object
            const waterChargeBeforeTax = billCalc.waterCharge;
            const tax = billCalc.tax;
            const discount = billCalc.discount;
            const penalty = billCalc.penalty;
            const totalAmountDue = billCalc.totalAmountDue;
    
            let overpayment = 0;
            const latestBillQuery = query(
              billsCollectionRef,
              orderBy("dueDate", "desc"),
              limit(1)
            );
            const latestBillSnap = await getDocs(latestBillQuery);
            if (!latestBillSnap.empty) {
              const latestBillData = latestBillSnap.docs[0].data();
              overpayment = parseFloat(latestBillData.overPayment || 0);
              if (overpayment > 0) {
                await updateDoc(latestBillSnap.docs[0].ref, { overPayment: 0 });
              }
            }
    
            // Calculate final amounts after any overpayment is applied
            let finalDiscountedTotal = totalAmountDue - penalty; // Amount without penalty
            let finalTotalAmountDue = totalAmountDue;
            let finalOriginalAmount = finalDiscountedTotal;
            let appliedOverpayment = 0;
    
            if (overpayment > 0) {
              if (overpayment >= finalDiscountedTotal) {
                appliedOverpayment = finalDiscountedTotal;
                finalDiscountedTotal = 0;
                finalTotalAmountDue = 0;
                finalOriginalAmount = 0;
                overpayment -= appliedOverpayment;
              } else {
                appliedOverpayment = overpayment;
                finalDiscountedTotal = finalDiscountedTotal - overpayment;
                finalTotalAmountDue = finalTotalAmountDue - overpayment;
                finalOriginalAmount = finalOriginalAmount - overpayment;
                overpayment = 0;
              }
            }
    
            let arrears = 0;
            const allBillsSnapshot = await getDocs(billsCollectionRef);
            allBillsSnapshot.forEach((billDoc) => {
              const bill = billDoc.data();
              arrears += bill.amount || 0;
            });
    
            currentGlobalBillNumber++;
            const billNumber = String(currentGlobalBillNumber).padStart(10, "0");

            const formattedAddress = customer.block && customer.lot 
              ? `BLK ${customer.block}, LOT ${customer.lot}, ${customer.address || ""}`
              : customer.address || "";
            
            // Create bill data with correct calculations
            const billData = {
              customerId: customer.id,
              customerName: customer.name,
              customerAddress: formattedAddress,
              date: Timestamp.now(),
              amount: finalDiscountedTotal,
              originalAmount: finalOriginalAmount,
              status: "pending",
              dueDate: formatToDDMMYYYY(billingData.dueDate),
              billingPeriod: billingPeriod,
              description: billingData.billDescription,
              waterUsage: usage,
              meterReading: {
                current: reading.currentReading,
                previous: reading.previousReading,
                consumption: usage,
              },
              accountNumber: reading.accountNumber,
              meterNumber: customer.meterNumber || "Meter-Default",
              waterCharge: waterChargeBeforeTax, // Use the tiered calculation result
              waterChargeBeforeTax: waterChargeBeforeTax, // Use the tiered calculation result
              tax: tax,
              seniorDiscount: discount,
              penalty: penalty,
              amountAfterDue: finalTotalAmountDue,
              currentAmountDue: finalTotalAmountDue,
              arrears: arrears,
              billNumber: billNumber,
              overPayment: overpayment,
              appliedOverpayment: appliedOverpayment,
              rawCalculatedAmount: finalDiscountedTotal + appliedOverpayment, // Original calculated amount before overpayment
              createdAt: Timestamp.now(),
            };
    
            await addDoc(billsCollectionRef, billData);
    
            const customerRef = doc(db, "customers", customer.id);
            await updateDoc(customerRef, { lastReading: reading.currentReading });
    
            const updatedPaymentsRef = doc(db, "updatedPayments", reading.accountNumber);
            const updatedPaymentsSnap = await getDoc(updatedPaymentsRef);
            const previousAmount = updatedPaymentsSnap.exists() ? updatedPaymentsSnap.data().amount || 0 : 0;
            await setDoc(
              updatedPaymentsRef,
              {
                accountNumber: reading.accountNumber,
                customerId: customer.id,
                amount: previousAmount + finalDiscountedTotal,
              },
              { merge: true }
            );
    
            let notificationDescription = `A new bill for the billing period ${billingPeriod} with due date ${formatToDDMMYYYY(billingData.dueDate)} has been created for your account.`;
            if (appliedOverpayment > 0) {
              notificationDescription += ` An overpayment of ₱${appliedOverpayment.toFixed(2)} was applied to this bill.`;
            }
            await addDoc(collection(db, "notifications", reading.accountNumber, "records"), {
              type: "bill_created",
              customerId: customer.id,
              accountNumber: reading.accountNumber,
              description: notificationDescription,
              createdAt: Timestamp.now(),
            });
    
            successCount++;
          } catch (error) {
            errorCount++;
            console.error(`Error creating bill for account ${reading.accountNumber}:`, error);
          }
        }
    
        if (successCount > 0) {
          showNotification(`Successfully created ${successCount} bills. ${errorCount} errors occurred.`, "success");
        } else {
          showNotification("No bills were created. Please check the meter readings.", "error");
        }
      } catch (error) {
        console.error("Error in bill creation process:", error);
        showNotification("Failed to create bills. Please try again.", "error");
      } finally {
        setIsProcessing(false);
      }
    };

  const handleViewBills = async (accountNumber: string) => {
    setSelectedAccount(accountNumber);
    setDialogOpen(true);
  
    try {
      const billsRef = collection(db, "bills", accountNumber, "records");
      const billsSnapshot = await getDocs(billsRef);
  
      const billsList = billsSnapshot.docs.map(doc => {
        const billData = doc.data();
        return {
          id: doc.id,
          ...billData,
          customerName: billData.customerName || "Unknown Customer",
          customerAddress: billData.customerAddress || "Unknown Address",
        };
      });
  
      console.log("Fetched Bills:", billsList); // Debug fetched data
      setSelectedBills(billsList);
    } catch (error) {
      console.error("Error fetching bills for account:", error);
      showNotification("Failed to load bills for this account.", "error");
    }
  };
  

  const getLatestGlobalBillNumber = async (): Promise<number> => {
    const billsSnapshot = await getDocs(collectionGroup(db, "records"));
    
    let maxNumber = 0;
    billsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.billNumber) {
        const num = parseInt(data.billNumber, 10);
        if (!isNaN(num)) {
          maxNumber = Math.max(maxNumber, num);
        }
      }
    });
  
    return maxNumber;
  };
  

  const calculateBillingPeriod = (dueDateStr: string): string => {
    const dueDate = new Date(dueDateStr);
    const from = new Date(dueDate.getFullYear(), dueDate.getMonth() - 1, 1);
    const to = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);
  
    const format = (date: Date) =>
      `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  
    return `${format(from)} - ${format(to)}`;
  };
  

  // View Bills Tab Functionality
  const fetchBillsData = async () => {
    setLoadingState("loading");
    try {
      const paymentsSnapshot = await getDocs(collection(db, "updatedPayments"));
  
      const paymentsData = await Promise.allSettled(
        paymentsSnapshot.docs.map(async (paymentDoc) => {
          const accountNumber = paymentDoc.id;
          const paymentData = paymentDoc.data();
  
          const customerId = paymentData.customerId;
  
          const customerRef = doc(db, "customers", customerId);
          const customerSnap = await getDoc(customerRef);
          const customerData = customerSnap.exists() ? customerSnap.data() : null;
  
          return {
            accountNumber,
            name: customerData ? `${customerData.firstName} ${customerData.lastName}` : "Unknown",
            email: customerData?.email || customerData?.phone || "N/A",
            totalAmountDue: paymentData.amount || 0,
            status: paymentData.status || "unknown",
          };
        })
      );
  
      const finalData = paymentsData
        .filter((res) => res.status === "fulfilled" && res.value !== null)
        .map((res) => (res as PromiseFulfilledResult<any>).value);
  
      setBills(finalData);
      setLoadingState("success");
    } catch (err) {
      console.error("Error fetching bills data:", err);
      setLoadingState("error");
      showNotification("Failed to load bills data.", "error");
    }
  };
  
  const handlePrintAllReceipts = async () => {
    try {
      // Show processing notification
      showNotification("Preparing bills for printing...", "info");
      
      const allBillsSnapshot = await getDocs(collectionGroup(db, "records"));
      if (allBillsSnapshot.empty) {
        showNotification("No bills found to print.", "info");
        return;
      }
  
      // Filter only documents that are actual bills
      const allBills = allBillsSnapshot.docs
        .filter(doc => doc.data().billNumber && doc.data().customerName)
        .map((doc) => ({
          id: doc.id,
          billNumber: doc.data().billNumber || "0000000000",
          customerName: doc.data().customerName || "Unknown Customer",
          customerAddress: doc.data().customerAddress || "Unknown Address",
          meterReading: doc.data().meterReading || { current: 0, previous: 0 },
          waterUsage: doc.data().waterUsage || 0,
          billingPeriod: doc.data().billingPeriod || "N/A",
          waterChargeBeforeTax: doc.data().waterChargeBeforeTax || 0,
          tax: doc.data().tax || 0,
          seniorDiscount: doc.data().seniorDiscount || 0,
          arrears: doc.data().arrears || 0,
          appliedOverpayment: doc.data().appliedOverpayment || 0,
          amount: doc.data().amount || 0,
          accountNumber: doc.data().accountNumber || "00-00-0000",
          meterNumber: doc.data().meterNumber || "00000000",
          dueDate: doc.data().dueDate || "00/00/0000",
          penalty: doc.data().penalty || 0,
          amountAfterDue: doc.data().amountAfterDue || 0,
          // Add rates breakdown data
          ratesBreakdown: doc.data().ratesBreakdown || calculateDefaultRates(doc.data().waterUsage || 0)
        }));
  
      if (allBills.length === 0) {
        showNotification("No valid bills found to print.", "info");
        return;
      }
  
      // Helper function to calculate default rates if not available
      function calculateDefaultRates(usage) {
        const rates = [];
        let remainingUsage = usage;
      
        const tiers = [
          { min: 1, max: 10, rate: 19.10 },
          { min: 11, max: 20, rate: 21.10 },
          { min: 21, max: 30, rate: 23.10 },
          { min: 31, max: 40, rate: 25.10 },
          { min: 41, max: 50, rate: 27.10 },
          { min: 51, max: "above", rate: 29.10 },
        ];
      
        for (let i = 0; i < tiers.length; i++) {
          const tier = tiers[i];
          const tierUsage = typeof tier.max === "number" ? Math.min(remainingUsage, tier.max - tier.min + 1) : remainingUsage;
      
          if (tierUsage <= 0) break;
      
          rates.push({
            min: tier.min,
            max: tier.max,
            rate: tier.rate,
            usage: tierUsage,
            amount: parseFloat((tierUsage * tier.rate).toFixed(2)),
          });
      
          remainingUsage -= tierUsage;
        }
      
        return rates;
      }
      
  
      // Create PDF document - landscape for better layout
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });
      
      // Convert logo to base64 for jsPDF
      let logoBase64 = "";
      try {
        const img = new Image();
        img.src = logoImage; // Use the imported logo path
  
        await new Promise((resolve, reject) => {
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            logoBase64 = canvas.toDataURL("image/png");
            resolve(null);
          };
          img.onerror = reject;
        });
      } catch (error) {
        console.error("Error converting logo to base64:", error);
        // Continue without logo if there's an error
      }
      
      // Format currency helper
      const formatCurrency = (value) => {
        return (parseFloat(value) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      };
      
      // Helper to calculate text width
      const getTextWidth = (text, fontSize, fontStyle = "normal") => {
        pdf.setFont("helvetica", fontStyle);
        pdf.setFontSize(fontSize);
        return pdf.getStringUnitWidth(text) * fontSize / pdf.internal.scaleFactor;
      };
      
      // For each bill
      for (let i = 0; i < allBills.length; i++) {
        const bill = allBills[i];
        
        // Add new page if not the first bill
        if (i > 0) {
          pdf.addPage();
        }
        
        // Get page dimensions
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        // Dynamic margins
        const marginX = 15;
        const marginY = 15;
        const contentWidth = pageWidth - (marginX * 2);
        const contentHeight = pageHeight - (marginY * 2);
        
        // Draw outer border for the entire receipt
        pdf.setLineWidth(0.3);
        pdf.rect(marginX, marginY, contentWidth, contentHeight);
        
        // --- HEADER SECTION ---
        // Calculate header height based on content
        const companyName1 = "CENTENNIAL WATER RESOURCE VENTURE";
        const companyName2 = "CORPORATION";
        const companyAddress = "Southville 7, Site 3, Brgy. Sto. Tomas, Calauan, Laguna";
        
        const headerHeight = 30; // Reduced from 35
        
        // Add logo if available
        if (logoBase64) {
          const logoSize = 22; // Reduced from 25
          pdf.addImage(logoBase64, 'PNG', marginX + 20, marginY + 4, logoSize, logoSize);
        }
        
        // Company name - center aligned
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.text(companyName1, marginX + contentWidth / 2, marginY + 10, { align: "center" });
        pdf.text(companyName2, marginX + contentWidth / 2, marginY + 20, { align: "center" });
        
        // Company address
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.text(companyAddress, marginX + contentWidth / 2, marginY + 28, { align: "center" });
        
        // Right side - "BILLING STATEMENT NO."
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.text("BILLING STATEMENT", marginX + contentWidth - 15, marginY + 10, { align: "right" });
        pdf.text("NO.", marginX + contentWidth - 15, marginY + 20, { align: "right" });
        
        // Bill Number in large font
        pdf.setFontSize(16);
        pdf.text(bill.billNumber, marginX + contentWidth - 15, marginY + 28, { align: "right" });
        
        // Draw horizontal line under header
        pdf.setLineWidth(0.3);
        pdf.line(marginX, marginY + headerHeight, marginX + contentWidth, marginY + headerHeight);
        
        // --- CUSTOMER INFO SECTION ---
        const customerInfoY = marginY + headerHeight + 5;
        // Adjust customer info height based on address length
        const addressLines = pdf.splitTextToSize(bill.customerAddress, contentWidth * 0.4);
        const customerInfoHeight = Math.max(30, 15 + (addressLines.length * 6)); 
        
        // Customer name
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.text(bill.customerName, marginX + 10, customerInfoY + 10);
        
        // Customer address - handle text wrapping if needed
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10); // Reduced from 11
        pdf.text(addressLines, marginX + 10, customerInfoY + 18);
        
        // --- METER READING TABLE ---
        const meterTableWidth = contentWidth * 0.6;
        const meterTableX = marginX + contentWidth - meterTableWidth;
        const meterTableHeight = 22; // Reduced from 25
        const meterTableY = customerInfoY + 5;
        
        // Draw meter table border
        pdf.rect(meterTableX, meterTableY, meterTableWidth, meterTableHeight);
        
        // Draw meter table columns
        const meterColumnCount = 4;
        const meterColumnWidth = meterTableWidth / meterColumnCount;
        
        for (let col = 1; col < meterColumnCount; col++) {
          pdf.line(
            meterTableX + col * meterColumnWidth,
            meterTableY,
            meterTableX + col * meterColumnWidth,
            meterTableY + meterTableHeight
          );
        }
        
        // Draw horizontal divider
        pdf.line(
          meterTableX,
          meterTableY + meterTableHeight / 2,
          meterTableX + meterTableWidth,
          meterTableY + meterTableHeight / 2
        );
        
        // Meter table headers
        const meterHeaders = ["Current Reading", "Previous Reading", "Consumption", "Billing Month"];
        
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        
        meterHeaders.forEach((header, idx) => {
          pdf.text(
            header,
            meterTableX + idx * meterColumnWidth + meterColumnWidth / 2,
            meterTableY + meterTableHeight / 4 + 2,
            { align: "center" }
          );
        });
        
        // Meter table values
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11); // Reduced from 12
        
        const meterValues = [
          bill.meterReading?.current || 0,
          bill.meterReading?.previous || 0,
          bill.waterUsage || 0,
          bill.billingPeriod || "4-2025"
        ];
        
        meterValues.forEach((value, idx) => {
          pdf.text(
            value.toString(),
            meterTableX + idx * meterColumnWidth + meterColumnWidth / 2,
            meterTableY + meterTableHeight * 3/4 + 2,
            { align: "center" }
          );
        });
        
        // --- BILLING TABLES SECTION ---
        const billingTablesY = customerInfoY + customerInfoHeight;
        
        // Determine billing tables height based on number of rate tiers
        const rateTiers = bill.ratesBreakdown || [];
        const minTablesHeight = 50; // Minimum height
        const tierRowHeight = 8; // Height per tier row
        const extraHeight = Math.max(0, (rateTiers.length - 4) * tierRowHeight);
        const billingTablesHeight = minTablesHeight + extraHeight;
        
        // Define amountDueHeight before using it
        const amountDueHeight = 12; // Reduced from 15
        
        // Left table - billing info
        const leftTableWidth = contentWidth * 0.48;
        pdf.rect(marginX, billingTablesY, leftTableWidth, billingTablesHeight);
        
        // Columns for left table
        const leftColumnTitles = ["Billing Period", "Water", "Tax", "SCF", "Senior Discount", "Arrears", "Over Payment"];
        const leftColumnCount = leftColumnTitles.length;
        const leftColumnWidth = leftTableWidth / leftColumnCount;
        
        // Draw column separators
        for (let col = 1; col < leftColumnCount; col++) {
          pdf.line(
            marginX + col * leftColumnWidth,
            billingTablesY,
            marginX + col * leftColumnWidth,
            billingTablesY + billingTablesHeight
          );
        }
        
        // Header row
        const headerRowHeight = 12; // Reduced from 15
        pdf.setFillColor(240, 240, 240);
        pdf.rect(marginX, billingTablesY, leftTableWidth, headerRowHeight, 'F');
        
        // Left table column headers
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        
        leftColumnTitles.forEach((title, idx) => {
          pdf.text(
            title,
            marginX + idx * leftColumnWidth + leftColumnWidth / 2,
            billingTablesY + headerRowHeight / 2 + 2,
            { align: "center" }
          );
        });
        
        // Left table values
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9); // Reduced from 10
        
        const leftColumnValues = [
          bill.billingPeriod || "4-2025",
          formatCurrency(bill.waterChargeBeforeTax || 517.50),
          formatCurrency(bill.tax || 10.35),
          formatCurrency(0.00), // SCF
          formatCurrency(bill.seniorDiscount || 0.00),
          formatCurrency(bill.arrears || 0.00),
          formatCurrency(bill.appliedOverpayment || 0.00)
        ];
        
        leftColumnValues.forEach((value, idx) => {
          pdf.text(
            value,
            marginX + idx * leftColumnWidth + leftColumnWidth / 2,
            billingTablesY + headerRowHeight + (billingTablesHeight - headerRowHeight - amountDueHeight) / 2,
            { align: "center" }
          );
        });
        
        // Draw amount due row at bottom
        const amountDueY = billingTablesY + billingTablesHeight - amountDueHeight;
        
        pdf.setFillColor(240, 240, 240);
        pdf.rect(marginX, amountDueY, leftTableWidth, amountDueHeight, 'F');
        
        // Amount Due label and value
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11); // Reduced from 12
        
        // Position Amount Due label at right side of cell that spans first 6 columns
        const amountDueLabelX = marginX + (leftColumnWidth * 6) - 5;
        pdf.text("Amount Due", amountDueLabelX, amountDueY + amountDueHeight / 2 + 2, { align: "right" });
        
        // Amount value in last column
        pdf.setFontSize(12); // Reduced from 14
        pdf.text(
          formatCurrency(bill.amount || 527.85),
          marginX + leftTableWidth - leftColumnWidth / 2,
          amountDueY + amountDueHeight / 2 + 2,
          { align: "center" }
        );
        
        // Right table - rates breakdown
        const rightTableX = marginX + leftTableWidth + 5;
        const rightTableWidth = contentWidth - leftTableWidth - 5;
        
        pdf.rect(rightTableX, billingTablesY, rightTableWidth, billingTablesHeight);
        
        // Header for rates breakdown
        pdf.setFillColor(240, 240, 240);
        pdf.rect(rightTableX, billingTablesY, rightTableWidth, headerRowHeight, 'F');
        
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10); // Reduced from 11
        pdf.text(
          "Rates Breakdown",
          rightTableX + rightTableWidth / 2,
          billingTablesY + headerRowHeight / 2 + 2,
          { align: "center" }
        );
        
        // Rates breakdown columns
        const ratesColumnTitles = ["Min", "Max", "Rate", "Value", "Amount"];
        const ratesColumnCount = ratesColumnTitles.length;
        const ratesColumnWidth = rightTableWidth / ratesColumnCount;
        
        // Sub-header row
        const subHeaderY = billingTablesY + headerRowHeight;
        const subHeaderHeight = 8; // Reduced from 10
        
        pdf.setFillColor(230, 230, 230);
        pdf.rect(rightTableX, subHeaderY, rightTableWidth, subHeaderHeight, 'F');
        
        // Draw column separators
        for (let col = 1; col < ratesColumnCount; col++) {
          pdf.line(
            rightTableX + col * ratesColumnWidth,
            subHeaderY,
            rightTableX + col * ratesColumnWidth,
            billingTablesY + billingTablesHeight
          );
        }
        
        // Column headers
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9); // Reduced from 10
        
        ratesColumnTitles.forEach((title, idx) => {
          pdf.text(
            title,
            rightTableX + idx * ratesColumnWidth + ratesColumnWidth / 2,
            subHeaderY + subHeaderHeight / 2 + 2,
            { align: "center" }
          );
        });
        
        // Rates breakdown data rows
        const ratesDataY = subHeaderY + subHeaderHeight;
        const ratesDataHeight = billingTablesHeight - headerRowHeight - subHeaderHeight - 12; // Reduced total row height
        
        if (rateTiers.length > 0) {
          const tierRowHeight = Math.min(10, ratesDataHeight / rateTiers.length);
          
          rateTiers.forEach((tier, idx) => {
            const tierY = ratesDataY + idx * tierRowHeight;
            
            // Draw horizontal line between tiers (except before first tier)
            if (idx > 0) {
              pdf.line(rightTableX, tierY, rightTableX + rightTableWidth, tierY);
            }
            
            // Tier data
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9); // Reduced from 10
            
            const tierData = [
              tier.min.toString(),
              tier.max === "above" ? tier.max : tier.max.toString(),
              tier.rate.toFixed(2),
              tier.usage.toString(),
              formatCurrency(tier.amount)
            ];
            
            tierData.forEach((value, colIdx) => {
              pdf.text(
                value,
                rightTableX + colIdx * ratesColumnWidth + ratesColumnWidth / 2,
                tierY + tierRowHeight / 2 + 2,
                { align: "center" }
              );
            });
          });
        } else {
          // No tiers available
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10);
          pdf.text(
            "No rate tiers available",
            rightTableX + rightTableWidth / 2,
            ratesDataY + ratesDataHeight / 2,
            { align: "center" }
          );
        }
        
        // Total row
        const totalRowY = billingTablesY + billingTablesHeight - 12; // Reduced from 15
        pdf.line(rightTableX, totalRowY, rightTableX + rightTableWidth, totalRowY);
        
        // Calculate total amount from rates
        const totalRatesAmount = rateTiers.reduce((sum, tier) => sum + tier.amount, 0);
        
        // Total label
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9); // Reduced from 10
        pdf.text(
          "Total:",
          rightTableX + ratesColumnWidth * 4 - 5,
          totalRowY + 12 / 2 + 2, // Adjusted for new height
          { align: "right" }
        );
        
        // Total amount
        pdf.setFontSize(11); // Reduced from 12
        pdf.text(
          formatCurrency(totalRatesAmount || bill.waterChargeBeforeTax || 517.50),
          rightTableX + ratesColumnWidth * 4 + ratesColumnWidth / 2,
          totalRowY + 12 / 2 + 2, // Adjusted for new height
          { align: "center" }
        );
        
        // --- ACCOUNT DETAILS ROW ---
        const accountRowY = billingTablesY + billingTablesHeight + 5;
        const accountRowHeight = 20; // Reduced from 25
        
        pdf.rect(marginX, accountRowY, contentWidth, accountRowHeight);
        
        // Account details columns
        const accountColumnTitles = ["Account#", "Meter#", "Due Date", "Penalty", "Amount After Due Date"];
        const accountColumnCount = accountColumnTitles.length;
        const accountColumnWidth = contentWidth / accountColumnCount;
        
        // Draw column separators
        for (let col = 1; col < accountColumnCount; col++) {
          pdf.line(
            marginX + col * accountColumnWidth, 
            accountRowY,
            marginX + col * accountColumnWidth,
            accountRowY + accountRowHeight
          );
        }
        
        // Header part
        const accountHeaderHeight = accountRowHeight * 0.4; // Reduced from 0.5
        pdf.setFillColor(240, 240, 240);
        pdf.rect(marginX, accountRowY, contentWidth, accountHeaderHeight, 'F');
        
        // Draw line between header and values
        pdf.line(marginX, accountRowY + accountHeaderHeight, marginX + contentWidth, accountRowY + accountHeaderHeight);
        
        // Column headers
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9); // Reduced from 10
        
        accountColumnTitles.forEach((title, idx) => {
          pdf.text(
            title,
            marginX + idx * accountColumnWidth + accountColumnWidth / 2,
            accountRowY + accountHeaderHeight / 2 + 2,
            { align: "center" }
          );
        });
        
        // Column values
        const accountValues = [
          bill.accountNumber || "13-15-1326a",
          bill.meterNumber || "17101481", 
          bill.dueDate || "20/05/2025",
          formatCurrency(bill.penalty || 52.79),
          formatCurrency(bill.amountAfterDue || 580.63)
        ];
        
        accountValues.forEach((value, idx) => {
          // Make the last column bold
          if (idx === accountColumnCount - 1) {
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(11); // Reduced from 12
          } else {
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9); // Reduced from 10
          }
          
          pdf.text(
            value,
            marginX + idx * accountColumnWidth + accountColumnWidth / 2,
            accountRowY + accountHeaderHeight + (accountRowHeight - accountHeaderHeight) / 2 + 2,
            { align: "center" }
          );
        });
        
        // --- FOOTER NOTES ---
        // Calculate available space for footer
        const availableFooterSpace = contentHeight - (accountRowY + accountRowHeight - marginY);
        
        // Adjust footer position to ensure it fits
        const footerY = accountRowY + accountRowHeight + 5; // Reduced from 10
        
        // Notes with adaptive font size based on available space
        const footerFontSize = availableFooterSpace < 40 ? 7 : 8; // Smaller font if space is limited
        
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(footerFontSize + 1);
        pdf.text("MAHALAGANG PAALALA TUNGKOL SA INYONG WATER BILL:", marginX + 5, footerY);
        
        // Notes with optimized spacing
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(footerFontSize);
        
        const notes = [
          "HUWAG PONG KALILIMUTAN DALHIN ANG INYONG BILLING STATEMENT KAPAG KAYO AY MAGBABAYAD",
          "PARA MAIWASAN ANG PAGBABAYAD NG MULTA, MAGBAYAD PO NG INYONG BILLING STATEMENT NG MAS MAAGA O DI LALAGPAS SA INYONG DUE DATE.",
          "ANG SERBISYO PO NG INYONG TUBIG AY PUPUTULIN NG WALANG PAALALA KUNG DI KAYO MAKAPAGBAYAD SA LOOB NG LIMANG(5) ARAW PAGKATAPOS NG DUE DATE."
        ];
        
        // Calculate line spacing based on available space
        const lineSpacing = Math.min(5, (availableFooterSpace - 15) / notes.length);
        
        notes.forEach((note, idx) => {
          // Split long notes into multiple lines if necessary
          const wrappedNotes = pdf.splitTextToSize(`${idx + 1}. ${note}`, contentWidth - 20);
          pdf.text(wrappedNotes, marginX + 10, footerY + 8 + (idx * (lineSpacing + wrappedNotes.length * 4)));
        });
        
        // Machine validation note at bottom - ensure it's always visible
        const validationY = marginY + contentHeight - 8;
        pdf.line(marginX, validationY, marginX + contentWidth, validationY);
        
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9); // Reduced from 10
        pdf.text(
          "\"THIS WILL SERVE AS YOUR OFFICIAL RECEIPT WHEN MACHINE VALIDATED\"",
          marginX + contentWidth / 2,
          validationY + 5,
          { align: "center" }
        );
      }
      
      // Save the PDF
      pdf.save("All_Water_Bills.pdf");
      showNotification("All bills have been printed successfully.", "success");
      
    } catch (error) {
      console.error("Error printing all receipts:", error);
      showNotification("Failed to print all receipts. Please try again.", "error");
    }
  };
  
  // Helper functions
  
  // Format currency values
  function formatCurrency(value) {
    const num = parseFloat(value) || 0;
    return num.toFixed(2);
  }
  
  // Format billing period to month name
  function formatBillingMonth(billingPeriod) {
    if (!billingPeriod) return "N/A";
    
    const monthNames = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];
    
    // Handle different formats
    if (billingPeriod.includes("-")) {
      // Format like "4-2025"
      const parts = billingPeriod.split("-");
      if (parts.length === 2) {
        const monthNum = parseInt(parts[0]);
        if (monthNum >= 1 && monthNum <= 12) {
          return monthNames[monthNum - 1];
        }
      }
      
      // Format like "01/03/25 - 02/01/25"
      const endDatePart = billingPeriod.split("-")[1]?.trim();
      if (endDatePart) {
        const dateParts = endDatePart.split("/");
        if (dateParts.length === 3) {
          const monthNum = parseInt(dateParts[1]);
          if (monthNum >= 1 && monthNum <= 12) {
            return monthNames[monthNum - 1];
          }
        }
      }
    }
    
    return billingPeriod;
  }
  
  // Calculate water rate tiers
  function calculateTiers(waterUsage) {
    if (!waterUsage || waterUsage <= 0) return [];
    
    // Define the tiers
    const tiers = [
      { min: 1, max: 10, rate: 19.1 },
      { min: 11, max: 20, rate: 21.1 },
      { min: 21, max: 30, rate: 23.1 },
      { min: 31, max: 40, rate: 25.1 },
      { min: 41, max: 50, rate: 27.1 },
      { min: 51, max: null, rate: 29.1 }
    ];
    
    let activeTiers = [];
    let remainingUsage = waterUsage;
    
    // Special case for minimum consumption (1-10 cubic meters)
    if (waterUsage <= 10) {
      return [{
        min: 0,
        max: 10,
        rate: 19.1,
        usage: waterUsage,
        amount: 191.00 // Minimum charge
      }];
    }
    
    // Calculate tiered usage
    for (const tier of tiers) {
      if (remainingUsage <= 0) break;
      
      if (waterUsage >= tier.min) {
        const tierMax = tier.max || Infinity;
        const usageInTier = Math.min(
          remainingUsage,
          tierMax - tier.min + 1
        );
        
        if (usageInTier > 0) {
          const tierAmount = usageInTier * tier.rate;
          
          activeTiers.push({
            min: tier.min,
            max: tier.max,
            rate: tier.rate,
            usage: usageInTier,
            amount: tierAmount
          });
          
          remainingUsage -= usageInTier;
        }
      }
    }
    
    return activeTiers;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="customer-billing">Customer Billing</TabsTrigger>
          <TabsTrigger value="view-bills" onClick={fetchBillsData}>View Bills</TabsTrigger> {/* New Tab */}
        </TabsList>

        {/* Customer Billing Tab */}
        <TabsContent value="customer-billing" className="space-y-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Customer Billing</h1>
            <button
              onClick={fetchCustomers}
              className="flex items-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md shadow"
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh Data
            </button>
          </div>

          {notification && (
            <div className={`mb-4 p-3 rounded-md ${
              notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
              notification.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
              'bg-blue-100 text-blue-800 border border-blue-200'
            }`}>
              <div className="flex items-center">
                {notification.type === 'error' && <AlertCircle className="mr-2 h-5 w-5" />}
                {notification.message}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6 mb-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Billing Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing Description</label>
                <input
                  type="text"
                  value={billingData.billDescription}
                  onChange={(e) => setBillingData({ ...billingData, billDescription: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={billingData.dueDate}
                  onChange={(e) => setBillingData({ ...billingData, dueDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-6 border border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <select
                    value={selectedSite}
                    onChange={(e) => setSelectedSite(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {siteOptions.map(site => (
                      <option key={site} value={site}>{site || "No Site"}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  className="bg-amber-600 hover:bg-amber-700 text-white py-2 px-4 rounded-md shadow disabled:opacity-50 flex items-center"
                  onClick={handleCreateSelectedBills}
                  disabled={isProcessing || selectedReadings.length === 0}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {isProcessing ? "Processing..." : `Create ${selectedReadings.length} Bills`}
                </button>
                <button
                  className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md shadow disabled:opacity-50 flex items-center"
                  onClick={handleCreateAllBills}
                  disabled={isProcessing || filteredReadings.length === 0}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {isProcessing ? "Processing..." : "Create All Bills"}
                </button>
              </div>
            </div>

            {loadingState === "loading" ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : loadingState === "error" ? (
              <div className="text-center py-12 text-red-600">
                <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                <p>Failed to load data. Please try again.</p>
              </div>
            ) : (
              <div className="overflow-x-auto shadow rounded-lg border border-gray-200">
                <table className="w-full text-sm text-left text-gray-700">
                  <thead className="bg-gray-100 uppercase text-xs text-gray-600">
                    <tr>
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={
                            selectedReadings.length > 0 &&
                            selectedReadings.length === filteredReadings.filter(r => r.id).length
                          }
                          onChange={handleSelectAll}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-3">Account #</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Previous Reading</th>
                      <th className="px-4 py-3">Current Reading</th>
                      <th className="px-4 py-3">Usage</th>
                      <th className="px-4 py-3">Site</th>
                      <th className="px-4 py-3">Month/Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReadings.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                          No meter readings found for the selected due date
                        </td>
                      </tr>
                    ) : (
                      filteredReadings.map(reading => {
                        const usage = reading.currentReading - reading.previousReading;
                        return (
                          <tr key={reading.id} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-2">
                              <input
                                type="checkbox"
                                checked={selectedReadings.includes(reading.id || '')}
                                onChange={() => reading.id && handleSelectReading(reading.id)}
                                className="rounded text-blue-600 focus:ring-blue-500"
                                disabled={!reading.id}
                              />
                            </td>
                            <td className="px-4 py-2">{reading.accountNumber}</td>
                            <td className="px-4 py-2 font-medium">{reading.name}</td>
                            <td className="px-4 py-2">{reading.previousReading}</td>
                            <td className="px-4 py-2">{reading.currentReading}</td>
                            <td className="px-4 py-2">
                              <span className={`inline-flex px-2 py-1 text-xs rounded-full ${usage > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {usage}
                              </span>
                            </td>
                            <td className="px-4 py-2">{reading.site || "—"}</td>
                            <td className="px-4 py-2">{`${reading.month}/${reading.year}`}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredReadings.length} meter readings with due date:{" "}
              {billingData.dueDate ? formatToDDMMYYYY(billingData.dueDate) : ""}
            </div>
          </div>
          {filteredReadings.length > 0 && (
          <div className="mt-10 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              ⚠️ Meter Readings Without Bills
            </h3>
            <ul className="list-disc pl-5 text-yellow-700 space-y-1">
              {filteredReadings.map((reading, idx) => (
                <li key={idx}>
                  <strong>{reading.accountNumber}</strong>: No bill found (Due: {reading.dueDate})
                </li>
              ))}
            </ul>
          </div>
        )}

        </TabsContent>

        {/* View Bills Tab */}
        <TabsContent value="view-bills" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>View Bills</CardTitle>
                <CardDescription>View all generated bills for customers</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-4 md:mt-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search bills..."
                    value={billingSearchTerm}
                    onChange={(e) => {
                      setBillingSearchTerm(e.target.value);
                      setCurrentPage(1); // Reset to first page on search change
                    }}
                    className="pl-10 w-64"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={() => setBillingShowFilters((prev) => !prev)}>
                  <FilterIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="default" // Replace "primary" with a valid variant
                  size="sm"
                  onClick={handlePrintAllReceipts}
                >
                  Print All Bills
                </Button>
              </div>
            </CardHeader>
            {billingShowFilters && (
              <div className="px-6 pb-4 flex space-x-2">
                <Select
                  value={billingFilterSite}
                  onValueChange={(value) => {
                    setBillingFilterSite(value);
                    setCurrentPage(1); // Reset page on filter change
                  }}
                >
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
                <label className="flex items-center space-x-2">
                  <Checkbox
                    checked={billingFilterSenior}
                    onCheckedChange={(val) => {
                      setBillingFilterSenior(val as boolean);
                      setCurrentPage(1); // Reset page on filter change
                    }}
                  />
                  <span className="text-sm">Senior Only</span>
                </label>
              </div>
            )}
            <CardContent>
              {loadingState === "loading" ? (
                <div>Loading...</div>
              ) : loadingState === "error" ? (
                <div>{notification?.message}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account #</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email/Phone</TableHead>
                      <TableHead>Total Amount Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.length > 0 ? (
                      bills.map((bill, index) => (
                        <TableRow key={index}>
                          <TableCell>{bill.accountNumber}</TableCell>
                          <TableCell>{bill.name}</TableCell>
                          <TableCell>{bill.email}</TableCell>
                          <TableCell>{formatCurrency(bill.totalAmountDue)}</TableCell>
                          <TableCell>{bill.status}</TableCell>
                          <TableCell>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleViewBills(bill.accountNumber)}
                            >
                              View Bills
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          No bills found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>            
          </Card>
        </TabsContent>
      </Tabs>
      <BillDisplay 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedAccount={selectedAccount}
        selectedBills={selectedBills}
      />
    </div>
  );
};

export default Bill;