import React, { useState, useEffect, useRef } from "react";
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
  getDoc,
  updateDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { AlertCircle, FileText, RefreshCw, Filter, BarChart, Calculator, CheckCircle, Clock, Edit, Info, Plus, Save, Trash2, X } from "lucide-react";
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
import { ChevronLeft, ChevronRight, Search, Filter as FilterIcon, FileSpreadsheet } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"; 
import BillDisplay from "./BillDisplay"; 
import DisconnectionNoticeDisplay from "./DisconnectionNoticeDisplay";
import jsPDF from "jspdf"; // Import jsPDF for PDF generation
import "jspdf-autotable"; // Optional for table formatting
import html2canvas from "html2canvas"; // Import html2canvas for rendering HTML to canvas
import QRCode from "qrcode";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useReactToPrint } from "react-to-print";

// Utility function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
};
// Helper to format site names (e.g., "site1" -> "Site 1")
const formatSiteName = (site?: string) => {
  if (!site) return "—";
  const match = site.match(/^site(\d+)$/i);
  if (match) {
    return `Site ${match[1]}`;
  }
  // Capitalize first letter if not matching "siteN"
  return site.charAt(0).toUpperCase() + site.slice(1);
};
interface Customer {
  firstName: string;
  lastName: string;
  email: any;
  phone: any;
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

// --- NEW: Rates Management Types ---
interface RateTier {
  min: number;
  max: number | "above" | "over";
  rate: number;
}
interface RatesConfig {
  id?: string;
  tiers: RateTier[];
  minimumCharge: number; 
  updatedAt: Date | string;
}

const Bill: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meterReadings, setMeterReadings] = useState<MeterReading[]>([]);
  const [allMeterReadings, setAllMeterReadings] = useState<MeterReading[]>([]);

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
  // Removed duplicate declaration of itemsPerPage
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBills, setSelectedBills] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [noBillNotifications, setNoBillNotifications] = useState<any[]>([]);
  // Use the current date and set due date 15 days ahead.
  const currentDate = new Date();
  const defaultDueDate = new Date(currentDate);
  defaultDueDate.setDate(currentDate.getDate() + 15);

  const [printFilterDialogOpen, setPrintFilterDialogOpen] = useState(false);
  const [printFilterDueDate, setPrintFilterDueDate] = useState("");
  const [printFilterSite, setPrintFilterSite] = useState("all");
  const [printFilterMonth, setPrintFilterMonth] = useState<string>("");
  const [printFilterYear, setPrintFilterYear] = useState<string>("");

  // --- NEW: State for Rates Management ---
