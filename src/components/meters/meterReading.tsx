import React, { useState, useEffect } from "react";
import { collection, addDoc, query, where, orderBy, onSnapshot, getDocs } from "firebase/firestore";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { MoreHorizontal, Edit, ChevronLeft, ChevronRight } from "lucide-react";

const MeterReading = () => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    accountNumber: "",
    name: "",
    previousReading: "",
    currentReading: "",
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchCustomersWithReadings = async () => {
      const customerCollection = collection(db, "customers");
      const customerQuery = query(customerCollection, orderBy("name"));

      // Real-time listener for customers
      const unsubscribe = onSnapshot(customerQuery, async (snapshot) => {
        const customerList = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const customerData = doc.data();
            const accountNumber = customerData.accountNumber;

            // Fetch previous and current readings for each customer
            const meterReadingsCollection = collection(db, "meterReadings");
            const meterReadingsQuery = query(
              meterReadingsCollection,
              where("accountNumber", "==", accountNumber),
              orderBy("date", "desc")
            );
            const readingsSnapshot = await getDocs(meterReadingsQuery);
            const readings = readingsSnapshot.docs.map((readingDoc) =>
              readingDoc.data()
            );

            const previousReading =
              readings.length > 0 ? readings[0].previousReading || "0" : "0";
            const currentReading =
              readings.length > 0 ? readings[0].currentReading || "0" : "0";

            return {
              id: doc.id,
              ...customerData,
              previousReading,
              currentReading,
            };
          })
        );
        setCustomers(customerList);
      });

      return () => unsubscribe(); // Cleanup listener on unmount
    };

    fetchCustomersWithReadings();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "meterReadings"), {
        ...formData,
        date: new Date().toISOString(),
      });
      alert("Meter reading saved successfully!");
      setFormData({
        accountNumber: "",
        name: "",
        previousReading: "",
        currentReading: "",
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving meter reading:", error);
    }
  };

  const handleSetCurrentReading = async (customer) => {
    setFormData({
      accountNumber: customer.accountNumber,
      name: customer.name,
      previousReading: customer.previousReading,
      currentReading: "",
    });
    setIsDialogOpen(true);
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastCustomer = currentPage * itemsPerPage;
  const indexOfFirstCustomer = indexOfLastCustomer - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(
    indexOfFirstCustomer,
    indexOfLastCustomer
  );

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  return (
    <div className="w-full bg-white p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Meter Reading</h2>
        <div className="relative">
          <Input
            placeholder="Search customers..."
            className="pl-10 w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account #</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Previous Reading</TableHead>
              <TableHead>Current Reading</TableHead>
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
                  <TableCell>{customer.previousReading}</TableCell>
                  <TableCell>{customer.currentReading}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleSetCurrentReading(customer)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Set Reading
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-gray-500">
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
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = Math.max(1, currentPage - 2) + i; // Center the pagination around the current page
              if (page <= totalPages) {
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
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
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog for setting meter reading */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Set Meter Reading for {formData.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Previous Reading
              </label>
              <Input
                type="number"
                name="previousReading"
                value={formData.previousReading}
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Current Reading
              </label>
              <Input
                type="number"
                name="currentReading"
                value={formData.currentReading}
                onChange={handleInputChange}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Save Reading
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MeterReading;