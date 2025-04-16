import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  getDocs,
  writeBatch,
  collectionGroup,
  doc,
  where,
  Timestamp
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

// Utility function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

interface Customer {
  id: string;
  name: string;
  accountNumber: string;
  address?: string;
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

      const readingsData = recordsSnapshot.docs.map(doc => {
        const data = doc.data() as MeterReading;
        const pathSegments = doc.ref.path.split('/');
        const accountNumberFromPath = pathSegments[1];
        return {
          id: doc.id,
          ...data,
          accountNumber: data.accountNumber || accountNumberFromPath,
        };
      });

      setMeterReadings(readingsData);
      setFilteredReadings(readingsData);
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
      const baseRate = billingData.waterRate;
      const firstBlock = Math.min(usage, 10);
      total += firstBlock * baseRate;
      usage -= firstBlock;

      if (usage > 0) {
        const block2 = Math.min(usage, 10);
        total += block2 * (baseRate + 2);
        usage -= block2;
      }

      if (usage > 0) {
        const block3 = Math.min(usage, 10);
        total += block3 * (baseRate + 4);
        usage -= block3;
      }

      if (usage > 0) {
        const block4 = Math.min(usage, 10);
        total += block4 * (baseRate + 6);
        usage -= block4;
      }

      if (usage > 0) {
        const block5 = Math.min(usage, 10);
        total += block5 * (baseRate + 8);
        usage -= block5;
      }

      if (usage > 0) {
        total += usage * (baseRate + 10);
      }

      if (total < 191) total = 191;
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
    return {
        customerId: customer.id,
        date: new Date().toLocaleDateString("en-GB"),
        amount: billCalc.waterCharge,
        originalAmount: billCalc.waterCharge,
        status: "pending",
        dueDate: formatToDDMMYYYY(billingData.dueDate),
        billingPeriod: `${formatToDDMMYYYY(reading.dueDate)}`,
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
  
          const billingPeriod = `${reading.month}-${reading.year}`;
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
          if (unpaidBillsSnapshot.size >= 3) {
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
          const waterChargeBeforeTax = usage * billingData.waterRate;
          const tax = waterChargeBeforeTax * billingData.taxRate;
          const rawTotal = waterChargeBeforeTax + tax;
          const discount = isSenior ? rawTotal * billingData.seniorDiscountRate : 0;
          const discountedTotal = rawTotal - discount;
          const penalty = discountedTotal * billingData.penaltyRate;
          const totalAmountDue = discountedTotal + penalty;
  
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
  
          let finalDiscountedTotal = discountedTotal;
          let finalTotalAmountDue = totalAmountDue;
          let finalOriginalAmount = discountedTotal;
          let appliedOverpayment = 0;
  
          if (overpayment > 0) {
            if (overpayment >= discountedTotal) {
              appliedOverpayment = discountedTotal;
              finalDiscountedTotal = 0;
              finalTotalAmountDue = 0;
              finalOriginalAmount = 0;
              overpayment -= appliedOverpayment;
            } else {
              appliedOverpayment = overpayment;
              finalDiscountedTotal = discountedTotal - overpayment;
              finalTotalAmountDue = totalAmountDue - overpayment;
              finalOriginalAmount = discountedTotal - overpayment;
              overpayment = 0;
            }
          }
  
          let arrears = 0;
          const allBillsSnapshot = await getDocs(billsCollectionRef);
          allBillsSnapshot.forEach((billDoc) => {
            const bill = billDoc.data();
            arrears += bill.amount || 0;
          });
  
          const billNumber = (allBillsSnapshot.size + 1).toString().padStart(10, "0");
  
          const billData = {
            customerId: customer.id,
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
            waterCharge: rawTotal,
            waterChargeBeforeTax: waterChargeBeforeTax,
            tax: tax,
            seniorDiscount: discount,
            penalty: penalty,
            amountAfterDue: finalTotalAmountDue,
            currentAmountDue: finalTotalAmountDue,
            arrears: arrears,
            billNumber: billNumber,
            overPayment: overpayment,
            appliedOverpayment: appliedOverpayment,
            rawCalculatedAmount: discountedTotal,
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="customer-billing">Customer Billing</TabsTrigger>
          <TabsTrigger value="view-bills">View Bills</TabsTrigger> {/* New Tab */}
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
      {(() => {
        // Compute filtered bills (logic based on CustomerList)
        const searchLower = billingSearchTerm.toLowerCase();
        const filteredBills = bills.filter((bill) => {
          const matchesSearch =
            bill.customerName.toLowerCase().includes(searchLower) ||
            bill.accountNumber.toLowerCase().includes(searchLower) ||
            bill.billingPeriod?.toLowerCase().includes(searchLower);
          const matchesSite = billingFilterSite === "all" || bill.site === billingFilterSite;
          const matchesSenior = !billingFilterSenior || bill.isSenior === true;
          return matchesSearch && matchesSite && matchesSenior;
        }).sort((a, b) => a.customerName.localeCompare(b.customerName)); // Sort bills alphabetically by customer name

        const itemsPerPage = 10;
        const indexOfLastBill = currentPage * itemsPerPage;
        const indexOfFirstBill = indexOfLastBill - itemsPerPage;
        const currentBills = filteredBills.slice(indexOfFirstBill, indexOfLastBill);
        const totalPages = Math.ceil(filteredBills.length / itemsPerPage);

        return (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account #</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Billing Period</TableHead>
                  <TableHead>Amount Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentBills.length > 0 ? (
                  currentBills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-medium">{bill.accountNumber}</TableCell>
                      <TableCell>{bill.customerName}</TableCell>
                      <TableCell>{bill.billingPeriod}</TableCell>
                      <TableCell>{formatCurrency(bill.amount)}</TableCell>
                      <TableCell>
                        {bill.status === "paid" ? (
                          <Badge className="bg-green-500">Paid</Badge>
                        ) : bill.status === "overdue" ? (
                          <Badge className="bg-red-500">Overdue</Badge>
                        ) : (
                          <Badge className="bg-yellow-500">Pending</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No bills found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {filteredBills.length > itemsPerPage && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  Showing {indexOfFirstBill + 1} to{" "}
                  {Math.min(indexOfLastBill, filteredBills.length)} of{" "}
                  {filteredBills.length} bills
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        );
      })()}
    </CardContent>
  </Card>
</TabsContent>
      </Tabs>
    </div>
            
    );
};
      
export default Bill;