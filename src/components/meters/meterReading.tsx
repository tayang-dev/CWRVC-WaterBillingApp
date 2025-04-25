import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  DocumentData
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";

// Define interfaces for your data structures
interface CustomerData {
  id: string;
  accountNumber: string;
  name: string;
  site: string;
  previousReading: string;
  currentReading: string;
  hasReadingThisMonth: boolean;
  existingReading: string | null;
  latestReadingDate: string | null;
  latestReadingMonth: number | null;
  latestReadingYear: number | null;
  [key: string]: any; // For any other properties
}

interface MeterReading {
  accountNumber: string;
  name: string;
  previousReading: number;
  currentReading: number;
  dueDate: string;
  month: number;
  year: number;
  site: string;
}

const MeterReading = () => {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [editedReadings, setEditedReadings] = useState<Record<string, string>>({});
  const [initialReadings, setInitialReadings] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSite, setSelectedSite] = useState("");
  const [siteOptions, setSiteOptions] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Set initial due date to current month
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    setDueDate(`${year}-${month}-01`);
  }, []);

  // Fetch sites on component mount
  useEffect(() => {
    const fetchSites = async () => {
      const customerCollection = collection(db, "customers");
      const customerQuery = query(customerCollection);

      const snapshot = await getDocs(customerQuery);
      const sites = Array.from(
        new Set(snapshot.docs.map((doc) => {
          const data = doc.data();
          return data.site as string;
        }).filter(Boolean))
      );

      setSiteOptions(["All", ...sites.sort()]);
    };

    fetchSites();
  }, []);

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDueDate(e.target.value);
  };

  // Validate the selected due date against customer's latest reading
  const validateDueDate = (selectedDateStr: string): boolean => {
    if (!selectedDateStr) return false;
    
    const selectedDate = new Date(selectedDateStr);
    const selectedMonth = selectedDate.getMonth();
    const selectedYear = selectedDate.getFullYear();
    
    // Check if any customer has a reading with a more recent date
    let isValid = true;
    let invalidCustomers: string[] = [];
    
    customers.forEach(customer => {
      if (customer.latestReadingMonth !== null && customer.latestReadingYear !== null) {
        const customerLatestDate = new Date(customer.latestReadingYear, customer.latestReadingMonth);
        const selectedDateObj = new Date(selectedYear, selectedMonth);
        
        if (selectedDateObj < customerLatestDate) {
          isValid = false;
          invalidCustomers.push(customer.name);
        }
      }
    });
    
    if (!isValid && invalidCustomers.length > 0) {
      alert(`Cannot set readings for a date earlier than the latest readings. The following customers already have readings for a later date: ${invalidCustomers.slice(0, 3).join(", ")}${invalidCustomers.length > 3 ? ` and ${invalidCustomers.length - 3} more` : ""}`);
    }
    
    return isValid;
  };

  // Format date for display
  const formatDateForDisplay = (year: number, month: number) => {
    const date = new Date(year, month);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  // Fetch customers when site or date changes and both are selected
  useEffect(() => {
    if (!dueDate || !selectedSite) return;
    
    setIsLoading(true);
    setCurrentPage(1);
    const fetchCustomersWithReadings = async () => {
      const customerCollection = collection(db, "customers");
      let customerQuery;

      if (selectedSite === "All") {
        customerQuery = query(customerCollection, orderBy("name"));
      } else {
        customerQuery = query(
          customerCollection,
          where("site", "==", selectedSite),
          orderBy("name")
        );
      }

      const unsubscribe = onSnapshot(customerQuery, async (snapshot) => {
        const dateReference = new Date(dueDate);
        const month = dateReference.getMonth();
        const year = dateReference.getFullYear();
        
        const customerList = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const customerData = doc.data() as DocumentData;
            const accountNumber = customerData.accountNumber as string;

            // Get all readings for this customer
            const meterReadingsCollection = collection(
              db,
              "meterReadings",
              accountNumber,
              "records"
            );
            const meterReadingsQuery = query(
              meterReadingsCollection,
              orderBy("dueDate", "desc")
            );
            const readingsSnapshot = await getDocs(meterReadingsQuery);
            const readings = readingsSnapshot.docs.map((readingDoc) =>
              readingDoc.data()
            );

            // Check if reading already exists for this month
            const existingThisMonth = readings.find(reading => 
              reading.month === month && reading.year === year
            );

            // Get latest reading date information
            let latestReadingMonth = null;
            let latestReadingYear = null;
            let latestReadingDate = null;
            
            if (readings.length > 0) {
              latestReadingMonth = readings[0].month;
              latestReadingYear = readings[0].year;
              latestReadingDate = readings[0].dueDate;
            }

            const previousReading =
              readings.length > 0 ? readings[0].currentReading || "0" : "0";

            return {
              id: doc.id,
              site: customerData.site || "Unknown",
              name: customerData.name,
              accountNumber: accountNumber,
              previousReading,
              currentReading: previousReading,
              hasReadingThisMonth: !!existingThisMonth,
              existingReading: existingThisMonth ? existingThisMonth.currentReading : null,
              latestReadingDate,
              latestReadingMonth,
              latestReadingYear
            } as CustomerData;
          })
        );

        // Check if any customer has a reading with a date later than the selected date
        const selectedDateObj = new Date(year, month);
        const invalidCustomers = customerList.filter(customer => {
          if (customer.latestReadingMonth !== null && customer.latestReadingYear !== null) {
            const customerLatestDate = new Date(customer.latestReadingYear, customer.latestReadingMonth);
            return selectedDateObj < customerLatestDate;
          }
          return false;
        });

        if (invalidCustomers.length > 0) {
          const names = invalidCustomers.map(c => c.name).slice(0, 3);
          alert(`Warning: ${names.join(", ")}${invalidCustomers.length > 3 ? ` and ${invalidCustomers.length - 3} more customers` : ""} already have readings for dates later than ${dateReference.toLocaleDateString('en-US', {year: 'numeric', month: 'long'})}. You cannot enter readings for these customers.`);
        }

        setCustomers(customerList);
        setTotalPages(Math.ceil(customerList.length / itemsPerPage));

        const initialReadings: Record<string, string> = {};
        customerList.forEach((customer) => {
          initialReadings[customer.id] = customer.previousReading;
        });
        setEditedReadings({ ...initialReadings });
        setInitialReadings({ ...initialReadings });
        setValidationErrors({});
        setIsLoading(false);
      });

      return () => unsubscribe();
    };

    fetchCustomersWithReadings();
  }, [dueDate, selectedSite, itemsPerPage]);

  const validateReading = (customerId: string, value: string): boolean => {
    // Check if the value is empty
    if (!value.trim()) {
      setValidationErrors(prev => ({
        ...prev,
        [customerId]: "Reading cannot be empty"
      }));
      return false;
    }

    const currentVal = parseFloat(value);
    const previousVal = parseFloat(initialReadings[customerId]);

    // Check if the value is a valid number
    if (isNaN(currentVal)) {
      setValidationErrors(prev => ({
        ...prev,
        [customerId]: "Reading must be a number"
      }));
      return false;
    }

    // Check if current reading is less than previous reading
    if (currentVal < previousVal) {
      setValidationErrors(prev => ({
        ...prev,
        [customerId]: "Current reading cannot be less than previous reading"
      }));
      return false;
    }

    // Clear validation error if valid
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[customerId];
      return newErrors;
    });
    
    return true;
  };

  const handleEditReading = (customerId: string, value: string) => {
    setEditedReadings((prev) => ({
      ...prev,
      [customerId]: value,
    }));
    
    validateReading(customerId, value);
  };

  const filteredCustomers = customers.filter((customer) => {
    return customer.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
  
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const hasReadingChanged = (customerId: string) => {
    return editedReadings[customerId] !== initialReadings[customerId];
  };

  // Determine if a customer can have a reading for the selected date
  const canEnterReadingForCustomer = (customer: CustomerData): boolean => {
    if (!dueDate) return false;
    
    const selectedDate = new Date(dueDate);
    const selectedMonth = selectedDate.getMonth();
    const selectedYear = selectedDate.getFullYear();
    
    // If customer already has a reading for this month
    if (customer.hasReadingThisMonth) return false;
    
    // If customer has a reading for a later date
    if (customer.latestReadingMonth !== null && customer.latestReadingYear !== null) {
      const customerLatestDate = new Date(customer.latestReadingYear, customer.latestReadingMonth);
      const selectedDateObj = new Date(selectedYear, selectedMonth);
      
      if (selectedDateObj < customerLatestDate) {
        return false;
      }
    }
    
    return true;
  };

  const handleSaveAll = async () => {
    if (!dueDate) {
      alert("Please select a due date first.");
      return;
    }

    if (!selectedSite) {
      alert("Please select a site first.");
      return;
    }

    // Validate all readings before saving
    let hasErrors = false;
    const customersToSave = filteredCustomers.filter(
      (customer) =>
        editedReadings[customer.id] &&
        editedReadings[customer.id] !== "" &&
        hasReadingChanged(customer.id) &&
        !customer.hasReadingThisMonth &&
        canEnterReadingForCustomer(customer)
    );

    customersToSave.forEach(customer => {
      if (!validateReading(customer.id, editedReadings[customer.id])) {
        hasErrors = true;
      }
    });

    if (hasErrors) {
      alert("Please fix validation errors before saving.");
      return;
    }

    try {
      setIsLoading(true);
      const dateReference = new Date(dueDate);
      const month = dateReference.getMonth();
      const year = dateReference.getFullYear();

      if (customersToSave.length === 0) {
        alert("No valid changed readings to save.");
        setIsLoading(false);
        return;
      }

      await Promise.all(
        customersToSave.map(async (customer) => {
          const recordsCollection = collection(
            db,
            "meterReadings",
            customer.accountNumber,
            "records"
          );

          // Double-check that no reading exists for this month
          const existingQuery = query(
            recordsCollection,
            where("month", "==", month),
            where("year", "==", year)
          );

          const existingSnapshot = await getDocs(existingQuery);

          if (!existingSnapshot.empty) {
            console.warn(`Reading already exists for ${customer.accountNumber} this month.`);
            return;
          }

          const prev = parseFloat(customer.previousReading);
          const curr = parseFloat(editedReadings[customer.id]);

          if (isNaN(curr) || curr < prev) {
            console.warn(`Invalid reading for ${customer.accountNumber}: ${curr} < ${prev}`);
            return;
          }

          const newReading: MeterReading = {
            accountNumber: customer.accountNumber,
            name: customer.name,
            previousReading: prev,
            currentReading: curr,
            dueDate: dateReference.toLocaleDateString("en-GB"),
            month,
            year,
            site: customer.site,
          };

          return addDoc(recordsCollection, newReading);
        })
      );

      alert(`Readings saved for site "${selectedSite}".`);

      // Refresh data to update status
      const customerCollection = collection(db, "customers");
      let customerQuery;

      if (selectedSite === "All") {
        customerQuery = query(customerCollection, orderBy("name"));
      } else {
        customerQuery = query(
          customerCollection,
          where("site", "==", selectedSite),
          orderBy("name")
        );
      }

      const snapshot = await getDocs(customerQuery);
      const customerList = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const customerData = doc.data() as DocumentData;
          const accountNumber = customerData.accountNumber as string;

          const meterReadingsCollection = collection(
            db,
            "meterReadings",
            accountNumber,
            "records"
          );
          const meterReadingsQuery = query(
            meterReadingsCollection,
            orderBy("dueDate", "desc")
          );
          const readingsSnapshot = await getDocs(meterReadingsQuery);
          const readings = readingsSnapshot.docs.map((readingDoc) =>
            readingDoc.data()
          );

          // Check if reading exists for this month
          const existingThisMonth = readings.find(reading => 
            reading.month === month && reading.year === year
          );

          // Get latest reading date information
          let latestReadingMonth = null;
          let latestReadingYear = null;
          let latestReadingDate = null;
          
          if (readings.length > 0) {
            latestReadingMonth = readings[0].month;
            latestReadingYear = readings[0].year;
            latestReadingDate = readings[0].dueDate;
          }

          const previousReading =
            readings.length > 0 ? readings[0].currentReading || "0" : "0";

          return {
            id: doc.id,
            site: customerData.site || "Unknown",
            name: customerData.name,
            accountNumber: accountNumber,
            previousReading,
            currentReading: previousReading,
            hasReadingThisMonth: !!existingThisMonth,
            existingReading: existingThisMonth ? existingThisMonth.currentReading : null,
            latestReadingDate,
            latestReadingMonth,
            latestReadingYear
          } as CustomerData;
        })
      );

      setCustomers(customerList);

      const updatedInitial: Record<string, string> = {};
      customerList.forEach((customer) => {
        updatedInitial[customer.id] = customer.previousReading;
      });
      
      setEditedReadings({ ...updatedInitial });
      setInitialReadings({ ...updatedInitial });
      setValidationErrors({});
      setIsLoading(false);
    } catch (error) {
      console.error("Error saving meter readings:", error);
      alert("There was an error saving the readings. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm">
      {/* Header Section with Date and Site Selection */}
      <div className="flex justify-between items-center px-6 py-3 border-b">
        <h2 className="text-xl font-semibold text-gray-800">Meter Reading</h2>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <span className="text-sm font-medium mr-2">Due Date:</span>
            <Input
              type="date"
              value={dueDate}
              onChange={handleDateChange}
              className="w-40 h-8"
            />
          </div>
          
          <div className="flex items-center">
            <span className="text-sm font-medium mr-2">Site:</span>
            <select
              className="border rounded-md px-3 py-1 text-sm w-40 h-8"
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
            >
              <option value="">Select site</option>
              {siteOptions.map((site) => (
                <option key={site} value={site}>
                  {site}
                </option>
              ))}
            </select>
          </div>
          
          <Input
            placeholder="Search customers..."
            className="w-64 h-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-8">
            <p>Loading...</p>
          </div>
        ) : customers.length > 0 ? (
          <>
            <div className="mb-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Total customers: {filteredCustomers.length} | Changed readings: {
                    filteredCustomers.filter(c => 
                      hasReadingChanged(c.id) && 
                      editedReadings[c.id] && 
                      editedReadings[c.id] !== "" &&
                      !c.hasReadingThisMonth &&
                      canEnterReadingForCustomer(c)
                    ).length
                  } | Available to update: {
                    filteredCustomers.filter(c => !c.hasReadingThisMonth && canEnterReadingForCustomer(c)).length
                  }
                </AlertDescription>
              </Alert>
            </div>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Previous Reading</TableHead>
                    <TableHead>Current Reading</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                        No customers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentCustomers.map((customer) => (
                      <TableRow
                        key={customer.id}
                        className={
                          customer.hasReadingThisMonth 
                            ? "bg-gray-100" 
                            : !canEnterReadingForCustomer(customer)
                              ? "bg-red-50"
                              : hasReadingChanged(customer.id) 
                                ? "bg-blue-50" 
                                : ""
                        }
                      >
                        <TableCell className="font-medium">{customer.accountNumber}</TableCell>
                        <TableCell>{customer.name}</TableCell>
                        <TableCell>{customer.site}</TableCell>
                        <TableCell>{customer.previousReading}</TableCell>
                        <TableCell>
                          {customer.hasReadingThisMonth ? (
                            <div className="flex items-center">
                              <Input
                                type="number"
                                value={customer.existingReading || ""}
                                disabled
                                className="bg-gray-100"
                              />
                              <span className="ml-2 text-xs text-gray-500">Already recorded</span>
                            </div>
                          ) : !canEnterReadingForCustomer(customer) ? (
                            <div className="flex items-center">
                              <Input
                                type="number"
                                disabled
                                className="bg-red-50"
                              />
                              <span className="ml-2 text-xs text-red-500">
                                Has reading for {formatDateForDisplay(
                                  customer.latestReadingYear!,
                                  customer.latestReadingMonth!
                                )}
                              </span>
                            </div>
                          ) : (
                            <div>
                              <Input
                                type="number"
                                value={editedReadings[customer.id] || ""}
                                onChange={(e) => handleEditReading(customer.id, e.target.value)}
                                className={validationErrors[customer.id] ? "border-red-500" : ""}
                              />
                              {validationErrors[customer.id] && (
                                <span className="text-xs text-red-500">{validationErrors[customer.id]}</span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {customer.hasReadingThisMonth ? (
                            <span className="text-gray-500 text-sm">Recorded</span>
                          ) : !canEnterReadingForCustomer(customer) ? (
                            <span className="text-red-500 text-sm">Later reading exists</span>
                          ) : hasReadingChanged(customer.id) ? (
                            <span className="text-blue-600 text-sm">Modified</span>
                          ) : (
                            <span className="text-gray-400 text-sm">Unchanged</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredCustomers.length)} of {filteredCustomers.length} customers
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => paginate(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <Button
                onClick={handleSaveAll}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={
                  isLoading || 
                  Object.keys(validationErrors).length > 0 ||
                  filteredCustomers.filter(c =>
                    hasReadingChanged(c.id) &&
                    editedReadings[c.id] &&
                    editedReadings[c.id] !== "" &&
                    !c.hasReadingThisMonth &&
                    canEnterReadingForCustomer(c)
                  ).length === 0
                }
              >
                {isLoading ? "Saving..." : "Save Changed Readings"}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>Select a due date and site to load customer data</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeterReading;