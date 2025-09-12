import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
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
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";

interface CustomerData {
  id: string;
  accountNumber: string;
  name: string;
  site: string;
  previousReading: string;
}

const MeterReading = () => {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [editedReadings, setEditedReadings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSite, setFilterSite] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoading(true);
      const customerCollection = collection(db, "customers");
      const snapshot = await getDocs(customerCollection);
      const customerList: CustomerData[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          accountNumber: data.accountNumber || "",
          name: data.name || "",
          site: data.site || "",
          previousReading: data.previousReading || "",
        };
      });
      setCustomers(customerList);
      // Initialize editedReadings with current previousReading values
      const initial: Record<string, string> = {};
      customerList.forEach((c) => {
        initial[c.id] = c.previousReading || "";
      });
      setEditedReadings(initial);
      setIsLoading(false);
    };
    fetchCustomers();
  }, []);

  const handleEditReading = (customerId: string, value: string) => {
    setEditedReadings((prev) => ({
      ...prev,
      [customerId]: value,
    }));
  };

  const handleSaveAll = async () => {
    setIsLoading(true);
    try {
      await Promise.all(
        customers.map(async (customer) => {
          const newReading = editedReadings[customer.id];
          if (newReading !== customer.previousReading) {
            const customerRef = doc(db, "customers", customer.id);
            await updateDoc(customerRef, { previousReading: newReading });
          }
        })
      );
      alert("Previous readings updated successfully!");
      // Optionally, refresh customers
      const customerCollection = collection(db, "customers");
      const snapshot = await getDocs(customerCollection);
      const customerList: CustomerData[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          accountNumber: data.accountNumber || "",
          name: data.name || "",
          site: data.site || "",
          previousReading: data.previousReading || "",
        };
      });
      setCustomers(customerList);
      // Update editedReadings
      const initial: Record<string, string> = {};
      customerList.forEach((c) => {
        initial[c.id] = c.previousReading || "";
      });
      setEditedReadings(initial);
    } catch (error) {
      alert("Error saving previous readings.");
    }
    setIsLoading(false);
  };

  // Get unique sites for filter dropdown
  const siteOptions = Array.from(new Set(customers.map(c => c.site).filter(Boolean)));

  const filteredCustomers = customers.filter((customer) =>
    (filterSite === "all" || customer.site === filterSite) &&
    (
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.accountNumber.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page if filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterSite]);

  return (
    <div className="w-full bg-white rounded-lg shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between px-6 py-3 border-b gap-2">
        <h2 className="text-xl font-semibold text-gray-800">Set Previous Reading</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Search by name or account #"
            className="w-64 h-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={filterSite} onValueChange={setFilterSite}>
            <SelectTrigger className="w-40 h-8">
              <SelectValue placeholder="Filter by Site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sites</SelectItem>
              {siteOptions.map(site => (
                <SelectItem key={site} value={site}>{site}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="p-6">
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
                  Total customers: {filteredCustomers.length}
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                        No customers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.accountNumber}</TableCell>
                        <TableCell>{customer.name}</TableCell>
                        <TableCell>{customer.site}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={editedReadings[customer.id] || ""}
                            onChange={(e) => handleEditReading(customer.id, e.target.value)}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Pagination Controls */}
            <div className="mt-4 flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleSaveAll}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : "Save All Previous Readings"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MeterReading;