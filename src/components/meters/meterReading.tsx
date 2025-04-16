import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { MoreHorizontal, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";

const MeterReading = () => {
  const [customers, setCustomers] = useState([]);
  const [editedReadings, setEditedReadings] = useState({});
  const [initialReadings, setInitialReadings] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSite, setSelectedSite] = useState("");
  const [siteOptions, setSiteOptions] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [isDateSelected, setIsDateSelected] = useState(false);
  const [isSiteSelected, setIsSiteSelected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!dueDate || !selectedSite || selectedSite === "") return;

    setIsLoading(true);
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
        const customerList = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const customerData = doc.data();
            const accountNumber = customerData.accountNumber;

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

            const previousReading =
              readings.length > 0 ? readings[0].currentReading || "0" : "0";

            return {
              id: doc.id,
              site: customerData.site || "Unknown",
              ...customerData,
              previousReading,
              currentReading: previousReading,
            };
          })
        );

        setCustomers(customerList);

        const initialReadings = {};
        customerList.forEach((customer) => {
          initialReadings[customer.id] = customer.previousReading;
        });
        setEditedReadings({ ...initialReadings });
        setInitialReadings({ ...initialReadings });
        setIsLoading(false);
      });

      return () => unsubscribe();
    };

    fetchCustomersWithReadings();
  }, [dueDate, selectedSite]);

  useEffect(() => {
    const fetchSites = async () => {
      const customerCollection = collection(db, "customers");
      const customerQuery = query(customerCollection);

      const snapshot = await getDocs(customerQuery);
      const sites = Array.from(
        new Set(snapshot.docs.map((doc) => doc.data().site).filter(Boolean))
      );

      setSiteOptions(["All", ...sites.sort()]);
    };

    fetchSites();
  }, []);

  const handleEditReading = (customerId, value) => {
    setEditedReadings((prev) => ({
      ...prev,
      [customerId]: value,
    }));
  };

  const filteredCustomers = customers.filter((customer) => {
    return customer.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const hasReadingChanged = (customerId) => {
    return editedReadings[customerId] !== initialReadings[customerId];
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

    try {
      setIsLoading(true);
      const dateReference = new Date(dueDate);
      const month = dateReference.getMonth();
      const year = dateReference.getFullYear();

      const customersToSave = filteredCustomers.filter(
        (customer) =>
          editedReadings[customer.id] &&
          editedReadings[customer.id] !== "" &&
          hasReadingChanged(customer.id)
      );

      if (customersToSave.length === 0) {
        alert("No changed readings to save.");
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

          const newReading = {
            accountNumber: customer.accountNumber,
            name: customer.name,
            previousReading: prev,
            currentReading: curr,
            dueDate: dateReference.toLocaleDateString("en-GB"), // 👈 formatted DD/MM/YYYY
            month,
            year,
            site: customer.site,
          };
          

          return addDoc(recordsCollection, newReading);
        })
      );

      alert(`Readings saved for site "${selectedSite}".`);

      const updatedInitial = { ...initialReadings };
      customersToSave.forEach((customer) => {
        updatedInitial[customer.id] = editedReadings[customer.id];
      });
      setInitialReadings(updatedInitial);

      setIsLoading(false);
    } catch (error) {
      console.error("Error saving meter readings:", error);
      alert("There was an error saving the readings. Please try again.");
      setIsLoading(false);
    }
  };

  const handleDateSelect = () => {
    if (!dueDate) {
      alert("Please select a due date first");
      return;
    }
    setIsDateSelected(true);
  };

  const handleSiteSelect = () => {
    if (!selectedSite) {
      alert("Please select a site first");
      return;
    }
    setIsSiteSelected(true);
  };

  const groupedCustomers = filteredCustomers.reduce((groups, customer) => {
    const site = customer.site;
    if (!groups[site]) {
      groups[site] = [];
    }
    groups[site].push(customer);
    return groups;
  }, {});

  return (
    <div className="w-full bg-white p-6 rounded-lg shadow-sm">
      {!isDateSelected ? (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Step 1: Select Due Date</h2>
          <div className="flex items-center gap-4">
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-64"
            />
            <Button
              onClick={handleDateSelect}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!dueDate}
            >
              Continue
            </Button>
          </div>
        </div>
      ) : !isSiteSelected ? (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Step 2: Select Site</h2>
          <div className="flex items-center gap-4">
            <select
              className="border rounded-md px-3 py-2 text-sm w-64"
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
            >
              <option value="">Select a site</option>
              {siteOptions.map((site) => (
                <option key={site} value={site}>
                  {site}
                </option>
              ))}
            </select>
            <Button
              onClick={handleSiteSelect}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!selectedSite}
            >
              Continue
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
            <h2 className="text-xl font-semibold text-gray-800">Meter Reading</h2>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="font-medium">Due Date:</span> {new Date(dueDate).toLocaleDateString()}
                <Button
                  variant="ghost"
                  className="ml-2 text-blue-600"
                  onClick={() => {
                    setIsDateSelected(false);
                    setIsSiteSelected(false);
                    setCustomers([]);
                  }}
                >
                  Change
                </Button>
              </div>
              <div className="text-sm">
                <span className="font-medium">Site:</span> {selectedSite}
                <Button
                  variant="ghost"
                  className="ml-2 text-blue-600"
                  onClick={() => {
                    setIsSiteSelected(false);
                    setCustomers([]);
                  }}
                >
                  Change
                </Button>
              </div>
              <Input
                placeholder="Search customers..."
                className="w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <p>Loading...</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Total customers: {customers.length} | Changed readings: {
                      customers.filter(c => hasReadingChanged(c.id) && editedReadings[c.id] && editedReadings[c.id] !== "").length
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
                      <TableHead>Previous Reading</TableHead>
                      <TableHead>Current Reading</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                          No customers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <TableRow
                          key={customer.id}
                          className={hasReadingChanged(customer.id) ? "bg-blue-50" : ""}
                        >
                          <TableCell className="font-medium">{customer.accountNumber}</TableCell>
                          <TableCell>{customer.name}</TableCell>
                          <TableCell>{customer.previousReading}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editedReadings[customer.id] || ""}
                              onChange={(e) => handleEditReading(customer.id, e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {hasReadingChanged(customer.id) ? (
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

              {filteredCustomers.length > 0 && (
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={handleSaveAll}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={isLoading || customers.filter(c =>
                      hasReadingChanged(c.id) &&
                      editedReadings[c.id] &&
                      editedReadings[c.id] !== ""
                    ).length === 0}
                  >
                    {isLoading ? "Saving..." : "Save Changed Readings"}
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default MeterReading;