const [ratesConfig, setRatesConfig] = useState<RatesConfig | null>(null);
const [ratesLoading, setRatesLoading] = useState(false);
const [editRates, setEditRates] = useState(false);
const [editTiers, setEditTiers] = useState<RateTier[]>([]);
const [minimumCharge, setMinimumCharge] = useState<number>(94.70);

  const manageRatesRef = useRef<HTMLDivElement>(null);

  
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
  // Scroll to top of Manage Rates tab when notification appears
  useEffect(() => {
    if (notification && activeTab === "manage-rates" && manageRatesRef.current) {
      manageRatesRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [notification, activeTab]);
  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    fetchAllMeterReadingsWithoutBills();
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

  const fetchAllBills = async () => {
    try {
      const allBillsSnapshot = await getDocs(collectionGroup(db, "records")); // From /bills/{account}/records
      const allBills = allBillsSnapshot.docs.map(doc => doc.data());
      return allBills;
    } catch (error) {
      console.error("Failed to fetch all bills:", error);
      return [];
    }
  };
  const [allBills, setAllBills] = useState<any[]>([]);

  useEffect(() => {
    fetchAllBills().then(setAllBills);
  }, []);
    


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
  
const fetchAllMeterReadingsWithoutBills = async () => {
  try {
    const readingsSnapshot = await getDocs(collectionGroup(db, "records"));

    const allReadings = readingsSnapshot.docs
      .map((doc) => {
        const data = doc.data() as MeterReading;
        const pathSegments = doc.ref.path.split("/");
        const accountNumber = data.accountNumber || pathSegments[1];

        return {
          id: doc.id,
          ...data,
          accountNumber,
        };
      })
      .filter((reading) =>
        reading.currentReading !== undefined &&
        reading.previousReading !== undefined &&
        reading.accountNumber &&
        reading.dueDate // Must have due date
      );

    setAllMeterReadings(allReadings);
  } catch (error) {
    console.error("Error fetching all meter readings:", error);
  }
};

const fetchRatesConfig = async () => {
  setRatesLoading(true);
  try {
    const ratesSnap = await getDocs(collection(db, "rates"));
    if (!ratesSnap.empty) {
      const doc = ratesSnap.docs[0];
      const data = doc.data() as RatesConfig;
      setRatesConfig({ id: doc.id, ...data });
      setEditTiers(data.tiers);
      setMinimumCharge(data.minimumCharge ?? 94.70);
    } else {
      // Default fallback if not found
      setRatesConfig({
        tiers: [
          { min: 0, max: 5, rate: 0.00 },
          { min: 6, max: 10, rate: 20.70 },
          { min: 11, max: 20, rate: 22.50 },
          { min: 21, max: 30, rate: 24.40 },
          { min: 31, max: 40, rate: 26.30 },
          { min: 41, max: "above", rate: 28.10 },
        ],
        minimumCharge: 94.70,
        updatedAt: new Date(),
      });
      setEditTiers([
        { min: 0, max: 5, rate: 0.00 },
        { min: 6, max: 10, rate: 20.70 },
        { min: 11, max: 20, rate: 22.50 },
        { min: 21, max: 30, rate: 24.40 },
        { min: 31, max: 40, rate: 26.30 },
        { min: 41, max: "above", rate: 28.10 },
      ]);
      setMinimumCharge(94.70);
    }
  } catch (e) {
    showNotification("Failed to load rates config.", "error");
  }
  setRatesLoading(false);
};
useEffect(() => {
  fetchRatesConfig();
}, []);

function validateTiersAscending(tiers: RateTier[]): string | null {
  if (tiers.length === 0) return null;
  for (let i = 0; i < tiers.length; i++) {
    const min = Number(tiers[i].min);
    const max = tiers[i].max === "above" || tiers[i].max === "over" ? Infinity : Number(tiers[i].max);

    // Min should not be greater than max (unless max is "above")
    if (max !== Infinity && min > max) {
      return `Tier ${i + 1}: Min (${min}) cannot be greater than Max (${max}).`;
    }
    // Next tier's min should be greater than previous tier's max
    if (i > 0) {
      const prevMax = tiers[i - 1].max === "above" || tiers[i - 1].max === "over" ? Infinity : Number(tiers[i - 1].max);
      if (min <= prevMax) {
        return `Tier ${i + 1}: Min (${min}) must be greater than previous Max (${prevMax}).`;
      }
    }
  }
  return null;
}
// --- NEW: Save/Update RatesConfig in Firestore ---
const saveRatesConfig = async () => {
    // Validate tiers before saving
  const validationError = validateTiersAscending(editTiers);
  if (validationError) {
    showNotification(validationError, "error");
    return;
  }
  setRatesLoading(true);
  try {
    const newConfig = {
      tiers: editTiers,
      minimumCharge: minimumCharge,
      updatedAt: new Date().toISOString(),
    };
    if (ratesConfig?.id) {
      await setDoc(doc(db, "rates", ratesConfig.id), newConfig);
    } else {
      await addDoc(collection(db, "rates"), newConfig);
    }
    setRatesConfig({ ...newConfig, id: ratesConfig?.id });
    setEditRates(false);
    showNotification("Rates updated successfully!", "success");
    fetchRatesConfig();
  } catch (e) {
    showNotification("Failed to save rates.", "error");
  }
  setRatesLoading(false);
};

const calculateBillingPeriodFromDueDate = (dueDateStr: string): string => {
  if (!dueDateStr) return "";
  const [day, month, year] = dueDateStr.split("/").map(Number);
  const dueDate = new Date(year, month - 1, day);
  const from = new Date(dueDate.getFullYear(), dueDate.getMonth() - 1, 1);
  const to = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);

  const format = (date: Date) =>
    `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;

  return `${format(from)} - ${format(to)}`;
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
  let remaining = usage;
  const minCharge = ratesConfig?.minimumCharge ?? 94.70;

  // --- Dynamically get minimum tier from ratesConfig ---
  const minTier = ratesConfig?.tiers?.[0];
  const minTierMin = typeof minTier?.min === "number" ? minTier.min : 0;
  const minTierMax = typeof minTier?.max === "number" ? minTier.max : 5;

  // Always apply minimum charge for any usage within the minimum tier (including 0)
  if (usage >= minTierMin && usage <= minTierMax) {
    total = minCharge;
    remaining = 0;
  } else if (usage > minTierMax) {
    total += minCharge; // Apply minimum charge for the first tier
    remaining -= (minTierMax - minTierMin + 1);
  }

  // Use dynamic tiers for the rest
  if (ratesConfig?.tiers) {
    for (let i = 1; i < ratesConfig.tiers.length && remaining > 0; i++) {
      const tier = ratesConfig.tiers[i];
      const tierMin = typeof tier.min === "number" ? tier.min : 0;
      const tierMax = tier.max === "above" || tier.max === "over" ? Infinity : Number(tier.max);
      const tierRange = tierMax === Infinity ? remaining : tierMax - tierMin + 1;
      const tierUsage = Math.min(remaining, tierRange);
      if (tierUsage > 0) {
        total += tierUsage * tier.rate;
        remaining -= tierUsage;
      }
    }
  }

  // Tax, discount, penalty
  const tax = total * billingData.taxRate;
  const discount = isSenior ? total * billingData.seniorDiscountRate : 0;
  const totalBeforePenalty = total + tax - discount;
  const penalty = totalBeforePenalty * billingData.penaltyRate;
  const totalAmountDue = totalBeforePenalty;

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

  const selectedReadingsData = selectedReadings
    .map((id) => meterReadings.find((r) => r.id === id))
    .filter(Boolean);

  await handleCreateBills(selectedReadingsData);
};

const handleCreateAllBills = async () => {
  if (filteredReadings.length === 0) {
    showNotification("No meter readings available to create bills", "info");
    return;
  }

  await handleCreateBills(filteredReadings);
};

// Modify the handleCreateBills function

const handleCreateBills = async (readings: MeterReading[]) => {
  setIsProcessing(true);

  try {
    let successCount = 0;
    let errorCount = 0;

    const { collection, doc, updateDoc, getDoc, getDocs, Timestamp, query, where, orderBy, limit, collectionGroup, writeBatch } =
      await import("firebase/firestore");
    const { db } = await import("../../lib/firebase");

    let currentGlobalBillNumber = await getLatestGlobalBillNumber();
    const processedReadingIds: string[] = [];

    // Sort readings by due date (oldest first)
    const sortedReadings = [...readings].sort((a, b) => {
      const [dayA, monthA, yearA] = a.dueDate.split("/").map(Number);
      const [dayB, monthB, yearB] = b.dueDate.split("/").map(Number);
      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);
      return dateA.getTime() - dateB.getTime();
    });

    // Check for missing previous bills (keep as is)
    const accountsWithMissingPreviousBills = new Map<string, MeterReading[]>();
    for (const reading of sortedReadings) {
      const customer = customers.find((c) => c.accountNumber === reading.accountNumber);
      if (!customer) continue;

      const accountReadingsQuery = query(
        collectionGroup(db, "records"),
        where("accountNumber", "==", reading.accountNumber),
        where("currentReading", "!=", null)
      );
      const accountReadingsSnapshot = await getDocs(accountReadingsQuery);
      const accountReadings = accountReadingsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as MeterReading))
        .filter(r => r.currentReading !== undefined && r.previousReading !== undefined)
        .sort((a, b) => {
          const [dayA, monthA, yearA] = a.dueDate.split("/").map(Number);
          const [dayB, monthB, yearB] = b.dueDate.split("/").map(Number);
          const dateA = new Date(yearA, monthA - 1, dayA);
          const dateB = new Date(yearB, monthB - 1, dayB);
          return dateA.getTime() - dateB.getTime();
        });

      const currentReadingIndex = accountReadings.findIndex(r => r.id === reading.id);
      if (currentReadingIndex > 0) {
        const missingBillReadings: MeterReading[] = [];
        for (let i = 0; i < currentReadingIndex; i++) {
          const prevReading = accountReadings[i];
          const prevBillingPeriod = calculateBillingPeriodFromDueDate(prevReading.dueDate);
          const billQuery = query(
            collection(db, "bills", reading.accountNumber, "records"),
            where("billingPeriod", "==", prevBillingPeriod)
          );
          const billSnapshot = await getDocs(billQuery);
          if (billSnapshot.empty) {
            missingBillReadings.push(prevReading);
          }
        }
        if (missingBillReadings.length > 0) {
          accountsWithMissingPreviousBills.set(reading.accountNumber, missingBillReadings);
        }
      }
    }

    if (accountsWithMissingPreviousBills.size > 0) {
      let alertMessage = "Cannot proceed. The following accounts have previous meter readings without bills that must be created first:\n\n";
      for (const [accountNumber, missingReadings] of accountsWithMissingPreviousBills.entries()) {
        const customer = customers.find(c => c.accountNumber === accountNumber);
        const customerName = customer ? customer.name : "Unknown";
        const sortedMissingReadings = [...missingReadings].sort((a, b) => {
          const [dayA, monthA, yearA] = a.dueDate.split("/").map(Number);
          const [dayB, monthB, yearB] = b.dueDate.split("/").map(Number);
          const dateA = new Date(yearA, monthA - 1, dayA);
          const dateB = new Date(yearB, monthB - 1, dayB);
          return dateA.getTime() - dateB.getTime();
        });
        alertMessage += `Account ${accountNumber} (${customerName}) - Missing bills for due dates: ${sortedMissingReadings.map(r => r.dueDate).join(", ")}\n`;
      }
      alertMessage += "\nPlease create bills for the earlier meter readings first.";
      alert(alertMessage);
      showNotification("Cannot proceed. Please create bills for previous meter readings first.", "error");
      setIsProcessing(false);
      return;
    }

    // --- BATCHED BILL CREATION ---
    let batch = writeBatch(db);
    let batchCount = 0;

    for (const reading of sortedReadings) {
      try {
        const customer = customers.find((c) => c.accountNumber === reading.accountNumber);
        if (!customer) {
          errorCount++;
          continue;
        }

        const usage = reading.currentReading - reading.previousReading;
        if (usage < 0) {
          errorCount++;
          continue;
        }

        const billingPeriod = calculateBillingPeriodFromDueDate(reading.dueDate);

        // Fetch latest customer data to get scfAmount
        const customerRef = doc(db, "customers", customer.id);
        const customerSnap = await getDoc(customerRef);
        const customerData = customerSnap.data();
        let scfAmount = customerData?.scfAmount ?? 0;

        // Determine SCF to apply (max ₱500, or remaining scfAmount)
        let scfToApply = 0;
        if (scfAmount > 0) {
          scfToApply = Math.min(500, scfAmount);
        }

        const isSenior = customer.isSenior || false;
        const billCalc = calculateBillAmount(usage, isSenior);

        if (usage === 0 && billCalc.waterCharge === 0) {
          billCalc.waterCharge = ratesConfig?.minimumCharge ?? 94.70;
          billCalc.totalAmountDue = billCalc.waterCharge + billCalc.tax - billCalc.discount;
        }

        // Add SCF to bill
        const baseWaterCharge = billCalc.waterCharge;
        const totalChargeIncludingSCF = baseWaterCharge + scfToApply;

        // Calculate tax, discount, penalty on total
        const tax = totalChargeIncludingSCF * billingData.taxRate;
        const discount = isSenior ? totalChargeIncludingSCF * billingData.seniorDiscountRate : 0;
        const totalBeforePenalty = totalChargeIncludingSCF + tax - discount;
        const penalty = totalBeforePenalty * billingData.penaltyRate;
        const totalAmountDue = totalBeforePenalty;

        // Calculate arrears - Sum of all pending bills
        let arrears = 0;
        const billsRef = collection(db, "bills", reading.accountNumber, "records");
        const unpaidBillsSnapshot = await getDocs(billsRef);
        unpaidBillsSnapshot.forEach((doc) => {
          const bill = doc.data();
        if (
            (bill.status !== "paid") &&
            bill.billingPeriod !== billingPeriod &&
            parseFloat(bill.amount) > 0
          ) {
            arrears += parseFloat(bill.amount) || 0;
          }
        });
        arrears = Number(arrears.toFixed(2));

        // Retrieve the latest bill to check for any overpayment
        let previousBillNumber = "";
        let availableOverpayment = 0;
        const billsCollectionRef = collection(db, "bills", reading.accountNumber, "records");
        const latestBillQuery = query(
          billsCollectionRef,
          orderBy("date", "desc"),
          limit(1)
        );
        const latestBillSnap = await getDocs(latestBillQuery);
        if (!latestBillSnap.empty) {
          const latestBillData = latestBillSnap.docs[0].data();
          availableOverpayment = parseFloat(latestBillData.overPayment || 0);
          previousBillNumber = latestBillData.billNumber || "";
        }

        let appliedOverpayment = 0;
        let currentAmountDue = totalAmountDue;
        let overpaymentSourceBill = "";
        let remainingOverpayment = 0;

        if (availableOverpayment > 0) {
          overpaymentSourceBill = previousBillNumber;
          if (availableOverpayment >= totalAmountDue) {
            appliedOverpayment = totalAmountDue;
            currentAmountDue = 0;
            remainingOverpayment = availableOverpayment - totalAmountDue;
          } else {
            appliedOverpayment = availableOverpayment;
            currentAmountDue = totalAmountDue - availableOverpayment;
            remainingOverpayment = 0;
          }
          appliedOverpayment = Number(appliedOverpayment.toFixed(2));
          currentAmountDue = Number(currentAmountDue.toFixed(2));
          remainingOverpayment = Number(remainingOverpayment.toFixed(2));
        }

        const billNumber = String(currentGlobalBillNumber + 1).padStart(10, "0");
        const formattedAddress = customer.block && customer.lot
          ? `BLK ${customer.block}, LOT ${customer.lot}, ${customer.address || ""}`
          : customer.address || "";
        const amountWithArrears = Number((currentAmountDue + arrears).toFixed(2));

        const billData = {
          customerId: customer.id,
          customerName: customer.name,
          customerAddress: formattedAddress,
          date: Timestamp.now(),
          amount: Number(currentAmountDue.toFixed(2)),
          originalAmount: Number(totalAmountDue.toFixed(2)),
          status: currentAmountDue === 0 ? "paid" : "pending",
          dueDate: reading.dueDate,
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
          waterCharge: Number(baseWaterCharge.toFixed(2)),
          waterChargeBeforeTax: Number(baseWaterCharge.toFixed(2)),
          tax: Number(tax.toFixed(2)),
          seniorDiscount: Number(discount.toFixed(2)),
          penalty: Number(penalty.toFixed(2)),
          amountAfterDue: Number((currentAmountDue + penalty).toFixed(2)),
          currentAmountDue: Number(currentAmountDue.toFixed(2)),
          arrears: arrears,
          billNumber: billNumber,
          overPayment: remainingOverpayment,
          appliedOverpayment: appliedOverpayment,
          overpaymentSourceBill: overpaymentSourceBill,
          rawCalculatedAmount: Number(totalAmountDue.toFixed(2)),
          amountWithArrears: amountWithArrears,
          scfApplied: scfToApply,
        };

        // Use batch.set for bill creation
        const billRef = doc(collection(db, "bills", reading.accountNumber, "records"));
        batch.set(billRef, billData);
        batchCount++;
        currentGlobalBillNumber++;
        processedReadingIds.push(reading.id!);
        successCount++;

        // Subtract SCF from customer if applied (must be outside batch, as batch only supports one doc per collection)
        if (scfToApply > 0) {
          await updateDoc(customerRef, {
            scfAmount: scfAmount - scfToApply
          });
        }

        // Commit batch every 500 writes
        if (batchCount === 500) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      } catch (error) {
        console.error("Error creating bill:", error);
        errorCount++;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    setMeterReadings((prev) => prev.filter((reading) => !processedReadingIds.includes(reading.id!)));
    setFilteredReadings((prev) => prev.filter((reading) => !processedReadingIds.includes(reading.id!)));

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
  // ...existing code...
const fetchBillsData = async () => {
  setLoadingState("loading");
  try {
    const customersSnapshot = await getDocs(collection(db, "customers"));
    const customersData = customersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Customer[];

    // For each customer, fetch their bills and calculate total amount due
    const billsData = await Promise.all(
      customersData.map(async (customer) => {
        // Defensive: skip if no accountNumber
        if (!customer.accountNumber) {
          return {
            accountNumber: "N/A",
            name: customer.name || `${customer.firstName || ""} ${customer.lastName || ""}`,
            email: customer.email || customer.phone || "N/A",
            totalAmountDue: 0,
            status: "no account",
            site: customer.site || "",
            isSenior: customer.isSenior || false,
          };
        }

        const billsRef = collection(db, "bills", customer.accountNumber, "records");
        let totalAmountDue = 0;
        let billsSnapshot;
        try {
          billsSnapshot = await getDocs(billsRef);
        } catch (e) {
          billsSnapshot = { docs: [] };
        }

        billsSnapshot.docs.forEach((billDoc) => {
          const bill = billDoc.data();
          
          // Use the canonical current due value (which already includes penalties from Cloud Function)
          const billCurrent = Number(bill.currentAmountDue ?? bill.amountAfterDue ?? bill.amount ?? 0);

          // Count any non-paid bills (pending, partially paid, overdue)
          if ((bill.status !== "paid") && billCurrent > 0) {
            totalAmountDue += billCurrent;
           }
          });

        return {
          accountNumber: customer.accountNumber,
          name: customer.name || `${customer.firstName || ""} ${customer.lastName || ""}`,
          email: customer.email || customer.phone || "N/A",
          totalAmountDue: totalAmountDue,
          status: totalAmountDue > 0 ? "pending" : "paid",
          site: customer.site || "",
          isSenior: customer.isSenior || false,
        };
      })
    );

    setBills(billsData);
    setLoadingState("success");
  } catch (err) {
    console.error("Error fetching bills data:", err);
    setLoadingState("error");
    showNotification("Failed to load bills data.", "error");
  }
};
// ...existing code...
const handleExportDisconnectionToExcel = async () => {
  try {
    showNotification("Preparing disconnection list export...", "info");

    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    const currentDate = new Date().toLocaleDateString();

    // Color palette (reuse from bills export)
    const colors = {
      darkBlue: { argb: 'FF1A5980' },
      mediumBlue: { argb: 'FF1E88E5' },
      lightBlue: { argb: 'FFB3E0FF' },
      paleBlue: { argb: 'FFE1F5FE' },
      accentTeal: { argb: 'FF00ACC1' },
      accentYellow: { argb: 'FFFFAB40' },
      white: { argb: 'FFFFFFFF' },
      lightRed: { argb: 'FFF2DEDE' },
      lightYellow: { argb: 'FFFFF9E6' },
    };

    // Styling helpers
    const applyTitleStyle = (row) => {
      row.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
      row.alignment = { horizontal: 'center', vertical: 'middle' };
      row.height = 36;
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: colors.darkBlue
        };
        cell.border = {
          top: { style: 'thin', color: colors.mediumBlue },
          left: { style: 'thin', color: colors.mediumBlue },
          bottom: { style: 'thin', color: colors.mediumBlue },
          right: { style: 'thin', color: colors.mediumBlue }
        };
      });
    };
    const applyHeaderStyle = (row) => {
      row.height = 24;
      row.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: colors.mediumBlue
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: colors.darkBlue },
          left: { style: 'thin', color: colors.darkBlue },
          bottom: { style: 'thin', color: colors.darkBlue },
          right: { style: 'thin', color: colors.darkBlue }
        };
      });
    };
    const applyDataRowStyle = (row, isAlternate = false) => {
      row.height = 20;
      row.eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: isAlternate ? colors.paleBlue : colors.white
        };
        cell.border = {
          top: { style: 'hair', color: colors.lightBlue },
          left: { style: 'hair', color: colors.lightBlue },
          bottom: { style: 'hair', color: colors.lightBlue },
          right: { style: 'hair', color: colors.lightBlue }
        };
        cell.alignment = {
          horizontal: 'left',
          vertical: 'middle',
          indent: 1
        };
      });
    };
    const setFixedColumnWidths = (sheet, columnWidths) => {
      columnWidths.forEach((width, index) => {
        sheet.getColumn(index + 1).width = width;
      });
    };
    const addFooter = (sheet, columnCount) => {
      sheet.addRow(['']);
      sheet.addRow(['']);
      const footerRow = sheet.addRow(['Generated by Water Billing System']);
      sheet.mergeCells(sheet.rowCount, 1, sheet.rowCount, columnCount);
      footerRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: colors.lightBlue
      };
      footerRow.getCell(1).font = {
        italic: true,
        color: colors.darkBlue,
        size: 10
      };
      footerRow.getCell(1).alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
      const dateRow = sheet.addRow([`Report generated on: ${currentDate}`]);
      sheet.mergeCells(sheet.rowCount, 1, sheet.rowCount, columnCount);
      dateRow.getCell(1).font = {
        italic: true,
        color: colors.darkBlue,
        size: 8
      };
      dateRow.getCell(1).alignment = { horizontal: 'right' };
    };

    // 1. Cover Sheet
    const coverSheet = workbook.addWorksheet('Disconnection Overview');
    setFixedColumnWidths(coverSheet, [25, 25, 25, 25, 25]);
    coverSheet.addRow(['']);
    coverSheet.addRow(['']);
    const logoRow = coverSheet.addRow(['🔌']);
    logoRow.height = 40;
    logoRow.getCell(1).font = { size: 36, color: colors.mediumBlue };
    logoRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    coverSheet.mergeCells(logoRow.number, 1, logoRow.number, 5);
    const coverTitle = coverSheet.addRow(['DISCONNECTION NOTICE REPORT']);
    applyTitleStyle(coverTitle);
    coverSheet.mergeCells(coverTitle.number, 1, coverTitle.number, 5);
    coverSheet.addRow(['']);
    coverSheet.addRow(['']);
    const infoRows = [
      ['Generated on:', currentDate],
      ['Report Type:', 'Disconnection Notices'],
      ['Total Customers:', disconnectionList.length.toString()],
      ['Purpose:', 'List of customers with 2 or more months unpaid bills'],
    ];
    infoRows.forEach((rowData, index) => {
      const row = coverSheet.addRow(rowData);
      applyDataRowStyle(row, index % 2 === 0);
      row.getCell(1).font = { bold: true, color: colors.darkBlue };
      coverSheet.mergeCells(row.number, 2, row.number, 5);
    });
    coverSheet.addRow(['']);
    const tipRow = coverSheet.addRow(['Customers with 4+ months unpaid are highlighted for urgent action.']);
    tipRow.getCell(1).font = { italic: true, color: colors.accentTeal };
    coverSheet.mergeCells(tipRow.number, 1, tipRow.number, 5);
    addFooter(coverSheet, 5);

    // 2. Disconnection List Sheet
    const sheet = workbook.addWorksheet('Disconnection List');
    setFixedColumnWidths(sheet, [18, 25, 18, 18, 18]);
    const titleRow = sheet.addRow(['DISCONNECTION NOTICE LIST']);
    applyTitleStyle(titleRow);
    sheet.mergeCells(1, 1, 1, 5);
    sheet.addRow(['']);
    const headerRow = sheet.addRow([
      'Account #',
      'Name',
      'Site',
      'Unpaid Months',
      'Total Due (₱)'
    ]);
    applyHeaderStyle(headerRow);

    // Data rows
    disconnectionList.forEach((item, idx) => {
      const row = sheet.addRow([
        item.accountNumber,
        item.name,
        formatSiteName(item.site),
        item.unpaidCount,
        Number(item.totalDue).toFixed(2)
      ]);
      applyDataRowStyle(row, idx % 2 === 0);

      // Highlight urgent (4+ months) in red
      if (item.unpaidCount >= 4) {
        row.getCell(4).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: colors.lightRed
        };
        row.getCell(4).font = { color: { argb: 'FFB91C1C' }, bold: true };
      } else if (item.unpaidCount === 3) {
        row.getCell(4).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: colors.lightYellow
        };
        row.getCell(4).font = { color: { argb: 'FFCC8400' }, bold: true };
      }
      // Amount right-aligned
      row.getCell(5).alignment = { horizontal: 'right' };
    });

    addFooter(sheet, 5);

    // Print settings
    [coverSheet, sheet].forEach(sheet => {
      sheet.pageSetup.paperSize = 9;
      sheet.pageSetup.orientation = 'landscape';
      sheet.pageSetup.fitToPage = true;
      sheet.pageSetup.fitToWidth = 1;
      sheet.pageSetup.fitToHeight = 0;
      sheet.pageSetup.margins = {
        left: 0.7,
        right: 0.7,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3
      };
    });

    // Save the Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }),
      `Disconnection_Notice_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
    );

    showNotification("Disconnection list exported successfully!", "success");
  } catch (error) {
    console.error("Error exporting disconnection list:", error);
    showNotification("Failed to export disconnection list.", "error");
  }
};

const handlePrintAllDisconnectionNotices = async () => {
  // Filter the list based on current filters
  const filtered = disconnectionList.filter(item =>
    (disconnectionSiteFilter === "all" || item.site === disconnectionSiteFilter) &&
    (
      !disconnectionSearch ||
      item.accountNumber.toLowerCase().includes(disconnectionSearch.toLowerCase()) ||
      item.name.toLowerCase().includes(disconnectionSearch.toLowerCase())
    )
  );
  if (filtered.length === 0) {
    showNotification("No disconnection notices to print.", "info");
    return;
  }

  // Create a new window for printing
  const printWindow = window.open("", "_blank", "width=900,height=1200");
  if (!printWindow) {
    showNotification("Unable to open print window. Please allow pop-ups.", "error");
    return;
  }

  // Prepare the HTML for all notices
  const noticesHtml = filtered.map(item => {
    return `
      <div style="max-width:600px;margin:40px auto 60px auto;border:2px solid #000;padding:32px 28px 28px 28px;background:#fff;page-break-after:always;">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:18px;">
          <img src="${logoImage}" alt="Logo" style="width:64px;height:64px;object-fit:contain;" />
          <div>
            <div style="font-size:18px;font-weight:bold;">CENTENNIAL WATER RESOURCE VENTURE CORPORATION</div>
            <div style="font-size:12px;">Southville 7, Site 3, Brgy. Sto. Tomas, Calauan, Laguna</div>
          </div>
        </div>
        <div style="text-align:center;margin-bottom:32px;">
          <div style="font-size:22px;font-weight:bold;color:#b91c1c;">DISCONNECTION NOTICE</div>
          <div style="font-size:16px;margin-top:10px;">Account #: <b>${item.accountNumber}</b></div>
          <div style="font-size:16px;">Name: <b>${item.name}</b></div>
          ${item.site ? `<div style="font-size:16px;">Site: <b>${formatSiteName(item.site)}</b></div>` : ""}
          <div style="font-size:16px;">Unpaid Months: <b>${item.unpaidCount}</b></div>
          <div style="font-size:16px;">Total Due: <b>₱${item.totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b></div>
        </div>
        <div style="background:#dc2626;color:#fff;padding:18px 0 10px 0;margin-bottom:18px;text-align:center;">
          <div style="font-size:20px;font-weight:bold;letter-spacing:1px;">⚠ PLEASE PAY FULL AMOUNT ⚠</div>
          <div style="font-size:18px;font-weight:bold;margin-top:4px;">₱${item.totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div style="background:#fef9c3;border-left:6px solid #eab308;padding:16px 18px 16px 18px;margin-bottom:32px;">
          <div style="font-weight:600;color:#92400e;">
            Our records show that your account has unpaid water bills for ${item.unpaidCount} months.<br>
            Please settle your outstanding balance within <b>5 days</b> from receipt of this notice to avoid service disconnection.
          </div>
          <ul style="margin-left:20px;margin-top:10px;font-size:14px;color:#92400e;">
            <li>Payment after the due date may result in penalties.</li>
            <li>Disconnection will be done without further notice if payment is not received.</li>
            <li>For questions, please contact our office immediately.</li>
          </ul>
        </div>
        <div style="text-align:center;margin-top:40px;">
          <div style="font-weight:bold;font-size:18px;color:#b91c1c;">
            THIS IS AN OFFICIAL NOTICE. PLEASE DISREGARD IF PAYMENT HAS BEEN MADE.
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Print styles
  const printStyles = `
    <style>
      @media print {
        body { background: #fff; }
        .print-hidden { display: none !important; }
        div[style*="page-break-after:always"] { page-break-after: always; }
      }
      body { margin: 0; padding: 0; background: #f3f4f6; }
    </style>
  `;

  // Write content to print window
  printWindow.document.write(`
    <html>
      <head>
        <title>Disconnection Notices</title>
        ${printStyles}
      </head>
      <body>
        <div style="margin:0;padding:0;">
          ${noticesHtml}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 400);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();

  showNotification("All disconnection notices sent to printer.", "success");
};
// ...existing code...
const handlePrintAllReceipts = async (printFilterMonth?: string, printFilterYear?: string, filterSite?: string) => {
  try {
    showNotification("Preparing bills for printing...", "info");

    const allBillsSnapshot = await getDocs(collectionGroup(db, "records"));
    if (allBillsSnapshot.empty) {
      showNotification("No bills found to print.", "info");
      return;
    }

        // Build a quick customer map for site fallback (accountNumber -> site)
    const customersSnapshot = await getDocs(collection(db, "customers"));
    const customerSiteMap = new Map<string, string>();
    customersSnapshot.docs.forEach(d => {
      const cd: any = d.data();
      if (cd?.accountNumber) {
        customerSiteMap.set(cd.accountNumber, cd.site || "");
      }
    });

    // Only keep docs that look like bills
    let filteredDocs = allBillsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return data && data.billNumber && data.customerName;
    });

    // Apply Month / Year filters (apply if either is set and not "all")
    const monthFilterActive = !!printFilterMonth && printFilterMonth !== "all";
    const yearFilterActive = !!printFilterYear && printFilterYear !== "all";

    if (monthFilterActive || yearFilterActive) {
      filteredDocs = filteredDocs.filter((doc) => {
        const data: any = doc.data();
        // dueDate expected dd/mm/yyyy; if missing, try other fields
        const due = typeof data.dueDate === "string" ? data.dueDate : "";
        if (!due) return false;
        const parts = due.split("/");
        if (parts.length !== 3) return false;
        const [, month, year] = parts;
        if (monthFilterActive && month !== printFilterMonth) return false;
        if (yearFilterActive && year !== printFilterYear) return false;
        return true;
      });

      if (filteredDocs.length === 0) {
        alert("No bills found to print for selected month/year.");
        return;
      }
    }

    // Apply Site Filter with fallback to customer map or customerAddress parsing
    if (filterSite && filterSite !== "all") {
      const normalizeSiteFromAddress = (addr: string) => {
        if (!addr) return "";
        const m = addr.match(/site\s*#?\s*(\d+)/i) || addr.match(/site\s*(\d+)/i);
        return m ? `site${m[1]}` : "";
      };

      filteredDocs = filteredDocs.filter((doc) => {
        const data: any = doc.data();
        // direct site field
        if (data.site) return data.site === filterSite;
        // fallback to customer map (accountNumber key)
        if (data.accountNumber) {
          const custSite = customerSiteMap.get(data.accountNumber);
          if (custSite) return custSite === filterSite;
        }
        // fallback to parsing address for "Site X"
        const addr = data.customerAddress || "";
        const parsed = normalizeSiteFromAddress(addr);
        if (parsed) return parsed === filterSite;
        return false;
      });

      if (filteredDocs.length === 0) {
        alert("No bills found to print for selected site.");
        return;
      }
    }

    const filteredBills = filteredDocs.map((doc) => ({
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
      amountWithArrears: doc.data().amountWithArrears || 0,
      accountNumber: doc.data().accountNumber || "00-00-0000",
      meterNumber: doc.data().meterNumber || "00000000",
      dueDate: doc.data().dueDate || "00/00/0000",
      penalty: doc.data().penalty || 0,
      amountAfterDue: doc.data().amountAfterDue || 0,
      scfApplied: doc.data().scfApplied || 0,
    }));

    if (filteredBills.length === 0) {
      showNotification("No valid bills found to print.", "info");
      return;
    }

    // Fetch customers for credentials
    const customersList = customersSnapshot.docs.map((d) => ({
      accountNumber: d.data().accountNumber,
      email: d.data().email,
      phone: d.data().phone,
    }));

    const getLoginCredentials = (accountNumber: string) => {
      const customer = customersList.find((c) => c.accountNumber === accountNumber);
      return {
        username: customer?.email || customer?.phone || "N/A",
        password: accountNumber || "N/A",
      };
    };

    // Earliest bill per account for showing credentials
    const billsByAccount: Record<string, { id: string; dueDate: string }[]> = {};
    filteredDocs.forEach((d) => {
      const acct = d.data().accountNumber || "N/A";
      billsByAccount[acct] = billsByAccount[acct] || [];
      billsByAccount[acct].push({ id: d.id, dueDate: d.data().dueDate || "00/00/0000" });
    });
    const earliestBillIdByAccount: Record<string, string> = {};
    Object.keys(billsByAccount).forEach((acct) => {
      const arr = billsByAccount[acct];
      arr.sort((a, b) => {
        const [da, ma, ya] = a.dueDate.split("/").map(Number);
        const [db, mb, yb] = b.dueDate.split("/").map(Number);
        return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
      });
      earliestBillIdByAccount[acct] = arr[0]?.id;
    });

    // Pre-generate QR and build rates breakdown HTML for each bill
    const billsWithQr = await Promise.all(
      filteredBills.map(async (bill) => {
        const qrPayload = JSON.stringify({
          billNumber: bill.billNumber,
          customerName: bill.customerName,
          amount: bill.amountWithArrears,
          dueDate: bill.dueDate,
          accountNumber: bill.accountNumber,
        });
        let qrDataUrl = "";
        try {
          qrDataUrl = await QRCode.toDataURL(qrPayload, { errorCorrectionLevel: "H", margin: 1, width: 300 });
        } catch (err) {
          console.warn("QR generation failed for", bill.billNumber, err);
        }

        // Build Rates Breakdown HTML using calculateTiers()
        let ratesTableHtml = "";
        try {
          const tiers = calculateTiers(Number(bill.waterUsage || 0));
          if (tiers && tiers.length > 0) {
            ratesTableHtml = `
              <div style="border:1px solid #000; background:#fff;">
                <div style="font-weight:700;text-align:center;padding:5px;border-bottom:1px solid #000;background:#efefef;font-size:11px;">Rates Breakdown</div>
                <table style="width:100%;border-collapse:collapse;font-size:9px;">
                  <thead>
                    <tr>
                      <th style="border:1px solid #000;padding:4px;background:#efefef;">Min</th>
                      <th style="border:1px solid #000;padding:4px;background:#efefef;">Max</th>
                      <th style="border:1px solid #000;padding:4px;background:#efefef;">Rate</th>
                      <th style="border:1px solid #000;padding:4px;background:#efefef;">Value</th>
                      <th style="border:1px solid #000;padding:4px;background:#efefef;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${tiers
                      .map((t: any) => {
                        const maxLabel = typeof t.max === "number" ? t.max : String(t.max);
                        const usage = t.usage ?? 0;
                        const amount = t.amount !== undefined ? Number(t.amount).toFixed(2) : Number((usage * (t.rate || 0)).toFixed(2));
                        return `<tr>
                                  <td style="border:1px solid #000;padding:4px;text-align:center;">${t.min}</td>
                                  <td style="border:1px solid #000;padding:4px;text-align:center;">${maxLabel}</td>
                                  <td style="border:1px solid #000;padding:4px;text-align:center;">${Number(t.rate).toFixed(2)}</td>
                                  <td style="border:1px solid #000;padding:4px;text-align:center;">${usage}</td>
                                  <td style="border:1px solid #000;padding:4px;text-align:right;padding-right:6px;">${amount}</td>
                                </tr>`;
                      })
                      .join("")}
                    <tr>
                      <td colspan="4" style="border:1px solid #000;padding:5px;text-align:right;font-weight:700;background:#fafafa;">Total:</td>
                      <td style="border:1px solid #000;padding:5px;text-align:right;font-weight:700;background:#fafafa;padding-right:6px;">${Number(bill.waterChargeBeforeTax || 0).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            `;
          } else {
            ratesTableHtml = `<div style="text-align:right;font-weight:700;padding:6px;border:1px solid #000;">Total: ${Number(bill.waterChargeBeforeTax || 0).toFixed(2)}</div>`;
          }
        } catch (e) {
          console.warn("Failed to build rates breakdown for", bill.billNumber, e);
          ratesTableHtml = `<div style="text-align:right;font-weight:700;padding:6px;border:1px solid #000;">Total: ${Number(bill.waterChargeBeforeTax || 0).toFixed(2)}</div>`;
        }

        return { ...bill, qrDataUrl, ratesTableHtml };
      })
    );

    // Styles - A4 portrait, compact layout matching reference image
    const styles = `
      <style>
        @page { size: A4 portrait; margin: 0.5cm; }
        html, body { height:100%; margin:0; padding:0; background:#fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: Arial, Helvetica, sans-serif; font-size:11px; color:#000; }
        .bill { width:100%; max-width:21cm; margin:0 auto; border:2px solid #000; padding:12px; box-sizing:border-box; page-break-after:always; background:#fff; }
        .top { display:flex; align-items:center; justify-content:space-between; gap:10px; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:12px; }
        .brand { display:flex; align-items:center; gap:10px; flex:1; }
        .logo { width:70px; height:70px; object-fit:contain; }
        .company { text-align:center; font-weight:700; font-size:14px; flex:1; }
        .meta { text-align:right; font-weight:700; min-width:180px; }
        .customer-readings-row { display:flex; gap:10px; margin-bottom:10px; align-items:flex-start; }
        .customer-info { flex:1; }
        .readings-table { width:420px; }
        table { border-collapse:collapse; width:100%; }
        th, td { border:1px solid #000; padding:5px; font-size:10px; vertical-align:middle; text-align:center; }
        th { background:#efefef; font-weight:700; }
        .billing-main { margin-bottom:10px; display:flex; gap:10px; align-items:flex-start; }
        .billing-left { flex:1; }
        .rates-box { width:320px; }
        .small { font-size:10px; }
        .bottom-credentials { display:flex; gap:10px; margin-top:10px; align-items:center; justify-content:space-between; }
        .credentials-box { text-align:center; padding:8px; border:1px solid #000; flex:1; }
        .qr-box { text-align:center; }
        .qr { width:120px; height:120px; object-fit:contain; }
        .note { font-size:10px; line-height:1.3; }
        .receipt-note { text-align:center; font-weight:700; margin:8px 0; padding:6px; border-top:1px solid #000; border-bottom:1px solid #000; }
        @media print {
          body { margin:0; padding:0; }
          .bill { margin:0; max-width:100%; }
        }
      </style>
    `;

    // Build bills HTML with portrait layout matching reference image
    const billsHtml = billsWithQr
      .map((bill, idx) => {
        const showCredentials = earliestBillIdByAccount[bill.accountNumber] === bill.id;
        const creds = getLoginCredentials(bill.accountNumber);

        return `
          <div class="bill" id="bill-${idx}">
            <div class="top">
              <div class="brand">
                <img src="${logoImage}" class="logo" alt="logo" />
                <div class="company">
                  <div style="font-size:15px;font-weight:700;">CENTENNIAL WATER RESOURCE VENTURE CORPORATION</div>
                  <div style="font-size:10px;font-weight:400;margin-top:2px;">Southville 7, Site 3, Brgy. Sto. Tomas, Calauan, Laguna</div>
                </div>
              </div>
              <div class="meta">
                <div style="font-size:10px;">BILLING STATEMENT NO.</div>
                <div style="font-size:22px;margin-top:4px;">${bill.billNumber}</div>
              </div>
            </div>

            <div class="customer-readings-row">
              <div class="customer-info">
                <div style="font-weight:700; font-size:16px; margin-bottom:4px;">${bill.customerName}</div>
                <div class="small" style="color:#333;">${bill.customerAddress}</div>
              </div>

              <div class="readings-table small">
                <table>
                  <thead>
                    <tr>
                      <th>Current<br/>Reading</th>
                      <th>Previous<br/>Reading</th>
                      <th>Consumption</th>
                      <th>Billing Month</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="font-weight:700;font-size:12px;">${bill.meterReading?.current || 0}</td>
                      <td style="font-weight:700;font-size:12px;">${bill.meterReading?.previous || 0}</td>
                      <td style="font-weight:700;font-size:12px;">${bill.waterUsage || 0}</td>
                      <td style="font-weight:700;font-size:11px;">${bill.billingPeriod || ""}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="billing-main">
              <div class="billing-left small">
                <table>
                  <thead>
                    <tr>
                      <th>Billing<br/>Period</th>
                      <th>Water</th>
                      <th>Tax</th>
                      <th>SCF</th>
                      <th>Senior<br/>Discount</th>
                      <th>Arrears</th>
                      <th>Over<br/>Payment</th>
                      <th>Amount<br/>Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="font-size:9px;">${bill.billingPeriod || ""}</td>
                      <td style="font-weight:600;">${Number(bill.waterChargeBeforeTax || 0).toFixed(2)}</td>
                      <td style="font-weight:600;">${Number(bill.tax || 0).toFixed(2)}</td>
                      <td style="font-weight:600;">${Number(bill.scfApplied || 0).toFixed(2)}</td>
                      <td style="font-weight:600;">${Number(bill.seniorDiscount || 0).toFixed(2)}</td>
                      <td style="font-weight:600;">${Number(bill.arrears || 0).toFixed(2)}</td>
                      <td style="font-weight:600;">${Number(bill.appliedOverpayment || 0).toFixed(2)}</td>
                      <td style="font-weight:800;font-size:11px;">${Number(bill.amountWithArrears || 0).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="rates-box">
                ${bill.ratesTableHtml || `<div style="text-align:center;padding:12px;color:#666;border:1px solid #000;">Rates breakdown not available</div>`}
              </div>
            </div>

            <div style="margin-bottom:10px;">
              <table>
                <thead>
                  <tr><th>Account#</th><th>Meter#</th><th>Due Date</th><th>Penalty</th><th>Amount After Due Date</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="font-weight:600;">${bill.accountNumber}</td>
                    <td style="font-weight:600;">${bill.meterNumber}</td>
                    <td style="font-weight:600;">${bill.dueDate}</td>
                    <td style="font-weight:600;">${Number(bill.penalty || 0).toFixed(2)}</td>
                    <td style="font-weight:800;font-size:11px;">${Number(bill.amountAfterDue || 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="note" style="margin-bottom:10px;">
              <div style="font-weight:700;margin-bottom:6px;font-size:11px;">MAHALAGANG PAALALA TUNGKOL SA INYONG WATER BILL:</div>
              <ol style="margin:0;padding-left:18px;">
                <li>HUWAG PONG KALILIMUTAN DALHIN ANG INYONG BILLING STATEMENT KAPAG KAYO AY MAGBABAYAD</li>
                <li>PARA MAIWASAN ANG PAGBABAYAD NG MULTA, MAGBAYAD PO NG INYONG BILLING STATEMENT NG MAS MAAGA O DI LALAGPAS SA INYONG DUE DATE.</li>
                <li>ANG SERBISYO PO NG INYONG TUBIG AY PUPUTULIN NG WALANG PAALALA KUNG DI KAYO MAKAPAGBAYAD SA LOOB NG LIMANG(5) ARAW PAGKATAPOS NG DUE DATE.</li>
              </ol>
            </div>

            <div class="receipt-note">
              "THIS WILL SERVE AS YOUR OFFICIAL RECEIPT WHEN MACHINE VALIDATED"
            </div>

            <div class="bottom-credentials">
              ${showCredentials ? `
                <div class="credentials-box">
                  <div style="font-weight:700;font-size:11px;margin-bottom:6px;">INITIAL LOGIN CREDENTIALS</div>
                  <div style="font-size:10px;margin:4px 0;"><span style="font-weight:600;">username:</span> ${creds.username}</div>
                  <div style="font-size:10px;margin:4px 0;"><span style="font-weight:600;">password:</span> ${creds.password}</div>
                  <div style="font-size:9px;color:#666;margin-top:6px;">Please change your password after your first login for security purposes.</div>
                </div>
              ` : `<div style="flex:1;"></div>`}
              
              <div class="qr-box">
                <img src="${bill.qrDataUrl || ""}" alt="qr" class="qr" />
                <div style="font-size:9px;color:#666;margin-top:4px;">Scan to view bill details</div>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    const printWindow = window.open("", "_blank", "width=1200,height=900,menubar=yes,toolbar=yes,scrollbars=yes");
    if (!printWindow) {
      showNotification("Unable to open print window. Please allow pop-ups.", "error");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Water Bills</title>
          ${styles}
        </head>
        <body>
          ${billsHtml}
          <script>
            window.onload = function() {
              setTimeout(function() { window.focus(); window.print(); }, 350);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    showNotification("Bills prepared for print preview (A4 portrait layout).", "success");
  } catch (error) {
    console.error("Error printing all receipts:", error);
    showNotification("Failed to print all receipts. Please try again.", "error");
  }
};
// ...existing code...
  
  // Helper functions
  
  // Format currency values
  function formatCurrency(value) {
    const num = parseFloat(value) || 0;
    return num.toFixed(2);
  }
  
  // Update the meter table values if needed - this converts billing period to month name for the meter table
  const formatBillingMonth = (billingPeriod) => {
    if (!billingPeriod) return "N/A";
    
    const monthNames = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];
    

    
    // Handle different formats
    if (billingPeriod.includes(" - ")) {
      // Format like "dd/mm/yyyy - dd/mm/yyyy"
      const [startDate] = billingPeriod.split(" - ");
      const dateParts = startDate.split("/");
      
      if (dateParts.length === 3) {
        const monthNum = parseInt(dateParts[1]); // Month is the second part in dd/mm/yyyy
        if (monthNum >= 1 && monthNum <= 12) {
          return `${monthNames[monthNum - 1]} ${dateParts[2]}`; // Month Year
        }
      }
    } else if (billingPeriod.includes("-")) {
      // Format like "4-2025"
      const parts = billingPeriod.split("-");
      if (parts.length === 2) {
        const monthNum = parseInt(parts[0]);
        if (monthNum >= 1 && monthNum <= 12) {
          return `${monthNames[monthNum - 1]} ${parts[1]}`;
        }
      }
    } else if (billingPeriod.includes("/")) {
      // Format like "dd/mm/yyyy"
      const dateParts = billingPeriod.split("/");
      if (dateParts.length === 3) {
        const monthNum = parseInt(dateParts[1]); // Month is the second part in dd/mm/yyyy
        if (monthNum >= 1 && monthNum <= 12) {
          return `${monthNames[monthNum - 1]} ${dateParts[2]}`;
        }
      }
    }
    
    return billingPeriod;
  };
  
  // Calculate water rate tiers
function calculateTiers(waterUsage: number) {
  if (!ratesConfig?.tiers) return [];
  const tiers = ratesConfig.tiers;
  const minCharge = ratesConfig.minimumCharge ?? 94.70;
  const minTier = tiers[0];
  const minTierMin = typeof minTier?.min === "number" ? minTier.min : 0;
  const minTierMax = typeof minTier?.max === "number" ? minTier.max : 5;

  let remainingUsage = waterUsage;
  let activeTiers: any[] = [];

  // Always show minimum charge for any usage within the minimum tier (including 0)
  if (waterUsage >= minTierMin && waterUsage <= minTierMax) {
    activeTiers.push({
      min: minTierMin,
      max: minTierMax,
      rate: minTier.rate,
      usage: waterUsage,
      amount: minCharge,
    });
    return activeTiers;
  } else if (waterUsage > minTierMax) {
    activeTiers.push({
      min: minTierMin,
      max: minTierMax,
      rate: minTier.rate,
      usage: minTierMax - minTierMin + 1,
      amount: minCharge,
    });
    remainingUsage -= (minTierMax - minTierMin + 1);
  }

  // Distribute remaining usage to other tiers
  for (let i = 1; i < tiers.length && remainingUsage > 0; i++) {
    const tierMin = tiers[i].min;
    const tierMax = tiers[i].max === "above" || tiers[i].max === "over" ? Infinity : Number(tiers[i].max);
    const tierRange = tierMax === Infinity ? remainingUsage : tierMax - tierMin + 1;
    const tierUsage = Math.min(remainingUsage, tierRange);
    if (tierUsage > 0) {
      activeTiers.push({
        min: tierMin,
        max: tiers[i].max,
        rate: tiers[i].rate,
        usage: tierUsage,
        amount: parseFloat((tierUsage * tiers[i].rate).toFixed(2)),
      });
      remainingUsage -= tierUsage;
    }
  }
  return activeTiers;
}
function calculateDefaultRates(usage: number) {
  return calculateTiers(usage);
}



// Define TypeScript interfaces for our data
interface BillData {
  accountNumber: string;
  name: string;
  email: string;
  totalAmountDue: number;
  status?: string;
  site?: string;
}

const handleExportBillsToExcel = async (exportBills = filteredBills) => {
  try {
    showNotification("Preparing Excel export...", "info");
    
    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    const currentDate = new Date().toLocaleDateString();
    
    // Set workbook properties
    workbook.creator = "Water Billing System";
    workbook.lastModifiedBy = "Water Billing System";
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.properties.date1904 = false;
    
    // Set custom properties for title and metadata
    workbook.title = "Water Bills Report";
    workbook.subject = "Customer Bills Analysis";
    workbook.keywords = "water, bills, customers, payments";
    
    // Color palette with blue theme
       const colors = {
      darkBlue: { argb: 'FF1A5980' },      // Deep blue
      mediumBlue: { argb: 'FF1E88E5' },    // Medium blue
      lightBlue: { argb: 'FFB3E0FF' },     // Light blue
      paleBlue: { argb: 'FFE1F5FE' },      // Very light blue
     
      accentTeal: { argb: 'FF00ACC1' },    // Teal accent
      accentYellow: { argb: 'FFFFAB40' },  // Yellow accent for ratings
      white: { argb: 'FFFFFFFF' },
      lightGreen: { argb: 'FFD8F0D8' },    // For paid status
      lightYellow: { argb: 'FFFFF9E6' },   // For pending status
      lightRed: { argb: 'FFF2DEDE' },      // For overdue status
    };
    
    // Common styling functions
    const applyTitleStyle = (row) => {
      row.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
      row.alignment = { horizontal: 'center', vertical: 'middle' };
      row.height = 36; // Taller row for title
      
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: colors.darkBlue
        };
        cell.border = {
          top: { style: 'thin', color: colors.mediumBlue },
          left: { style: 'thin', color: colors.mediumBlue },
          bottom: { style: 'thin', color: colors.mediumBlue },
          right: { style: 'thin', color: colors.mediumBlue }
        };
      });
    };
    
    const applySubtitleStyle = (row) => {
      row.font = { bold: true, size: 12, color: colors.darkBlue };
      row.height = 22;
      row.alignment = { horizontal: 'center', vertical: 'middle' };
    };
    
    const applyHeaderStyle = (row) => {
      row.height = 24; // Taller header rows
      row.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: colors.mediumBlue
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: colors.darkBlue },
          left: { style: 'thin', color: colors.darkBlue },
          bottom: { style: 'thin', color: colors.darkBlue },
          right: { style: 'thin', color: colors.darkBlue }
        };
      });
    };

    const applyDataRowStyle = (row, isAlternate = false) => {
      row.height = 20;
      row.eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: isAlternate ? colors.paleBlue : colors.white
        };
        cell.border = {
          top: { style: 'hair', color: colors.lightBlue },
          left: { style: 'hair', color: colors.lightBlue },
          bottom: { style: 'hair', color: colors.lightBlue },
          right: { style: 'hair', color: colors.lightBlue }
        };
        cell.alignment = { 
          horizontal: 'left', 
          vertical: 'middle',
          indent: 1
        };
      });
    };
    
    // Add an icon emoji
    const addIconEmoji = (sheet) => {
      const iconRow = sheet.addRow(['']);
      iconRow.getCell(1).value = {
        richText: [
          { 
            text: '💧 ', 
            font: { size: 16, color: colors.mediumBlue }
          },
          { 
            text: 'Water Bills Management',
            font: { bold: true, size: 12, color: colors.darkBlue } 
          }
        ]
      };
    };

    // Add a section header
    const addSectionHeader = (sheet, title, columnCount) => {
      // Add a blank row before section
      sheet.addRow(['']);
      
      // Add the section header
      const sectionRow = sheet.addRow([title]);
      sheet.mergeCells(sheet.rowCount, 1, sheet.rowCount, columnCount);
      
      sectionRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: colors.accentTeal
      };
      sectionRow.getCell(1).font = { 
        bold: true, 
        color: { argb: 'FFFFFFFF' },
        size: 12
      };
      sectionRow.getCell(1).alignment = { 
        horizontal: 'left',
        vertical: 'middle',
        indent: 1
      };
      sectionRow.height = 24;
      
      // Add blank row after section header
      sheet.addRow(['']);
    };
    
    // Add a footer to each sheet
    const addFooter = (sheet, columnCount) => {
      // Add blank rows for spacing
      sheet.addRow(['']);
      sheet.addRow(['']);
      
      // Add a footer row with message
      const footerRow = sheet.addRow(['Timely payments help maintain our water system. Thank you!']);
      sheet.mergeCells(sheet.rowCount, 1, sheet.rowCount, columnCount);
      
      footerRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: colors.lightBlue
      };
      footerRow.getCell(1).font = { 
        italic: true, 
        color: colors.darkBlue,
        size: 10
      };
      footerRow.getCell(1).alignment = { 
        horizontal: 'center',
        vertical: 'middle'
      };
      
      // Add the date row
      const dateRow = sheet.addRow([`Report generated on: ${currentDate}`]);
      sheet.mergeCells(sheet.rowCount, 1, sheet.rowCount, columnCount);
      
      dateRow.getCell(1).font = { 
        italic: true, 
        color: colors.darkBlue,
        size: 8
      };
      dateRow.getCell(1).alignment = { horizontal: 'right' };
    };
    
    // Set fixed column widths 
    const setFixedColumnWidths = (sheet, columnWidths) => {
      columnWidths.forEach((width, index) => {
        sheet.getColumn(index + 1).width = width;
      });
    };
    
    // 1. Cover Sheet
    const coverSheet = workbook.addWorksheet('Bills Overview');
    
    // Set fixed column widths
    setFixedColumnWidths(coverSheet, [25, 25, 25, 25, 25]);
    
    // Add some spacing
    coverSheet.addRow(['']);
    coverSheet.addRow(['']);
    
    // Add an icon/emoji as a logo placeholder
    const logoRow = coverSheet.addRow(['💧']);
    logoRow.height = 40;
    logoRow.getCell(1).font = { size: 36, color: colors.mediumBlue };
    logoRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    coverSheet.mergeCells(logoRow.number, 1, logoRow.number, 5);
    
    // Add title row
    const coverTitle = coverSheet.addRow(['WATER BILLS REPORT']);
    applyTitleStyle(coverTitle);
    coverSheet.mergeCells(coverTitle.number, 1, coverTitle.number, 5);
    
    // Add subtitle
    const coverSubtitle = coverSheet.addRow(['Comprehensive Billing Analysis']);
    applySubtitleStyle(coverSubtitle);
    coverSheet.mergeCells(coverSubtitle.number, 1, coverSubtitle.number, 5);
    
    // Add spacing
    coverSheet.addRow(['']);
    coverSheet.addRow(['']);
    
    // Add information section
    addSectionHeader(coverSheet, 'REPORT INFORMATION', 5);
    
    // Get total amount and customer counts for report info
    const totalBills = bills.length;
    const totalAmount = bills.reduce((sum, bill) => sum + Number((bill as BillData).totalAmountDue || 0), 0);
    const pendingBills = bills.filter(bill => Number((bill as BillData).totalAmountDue) > 0).length;
    
    const infoRows = [
      ['Generated on:', currentDate],
      ['Report Type:', 'Water Bills Analysis'],
      ['Total Customers:', totalBills.toString()],
      ['Total Amount Due:', `₱${formatCurrency(totalAmount)}`],
      ['Pending Payments:', pendingBills.toString()],
      ['Purpose:', 'Analyze customer billing status and outstanding payments'],
    ];
    
    infoRows.forEach((rowData, index) => {
      const row = coverSheet.addRow(rowData);
      applyDataRowStyle(row, index % 2 === 0);
      
      // Style the labels
      row.getCell(1).font = { bold: true, color: colors.darkBlue };
      
      // Merge cells for the current row
      coverSheet.mergeCells(row.number, 2, row.number, 5);
    });
    
    // Add content summary section
    addSectionHeader(coverSheet, 'REPORT CONTENTS', 5);
    
    const contentRows = [
      ['1.', 'Bills Summary', 'Key metrics and summary statistics'],
      ['2.', 'Bills by Site', 'Analysis of bills grouped by site location'],
      ['3.', 'Customer List', 'Complete list of all customers with billing status'],
    ];
    
    contentRows.forEach((rowData, index) => {
      const row = coverSheet.addRow(rowData);
      applyDataRowStyle(row, index % 2 === 0);
      
      // Style the number
      row.getCell(1).font = { bold: true, color: colors.mediumBlue };
      row.getCell(1).alignment = { horizontal: 'center' };
      
      // Style the sheet name
      row.getCell(2).font = { bold: true, color: colors.darkBlue };
      
      // Merge the description cells
      coverSheet.mergeCells(row.number, 3, row.number, 5);
    });
    
    // Add a tip
    addSectionHeader(coverSheet, 'BILLING TIP', 5);
    
    const tipRow = coverSheet.addRow(['Water conservation can lower your bill by up to 30%. Consider installing water-efficient appliances.']);
    tipRow.getCell(1).font = { italic: true, color: colors.accentTeal };
    coverSheet.mergeCells(tipRow.number, 1, tipRow.number, 5);
    
    // Add footer
    addFooter(coverSheet, 5);
    
    // 2. Bills Summary Sheet
    const summarySheet = workbook.addWorksheet('Bills Summary');
    
    // Set fixed column widths
    setFixedColumnWidths(summarySheet, [30, 20]);
    
    // Add title
    const summaryTitle = summarySheet.addRow(['BILLS SUMMARY STATISTICS']);
    applyTitleStyle(summaryTitle);
    summarySheet.mergeCells(1, 1, 1, 2);
    
    // Add icon
    addIconEmoji(summarySheet);
    
    summarySheet.addRow(['']); // Blank row
    
    // Calculate statistics from bills data
    const paidBills = bills.filter(bill => Number(bill.totalAmountDue) === 0).length;
    const paidPercentage = totalBills > 0 ? (paidBills / totalBills * 100).toFixed(1) : 0;
    
    // Calculate average bill amount for pending bills
    const pendingBillsData = bills.filter(bill => Number((bill as BillData).totalAmountDue) > 0);
    const averageBillAmount = pendingBillsData.length > 0 
      ? pendingBillsData.reduce((sum, bill) => sum + Number((bill as BillData).totalAmountDue || 0), 0) / pendingBillsData.length 
      : 0;
    
    // Add header row
    const summaryHeader = summarySheet.addRow(['Metric', 'Value']);
    applyHeaderStyle(summaryHeader);
    
    // Add data rows with alternating colors
    const summaryData = [
      ['Total Customers', totalBills.toString()],
      ['Total Amount Due', `₱${formatCurrency(totalAmount)}`],
      ['Paid Bills', paidBills.toString()],
      ['Payment Rate', `${paidPercentage}%`],
      ['Average Bill Amount', `₱${formatCurrency(averageBillAmount)}`],
      ['Pending Payments', pendingBills.toString()],
    ];
    
    summaryData.forEach((item, index) => {
      const row = summarySheet.addRow(item);
      applyDataRowStyle(row, index % 2 === 0);
      
      // Right align value cell
      row.getCell(2).alignment = { horizontal: 'right' };
      
      // Add icons based on metric type
      if (item[0].includes('Total Customers')) {
        row.getCell(1).value = {
          richText: [
            { text: '👥 ', font: { size: 12 } },
            { text: item[0], font: { bold: true } }
          ]
        };
      } else if (item[0].includes('Total Amount')) {
        row.getCell(1).value = {
          richText: [
            { text: '💰 ', font: { size: 12 } },
            { text: item[0], font: { bold: true } }
          ]
        };
      } else if (item[0].includes('Paid Bills')) {
        row.getCell(1).value = {
          richText: [
            { text: '✅ ', font: { size: 12 } },
            { text: item[0], font: { bold: true } }
          ]
        };
      } else if (item[0].includes('Payment Rate')) {
        row.getCell(1).value = {
          richText: [
            { text: '📊 ', font: { size: 12 } },
            { text: item[0], font: { bold: true } }
          ]
        };
      } else if (item[0].includes('Average')) {
        row.getCell(1).value = {
          richText: [
            { text: '⚖️ ', font: { size: 12 } },
            { text: item[0], font: { bold: true } }
          ]
        };
      } else if (item[0].includes('Pending')) {
        row.getCell(1).value = {
          richText: [
            { text: '⏳ ', font: { size: 12 } },
            { text: item[0], font: { bold: true } }
          ]
        };
      }
    });
    
    // Define the interface for site groups
    interface SiteGroup {
      count: number;
      amount: number;
    }
    
    // Group bills by site with type safety
    const siteGroups: Record<string, SiteGroup> = {};
    bills.forEach(bill => {
      const typedBill = bill as BillData;
      const site = typedBill.site || 'Unspecified';
      if (!siteGroups[site]) {
        siteGroups[site] = {
          count: 0,
          amount: 0
        };
      }
      siteGroups[site].count++;
      siteGroups[site].amount += Number(typedBill.totalAmountDue || 0);
    });
    
    // Add section header for site breakdown
    addSectionHeader(summarySheet, 'SITE BREAKDOWN', 2);
    
    // Sort sites by total amount
    const sortedSites = Object.entries(siteGroups)
      .sort((a, b) => b[1].amount - a[1].amount);
    
    // Site breakdown header
    const siteHeader = summarySheet.addRow(['Site', 'Amount Due']);
    applyHeaderStyle(siteHeader);
    
    // Add site data rows
    sortedSites.forEach((item, index) => {
      const [site, data] = item;
      const percentage = (data.amount / totalAmount * 100).toFixed(1);
      
      const row = summarySheet.addRow([
        `${site} (${data.count} customers)`, 
        `₱${formatCurrency(data.amount)} (${percentage}%)`
      ]);
      applyDataRowStyle(row, index % 2 === 0);
      
      // Right align value cell
      row.getCell(2).alignment = { horizontal: 'right' };
      
      // Highlight major sites
      if (data.amount > totalAmount * 0.2) {
        row.eachCell(cell => {
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: colors.lightBlue
          };
        });
      }
    });
    
    // Add footer
    addFooter(summarySheet, 2);
    
    // 3. Customers List Sheet
    const customersSheet = workbook.addWorksheet('Customer List');
    
    // Set fixed column widths
    setFixedColumnWidths(customersSheet, [18, 25, 25, 20, 15, 15]);
    
    // Add title
    const customersTitle = customersSheet.addRow(['WATER BILLS - CUSTOMER LIST']);
    applyTitleStyle(customersTitle);
    customersSheet.mergeCells(1, 1, 1, 6);
    
    // Add icon
    addIconEmoji(customersSheet);
    
    customersSheet.addRow(['']); // Blank row
    
    // Add header row
    const customersHeader = customersSheet.addRow([
      'Account #', 
      'Customer Name', 
      'Email/Phone', 
      'Amount Due', 
      'Status',
      'Site'
    ]);
    applyHeaderStyle(customersHeader);
    
    // Add data rows with alternating colors
    bills.forEach((bill, index) => {
      // Ensure type safety by explicitly typing the bill
      const typedBill = bill as BillData;
      const status = Number(typedBill.totalAmountDue) > 0 ? 'Pending' : 'Paid';
      
      const row = customersSheet.addRow([
        typedBill.accountNumber,
        typedBill.name,
        typedBill.email,
        `₱${formatCurrency(Number(typedBill.totalAmountDue))}`,
        status,
        typedBill.site || 'Unspecified'
      ]);
      
      applyDataRowStyle(row, index % 2 === 0);
      
      // Style Amount Due cell - right aligned
      row.getCell(4).alignment = { horizontal: 'right' };
      
      // Style Status cell with color coding
      if (status === 'Paid') {
        row.getCell(5).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: colors.lightGreen
        };
        row.getCell(5).font = { color: { argb: 'FF008000' }, bold: true };
        row.getCell(5).alignment = { horizontal: 'center' };
      } else {
        row.getCell(5).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: colors.lightYellow
        };
        row.getCell(5).font = { color: { argb: 'FFCC8400' }, bold: true };
        row.getCell(5).alignment = { horizontal: 'center' };
      }
    });
    
    // Add a section for payment analysis
    addSectionHeader(customersSheet, 'PAYMENT STATUS ANALYSIS', 6);
    
    const statusSummary = customersSheet.addRow([
      `Total Customers: ${totalBills}`, 
      `Paid: ${paidBills} (${paidPercentage}%)`,
      `Pending: ${pendingBills} (${(100 - Number(paidPercentage)).toFixed(1)}%)`,
      `Total Due: ₱${formatCurrency(totalAmount)}`,
      '', ''
    ]);
    customersSheet.mergeCells(statusSummary.number, 4, statusSummary.number, 6);
    
    statusSummary.eachCell((cell, colNumber) => {
      cell.font = { bold: true, color: colors.darkBlue };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: colors.paleBlue
      };
    });
    
    // Add footer
    addFooter(customersSheet, 6);
    
    // Apply print settings to all worksheets
    [coverSheet, summarySheet, customersSheet].forEach(sheet => {
      // Paper size (A4)
      sheet.pageSetup.paperSize = 9;
      
      // Landscape orientation for better fit
      sheet.pageSetup.orientation = 'landscape';
      
      // Fit all columns on one page
      sheet.pageSetup.fitToPage = true;
      sheet.pageSetup.fitToWidth = 1;
      sheet.pageSetup.fitToHeight = 0;
      
      // Header and footer margins
      sheet.pageSetup.margins = {
        left: 0.7,
        right: 0.7,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3
      };
    });
    
    // Save the Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      }),
      `Water_Bills_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    
    showNotification("Bills report exported successfully!", "success");
  } catch (error) {
    console.error("Error creating Excel file:", error);
    showNotification("Failed to export bills to Excel. Please try again.", "error");
  }
};

const filteredBills = bills.filter((bill) => {
  // Filter by site
  if (billingFilterSite && billingFilterSite !== "all" && bill.site !== billingFilterSite) {
    return false;
  }
  // Filter by senior
  if (billingFilterSenior && !bill.isSenior) {
    return false;
  }
  // Filter by search term (account number, name, or email/phone)
  if (
    billingSearchTerm &&
    !(
      (bill.accountNumber && bill.accountNumber.toLowerCase().includes(billingSearchTerm.toLowerCase())) ||
      (bill.name && bill.name.toLowerCase().includes(billingSearchTerm.toLowerCase())) ||
      (bill.email && bill.email.toLowerCase().includes(billingSearchTerm.toLowerCase()))
    )
  ) {
    return false;
  }
  return true;
});

// Pagination constants
const itemsPerPage = 10;

// Sort and paginate bills for display
const sortedFilteredBills = [...filteredBills]
  .sort((a, b) => {
    if (a.totalAmountDue > 0 && b.totalAmountDue === 0) return -1;
    if (a.totalAmountDue === 0 && b.totalAmountDue > 0) return 1;
    if (a.totalAmountDue > 0 && b.totalAmountDue > 0) {
      return b.totalAmountDue - a.totalAmountDue;
    }
    return (a.name || "").localeCompare(b.name || "");
  });

const paginatedBills = sortedFilteredBills.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
const totalPages = Math.ceil(sortedFilteredBills.length / itemsPerPage);


  // --- BEGIN: Disconnection List Logic ---
  interface DisconnectionItem {
    accountNumber: string;
    name: string;
    site?: string;
    unpaidCount: number;
    totalDue: number;
  }
  
  const [disconnectionList, setDisconnectionList] = useState<DisconnectionItem[]>([]);
  
  // Helper to fetch and compute disconnection list
 // ...existing code...
useEffect(() => {
  const computeDisconnectionList = async () => {
    try {
      // Fetch all customers once
      const customersSnapshot = await getDocs(collection(db, "customers"));
      const customersData = customersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Customer[];

      // Fetch all unpaid bills in one query
      const unpaidBillsSnapshot = await getDocs(
        query(
          collectionGroup(db, "records"),
          where("status", "in", ["pending", "partially paid", "overdue"])
        )
      );

      // Group unpaid bills by accountNumber
      const billsByAccount: Record<string, any[]> = {};
      unpaidBillsSnapshot.docs.forEach(doc => {
        const bill = doc.data();
        const account = bill.accountNumber;
        if (!account) return;
        if (!billsByAccount[account]) billsByAccount[account] = [];
        // Only count bills with amount > 0
        if (parseFloat(bill.amount ?? bill.currentAmountDue ?? "0") > 0) {
          billsByAccount[account].push(bill);
        }
      });

      // Build disconnection list
      const result: DisconnectionItem[] = [];
      for (const customer of customersData) {
        if (!customer.accountNumber) continue;
        const bills = billsByAccount[customer.accountNumber] || [];
        const unpaidPeriods = new Set<string>();
        let totalDue = 0;
        bills.forEach(bill => {
          if (bill.billingPeriod) unpaidPeriods.add(bill.billingPeriod);
          totalDue += parseFloat(bill.amount) || 0;
        });
        if (unpaidPeriods.size >= 2) {
          result.push({
            accountNumber: customer.accountNumber,
            name: customer.name || `${customer.firstName || ""} ${customer.lastName || ""}`,
            site: customer.site || "",
            unpaidCount: unpaidPeriods.size,
            totalDue: Number(totalDue.toFixed(2)),
          });
        }
      }
      setDisconnectionList(result);
    } catch (err) {
      setDisconnectionList([]);
    }
  };

  computeDisconnectionList();
}, [bills, customers]);
// ...existing code...
  const [disconnectionSiteFilter, setDisconnectionSiteFilter] = useState("all");
const [disconnectionSearch, setDisconnectionSearch] = useState("");
  const [noticeDialogOpen, setNoticeDialogOpen] = useState(false);
const [selectedNotice, setSelectedNotice] = useState<DisconnectionItem | null>(null);
const noticeRef = useRef<HTMLDivElement>(null);

// Save to Firestore and open modal
// ...existing code...
const handleShowNotice = async (item: DisconnectionItem) => {
  setSelectedNotice(item);
  setNoticeDialogOpen(true);

  // Reference to the disconnection_notices collection
  const noticesRef = collection(db, "disconnection_notices");

  // 1. Check if a notice already exists for this account
  const existingNoticeQuery = query(
    noticesRef,
    where("accountNumber", "==", item.accountNumber)
  );
  const existingNoticeSnap = await getDocs(existingNoticeQuery);

  // 2. Check if the customer is already paid (no more unpaid bills)
  // You may already have this logic elsewhere, but here's a quick check:
  const billsRef = collection(db, "bills", item.accountNumber, "records");
  const unpaidBillsSnap = await getDocs(
    query(billsRef, where("status", "in", ["pending", "partially paid"]))
  );
  const hasUnpaid = unpaidBillsSnap.docs.some(
    doc => parseFloat(doc.data().amount ?? doc.data().currentAmountDue ?? "0") > 0
  );

  if (!hasUnpaid) {
    // If already paid, remove any existing notice
    if (!existingNoticeSnap.empty) {
      for (const docSnap of existingNoticeSnap.docs) {
        await deleteDoc(doc(db, "disconnection_notices", docSnap.id));
      }
    }
    return; // Do not add a new notice
  }

  // If not paid and no existing notice, add a new one
  if (existingNoticeSnap.empty) {
    await addDoc(noticesRef, {
      accountNumber: item.accountNumber,
      name: item.name,
      site: item.site,
      unpaidCount: item.unpaidCount,
      totalDue: item.totalDue,
      noticeDate: Timestamp.now(),
      status: "served"
    });
  }
};
// ...existing code...

// Print handler
const printDisconnectionNotice = (item: DisconnectionItem) => {
  handleShowNotice(item);
};

    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="customer-billing">Customer Billing</TabsTrigger>
          <TabsTrigger value="view-bills" onClick={fetchBillsData}>View Bills</TabsTrigger>
          <TabsTrigger value="manage-rates" onClick={fetchRatesConfig}>Manage Rates</TabsTrigger>
          <TabsTrigger value="disconnection">Disconnection</TabsTrigger> {/* NEW TAB */}
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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <select
                    value={selectedSite}
                    onChange={(e) => setSelectedSite(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {siteOptions.map(site => (
                    <option key={site} value={site}>{formatSiteName(site) || "No Site"}</option>
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
                            <td className="px-4 py-2">{formatSiteName(reading.site)}</td>
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
          {allMeterReadings.length > 0 && (
            <div className="mt-10 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                ⚠️ All Meter Readings Without Bills
              </h3>
              <ul className="list-disc pl-5 text-yellow-700 space-y-1">
                {(() => {
                  const billedAccounts = new Set(
                    allBills.map(b => b.accountNumber + "_" + b.billingPeriod)
                  );

                  return allMeterReadings
                    .filter(reading => {
                      const billingPeriod = calculateBillingPeriodFromDueDate(reading.dueDate);
                      return !billedAccounts.has(reading.accountNumber + "_" + billingPeriod);
                    })
                    .sort((a, b) => {
                      const [dayA, monthA, yearA] = a.dueDate.split("/").map(Number);
                      const [dayB, monthB, yearB] = b.dueDate.split("/").map(Number);
                      const dateA = new Date(yearA, monthA - 1, dayA);
                      const dateB = new Date(yearB, monthB - 1, dayB);
                      return dateA.getTime() - dateB.getTime();
                    })
                    .map((reading, idx) => (
                      <li key={idx}>
                        <strong>{reading.accountNumber}</strong>: No bill found (Due: {reading.dueDate})
                      </li>
                    ));
                })()}
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
                <Dialog open={printFilterDialogOpen} onOpenChange={setPrintFilterDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>Print All Bills</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Filter Bills to Print</DialogTitle>
                      <DialogDescription>Print all bills for the selected month and year.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Month</Label>
                        <Select value={printFilterMonth} onValueChange={setPrintFilterMonth}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Month" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {[
                              { value: "01", label: "January" },
                              { value: "02", label: "February" },
                              { value: "03", label: "March" },
                              { value: "04", label: "April" },
                              { value: "05", label: "May" },
                              { value: "06", label: "June" },
                              { value: "07", label: "July" },
                              { value: "08", label: "August" },
                              { value: "09", label: "September" },
                              { value: "10", label: "October" },
                              { value: "11", label: "November" },
                              { value: "12", label: "December" },
                            ].map((month) => (
                              <SelectItem key={month.value} value={month.value}>
                                {month.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Year</Label>
                        <Select value={printFilterYear} onValueChange={setPrintFilterYear}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Year" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {["2023", "2024", "2025", "2026", "2027", "2028"].map((year) => (
                              <SelectItem key={year} value={year}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Site</Label>
                        <Select
                          value={printFilterSite}
                          onValueChange={setPrintFilterSite}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Site" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {siteOptions.map((site) => (
                              <SelectItem key={site} value={site}>
                                {formatSiteName(site)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                          onClick={() => {
                            setPrintFilterDialogOpen(false);
                            handlePrintAllReceipts(printFilterMonth, printFilterYear, printFilterSite);
                          }}
                        >
                          Print Filtered Bills
                        </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
  className="bg-blue-600 hover:bg-green-700 text-white"
  onClick={() => handleExportBillsToExcel(filteredBills)}
  disabled={filteredBills.length === 0}
>
  <FileSpreadsheet className="mr-2 h-4 w-4" />
  Export to Excel
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
    {siteOptions
      .filter((site) => site && site !== "All")
      .map((site) => (
        <SelectItem key={site} value={site}>
          {formatSiteName(site)}
        </SelectItem>
      ))}
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
    <TableHead>Site</TableHead> {/* Add this line */}
    <TableHead>Actions</TableHead>
  </TableRow>
</TableHeader>
<TableBody>
  {paginatedBills.length > 0 ? (
    paginatedBills.map((bill, index) => (
      <TableRow key={index}>
        <TableCell>{bill.accountNumber}</TableCell>
        <TableCell>{bill.name}</TableCell>
        <TableCell>{bill.email}</TableCell>
        <TableCell>{formatCurrency(bill.totalAmountDue)}</TableCell>
        <TableCell>
          {bill.totalAmountDue > 0 ? (
            <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
          ) : (
            <Badge className="bg-green-100 text-green-800">Paid</Badge>
          )}
        </TableCell>
        <TableCell>{formatSiteName(bill.site)}</TableCell>
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
      <TableCell colSpan={7} className="text-center">
        No bills found.
      </TableCell>
    </TableRow>
  )}
</TableBody>
                </Table>
              )}
            </CardContent>            
          </Card>
          {totalPages > 1 && (
  <div className="flex justify-center items-center gap-2 mt-4">
    <Button
      variant="outline"
      size="sm"
      disabled={currentPage === 1}
      onClick={() => setCurrentPage(currentPage - 1)}
    >
      <ChevronLeft className="h-4 w-4" />
    </Button>
    <span className="text-sm">
      Page {currentPage} of {totalPages}
    </span>
    <Button
      variant="outline"
      size="sm"
      disabled={currentPage === totalPages}
      onClick={() => setCurrentPage(currentPage + 1)}
    >
      <ChevronRight className="h-4 w-4" />
    </Button>
  </div>
)}
        </TabsContent>

{/* --- ENHANCED: Manage Rates Tab --- */}
<TabsContent value="manage-rates" className="space-y-6">
  {/* Enhanced notification block */}
          <div ref={manageRatesRef}></div>
          {/* Enhanced notification block */}
          {notification && (
            <div className={`mb-6 p-4 rounded-lg shadow-sm border-l-4 ${
              notification.type === 'success' 
                ? 'bg-green-50 text-green-800 border-l-green-400 border border-green-200' :
              notification.type === 'error' 
                ? 'bg-red-50 text-red-800 border-l-red-400 border border-red-200' :
                'bg-blue-50 text-blue-800 border-l-blue-400 border border-blue-200'
            }`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {notification.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
          {notification.type === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
          {notification.type === 'info' && <Info className="h-5 w-5 text-blue-500" />}
        </div>
        <div className="ml-3">
          <p className="font-medium">{notification.message}</p>
        </div>
      </div>
    </div>
  )}

  <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-gray-50">
    <CardHeader className="pb-6 border-b border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calculator className="h-6 w-6 text-blue-600" />
            </div>
            Water Rate Management
          </CardTitle>
          <CardDescription className="text-gray-600 mt-2">
            Configure billing rates and tier structures for accurate water usage calculations
          </CardDescription>
        </div>
        {!editRates && (
          <Button 
            onClick={() => setEditRates(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            size="lg"
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Rates
          </Button>
        )}
      </div>
    </CardHeader>

    <CardContent className="p-6">
      {ratesLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600 font-medium">Loading rates configuration...</span>
          </div>
        </div>
      ) : (
        <>
          {!editRates ? (
            <div className="space-y-6">
              {/* Minimum Charge Display */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <span className="text-blue-600 font-bold text-lg">₱</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Minimum Charge</h3>
                      <p className="text-sm text-gray-600 mt-1">Base charge applied to all bills</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      ₱{(ratesConfig?.minimumCharge ?? 94.70).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Rates Table */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <BarChart className="h-5 w-5 text-gray-600" />
                    Rate Tiers
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Current billing structure</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-b border-gray-200">
                          Usage Range (Min)
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-b border-gray-200">
                          Usage Range (Max)
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-b border-gray-200">
                          Rate per Unit (₱)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ratesConfig?.tiers?.map((tier, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {tier.min}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {typeof tier.max === 'string' ? tier.max : tier.max}
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-green-600 font-semibold">
                            ₱{tier.rate.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Last Updated */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="mr-2 h-4 w-4" />
                  Last updated: {ratesConfig?.updatedAt ? new Date(ratesConfig.updatedAt).toLocaleString() : "Never"}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Edit Header */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Edit className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-amber-800">Editing Mode</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      Modify rate tiers and minimum charge. Changes will affect future billing calculations.
                    </p>
                  </div>
                </div>
              </div>

              {/* Minimum Charge Editor */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-blue-600 font-bold text-xl">₱</span>
                  Minimum Charge Configuration
                </h3>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 min-w-fit">
                      Base charge amount (₱):
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={999.99}
                      step={0.01}
                      value={minimumCharge}
                      onChange={e => {
                        let val = e.target.value.replace(/^0+/, '');
                        // Only allow up to 3 digits before decimal and 2 after
                        if (/^\d{0,3}(\.\d{0,2})?$/.test(val)) {
                          setMinimumCharge(Number(val));
                        }
                      }}
                      className="border border-gray-300 rounded-lg px-4 py-2 w-32 text-center font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </label>
                </div>
              </div>

              {/* Tiers Editor */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <BarChart className="h-5 w-5 text-gray-600" />
                    Rate Tiers Configuration
                  </h3>
                </div>
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                            Min Usage
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                            Max Usage
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                            Rate (₱/unit)
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {editTiers.map((tier, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-4">
                              <input
                                type="number"
                                min={0}
                                max={999.99}
                                value={tier.min}
                                onChange={e => {
                                  let val = e.target.value.replace(/^0+/, '');
                                  if (/^\d{0,3}$/.test(val)) {
                                    setEditTiers(tiers =>
                                      tiers.map((t, i) => i === idx ? { ...t, min: Number(val) } : t)
                                    );
                                  }
                                }}
                                className="w-20 border border-gray-300 rounded-md px-3 py-2 text-center font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <input
                                type="text"
                                min={0}
                                max={999}
                                value={tier.max}
                                onChange={e => {
                                  const raw = e.target.value.trim();
                                  // Allow "above" or "over"
                                  if (raw === "above" || raw === "over") {
                                    setEditTiers(tiers =>
                                      tiers.map((t, i) => i === idx ? { ...t, max: raw } : t)
                                    );
                                  }
                                  // Allow only up to 3 digits
                                  else if (/^\d{0,3}$/.test(raw)) {
                                    setEditTiers(tiers =>
                                      tiers.map((t, i) => i === idx ? { ...t, max: Number(raw) } : t)
                                    );
                                  }
                                  // Otherwise, ignore input
                                }}
                                className="w-20 border border-gray-300 rounded-md px-3 py-2 text-center font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <input
                                type="number"
                                min={0}
                                max={999.99}
                                step={0.01}
                                value={tier.rate}
                                onChange={e => {
                                  let val = e.target.value;
                                  // Remove leading zeros
                                  val = val.replace(/^0+/, '');
                                  // Limit to 3 digits before decimal and 2 after
                                  if (/^\d{0,3}(\.\d{0,2})?$/.test(val)) {
                                    setEditTiers(tiers =>
                                      tiers.map((t, i) => i === idx ? { ...t, rate: Number(val) } : t)
                                    );
                                  }
                                }}
                                className="w-24 border border-gray-300 rounded-md px-3 py-2 text-center font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </td>
                            <td className="px-4 py-4 text-center">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setEditTiers(tiers => tiers.filter((_, i) => i !== idx))}
                                disabled={editTiers.length <= 1}
                                className="hover:bg-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Remove
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-200">
                    <Button
                      onClick={() => setEditTiers([...editTiers, { min: 0, max: "above", rate: 0 }])}
                      variant="outline"
                      className="border-dashed border-2 hover:border-solid"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add New Tier
                    </Button>
                    
                    <div className="flex gap-3 ml-auto">
                      <Button 
                        variant="outline" 
                        onClick={() => { 
                          setEditRates(false); 
                          setEditTiers(ratesConfig?.tiers || []); 
                        }}
                        className="hover:bg-gray-50"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                      <Button 
                        onClick={saveRatesConfig} 
                        disabled={ratesLoading}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {ratesLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </CardContent>
  </Card>
</TabsContent>


<TabsContent value="disconnection" className="space-y-6">
  <Card>
    <CardHeader>
      <CardTitle>Disconnection Notices</CardTitle>
      <CardDescription>
        Customers with unpaid bills for <span className="font-bold text-red-600">2 or more months</span>. Select to print disconnection notices.
      </CardDescription>
    </CardHeader>
    <CardContent>
      {/* --- Filter Controls --- */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
        <div>
          <label className="text-sm font-medium mr-2">Site:</label>
          <select
            value={disconnectionSiteFilter}
            onChange={e => setDisconnectionSiteFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Sites</option>
            {siteOptions
              .filter(site => site && site !== "All")
              .map(site => (
                <option key={site} value={site}>
                  {formatSiteName(site)}
                </option>
              ))}
          </select>
        </div>
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by Account # or Name"
            value={disconnectionSearch}
            onChange={e => setDisconnectionSearch(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <Button
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg"
            onClick={handlePrintAllDisconnectionNotices}
            disabled={
              disconnectionList.filter(item =>
                (disconnectionSiteFilter === "all" || item.site === disconnectionSiteFilter) &&
                (
                  !disconnectionSearch ||
                  item.accountNumber.toLowerCase().includes(disconnectionSearch.toLowerCase()) ||
                  item.name.toLowerCase().includes(disconnectionSearch.toLowerCase())
                )
              ).length === 0
            }
          >
            Print All Notices
          </Button>
          <Button
            className="bg-blue-600 hover:bg-green-700 text-white"
            onClick={handleExportDisconnectionToExcel}
            disabled={disconnectionList.length === 0}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export to Excel
          </Button>
        </div>
      </div>
      {/* --- Enhanced Table --- */}
      <div className="overflow-x-auto rounded-lg shadow border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gradient-to-r from-blue-50 to-blue-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-blue-700 uppercase tracking-wider border-b border-gray-200">Account #</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-blue-700 uppercase tracking-wider border-b border-gray-200">Name</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-blue-700 uppercase tracking-wider border-b border-gray-200">Site</th>
              <th className="px-6 py-4 text-center text-xs font-bold text-blue-700 uppercase tracking-wider border-b border-gray-200">Unpaid Months</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-blue-700 uppercase tracking-wider border-b border-gray-200">Total Due</th>
              <th className="px-6 py-4 text-center text-xs font-bold text-blue-700 uppercase tracking-wider border-b border-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {disconnectionList
              .filter(item =>
                (disconnectionSiteFilter === "all" || item.site === disconnectionSiteFilter) &&
                (
                  !disconnectionSearch ||
                  item.accountNumber.toLowerCase().includes(disconnectionSearch.toLowerCase()) ||
                  item.name.toLowerCase().includes(disconnectionSearch.toLowerCase())
                )
              )
              .map((item, idx, arr) =>
                arr.length > 0 ? (
                  <tr
                    key={idx}
                    className={`hover:bg-blue-50 transition-colors ${item.unpaidCount >= 4 ? "bg-red-50" : ""}`}
                  >
                    <td className="px-6 py-3 font-mono text-sm text-gray-900">{item.accountNumber}</td>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-800">{item.name}</td>
                    <td className="px-6 py-3 text-sm text-gray-700">{formatSiteName(item.site)}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold
                        ${item.unpaidCount >= 4
                          ? "bg-red-600 text-white"
                          : item.unpaidCount === 3
                          ? "bg-yellow-400 text-white"
                          : "bg-blue-100 text-blue-800"
                        }`}>
                        {item.unpaidCount}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-base font-bold text-blue-700">
                      ₱{formatCurrency(item.totalDue)}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <Button
                        className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white shadow"
                        onClick={() => printDisconnectionNotice(item)}
                      >
                        Print Notice
                      </Button>
                    </td>
                  </tr>
                ) : null
              )
            }
            {/* Show message if no results */}
            {disconnectionList.filter(item =>
              (disconnectionSiteFilter === "all" || item.site === disconnectionSiteFilter) &&
              (
                !disconnectionSearch ||
                item.accountNumber.toLowerCase().includes(disconnectionSearch.toLowerCase()) ||
                item.name.toLowerCase().includes(disconnectionSearch.toLowerCase())
              )
            ).length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  No customers eligible for disconnection.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* --- Legend --- */}
      <div className="mt-4 flex flex-wrap gap-4 items-center text-xs">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded-full bg-blue-100 border border-blue-300"></span>
          2 months unpaid
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded-full bg-yellow-400 border border-yellow-500"></span>
          3 months unpaid
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded-full bg-red-600 border border-red-700"></span>
          4+ months unpaid (urgent)
        </span>
      </div>
    </CardContent>
  </Card>
</TabsContent>


      </Tabs>
      <BillDisplay 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedAccount={selectedAccount}
        selectedBills={selectedBills} customersCollection={customers}      />
    
<Dialog open={noticeDialogOpen} onOpenChange={setNoticeDialogOpen}>
  <DialogContent className="max-w-3xl">
    <DialogHeader>
      <DialogTitle>
        Disconnection Notice for {selectedNotice?.accountNumber}
      </DialogTitle>
    </DialogHeader>
    {selectedNotice && (
      <div className="py-4">
        <DisconnectionNoticeDisplay ref={noticeRef} item={selectedNotice} />
      </div>
    )}
  </DialogContent>
</Dialog>
    
    </div>
  );
};

export default Bill;