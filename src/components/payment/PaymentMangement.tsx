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
} from "lucide-react";

interface PaymentMethod {
  id: string;
  type: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
  isActive: boolean;
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
  submittedAt: string;
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
  amount: number;
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
  tax?: number;
  penalty?: number;
  amountAfterDue?: number;
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

  // Verification form states
  const [verificationStatus, setVerificationStatus] = useState<"verified" | "rejected">("verified");
  const [verificationNotes, setVerificationNotes] = useState("");

  // Consolidated Bill creation form states (all editable)
  const [billAmount, setBillAmount] = useState("");
  const [billDueDate, setBillDueDate] = useState("");
  const [billDescription, setBillDescription] = useState("Monthly water bill");
  const [billingPeriod, setBillingPeriod] = useState(""); // e.g., "01/03/25 - 02/01/25"
  const [currentReading, setCurrentReading] = useState(""); // Current meter reading
  const [previousReading, setPreviousReading] = useState(""); // Previous meter reading
  const [waterUsage, setWaterUsage] = useState(""); // Consumption (editable)
  const [billAccountNumber, setBillAccountNumber] = useState("");
  const [meterNumber, setMeterNumber] = useState("");
  const [waterCharge, setWaterCharge] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [penaltyAmount, setPenaltyAmount] = useState("");
  const [amountAfterDue, setAmountAfterDue] = useState("");

  useEffect(() => {
    const fetchPaymentData = async () => {
      await initializeFirestoreCollections();
      await fetchCustomers();
      try {
        const { collection, getDocs, query, where } = await import("firebase/firestore");
        const { db } = await import("../../lib/firebase");

        // Fetch payment methods
        const methodsCollection = collection(db, "paymentMethods");
        const methodsSnapshot = await getDocs(methodsCollection);
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

        // Fetch pending verifications
        const verificationsCollection = collection(db, "paymentVerifications");
        const verificationsQuery = query(verificationsCollection, where("status", "==", "pending"));
        const verificationsSnapshot = await getDocs(verificationsQuery);
        const verificationsList = verificationsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as PaymentVerification[];

        setPendingVerifications(
          verificationsList.length > 0
            ? verificationsList
            : [
                {
                  id: "ver-1",
                  customerId: "cust-1",
                  customerName: "John Doe",
                  billId: "bill-001",
                  amount: 78.5,
                  referenceNumber: "GC123456789",
                  paymentDate: "2023-07-15",
                  paymentMethod: "GCash",
                  status: "pending",
                  submittedAt: "2023-07-15T10:30:00Z",
                },
                {
                  id: "ver-2",
                  customerId: "cust-2",
                  customerName: "Jane Smith",
                  billId: "bill-002",
                  amount: 65.75,
                  referenceNumber: "BT987654321",
                  paymentDate: "2023-07-14",
                  paymentMethod: "Bank Transfer",
                  status: "pending",
                  submittedAt: "2023-07-14T14:45:00Z",
                },
              ]
        );
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
      const { collection, getDocs } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");

      const customersCollection = collection(db, "customers");
      const customersSnapshot = await getDocs(customersCollection);
      const customersList = customersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Customer[];

      setCustomers(
        customersList.length > 0
          ? customersList
          : [
              {
                id: "cust-1",
                name: "John Doe",
                email: "john.doe@example.com",
                accountNumber: "WB-10001",
                amountDue: 78.5,
              },
              {
                id: "cust-2",
                name: "Jane Smith",
                email: "jane.smith@example.com",
                accountNumber: "WB-10002",
                amountDue: 65.75,
              },
            ]
      );
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const handleAddMethod = async () => {
    try {
      const newMethod = {
        type: methodType,
        accountName,
        accountNumber,
        instructions,
        isActive: true,
      };

      try {
        const { collection, addDoc } = await import("firebase/firestore");
        const { db } = await import("../../lib/firebase");

        const docRef = await addDoc(collection(db, "paymentMethods"), newMethod);
        setPaymentMethods([...paymentMethods, { id: docRef.id, ...newMethod }]);
      } catch (firestoreError) {
        console.error("Firestore error:", firestoreError);
        const mockId = `method-${Date.now()}`;
        setPaymentMethods([...paymentMethods, { id: mockId, ...newMethod }]);
      }

      setMethodType("");
      setAccountName("");
      setAccountNumber("");
      setInstructions("");
      setIsAddMethodDialogOpen(false);
    } catch (error) {
      console.error("Error adding payment method:", error);
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

  const handleUpdateMethod = async () => {
    if (!editingMethod) return;

    try {
      const updatedMethod = {
        ...editingMethod,
        type: methodType,
        accountName,
        accountNumber,
        instructions,
      };

      try {
        const { doc, updateDoc } = await import("firebase/firestore");
        const { db } = await import("../../lib/firebase");

        await updateDoc(doc(db, "paymentMethods", editingMethod.id), {
          type: methodType,
          accountName,
          accountNumber,
          instructions,
        });
      } catch (firestoreError) {
        console.error("Firestore update error:", firestoreError);
      }

      setPaymentMethods(
        paymentMethods.map((method) =>
          method.id === editingMethod.id ? updatedMethod : method
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

  const handleVerifyPayment = async () => {
    if (!selectedVerification) return;

    try {
      setPendingVerifications(
        pendingVerifications.filter((v) => v.id !== selectedVerification.id)
      );

      try {
        const { doc, updateDoc, collection, addDoc } = await import("firebase/firestore");
        const { db } = await import("../../lib/firebase");

        await updateDoc(doc(db, "paymentVerifications", selectedVerification.id), {
          status: verificationStatus,
          notes: verificationNotes,
          verifiedAt: new Date().toISOString(),
        });

        if (verificationStatus === "verified") {
          await updateDoc(doc(db, "bills", selectedVerification.billId), {
            status: "paid",
            paymentDate: selectedVerification.paymentDate,
            paymentReference: selectedVerification.referenceNumber,
          });
          await updateDoc(doc(db, "customers", selectedVerification.customerId), {
            amountDue: 0,
          });
          await addDoc(collection(db, "payments"), {
            customerId: selectedVerification.customerId,
            billId: selectedVerification.billId,
            date: selectedVerification.paymentDate,
            amount: selectedVerification.amount,
            method: selectedVerification.paymentMethod,
            referenceNumber: selectedVerification.referenceNumber,
            status: "completed",
            verifiedAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error("Error in verification process:", error);
      }

      setSelectedVerification(null);
      setVerificationStatus("verified");
      setVerificationNotes("");
      setIsVerificationDialogOpen(false);
    } catch (error) {
      console.error("Error verifying payment:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "PHP" }).format(amount);
  };

  const handleOpenBillDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setBillAmount(customer.amountDue.toString());
    setBillDueDate("2025-02-22");
    setBillingPeriod("01/03/25 - 02/01/25");
    setCurrentReading("577");
    setPreviousReading("569");
    setWaterUsage("8");
    setBillAccountNumber(customer.accountNumber);
    setMeterNumber("12345678");
    setWaterCharge("191.00");
    setTaxAmount("3.82");
    setPenaltyAmount("19.10");
    setAmountAfterDue("213.92");
    setBillDescription("Monthly water bill");
    setBillDialogOpen(true);
  };

  const handleCreateBill = async () => {
    if (!selectedCustomer) return;

    try {
      const billData: Bill = {
        customerId: selectedCustomer.id,
        date: new Date().toISOString().split("T")[0],
        amount: parseFloat(billAmount) || 0,
        status: "pending",
        dueDate: billDueDate,
        description: billDescription,
        waterUsage: parseInt(waterUsage) || 0,
        billingPeriod: billingPeriod,
        meterReading: {
          current: parseInt(currentReading) || 0,
          previous: parseInt(previousReading) || 0,
          consumption: parseInt(waterUsage) || 0,
        },
        accountNumber: billAccountNumber,
        meterNumber: meterNumber,
        waterCharge: parseFloat(waterCharge) || 0,
        tax: parseFloat(taxAmount) || 0,
        penalty: parseFloat(penaltyAmount) || 0,
        amountAfterDue: parseFloat(amountAfterDue) || 0,
      };

      const { collection, addDoc, doc, updateDoc } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");

      await addDoc(collection(db, "bills"), billData);
      await updateDoc(doc(db, "customers", selectedCustomer.id), {
        amountDue: parseFloat(billAmount) || 0,
        lastBillingDate: new Date().toISOString().split("T")[0],
      });

      alert(`Bill created successfully for ${selectedCustomer.name}`);
    } catch (error) {
      console.error("Error creating bill:", error);
      alert("Error creating bill. Please try again.");
    } finally {
      setSelectedCustomer(null);
      setBillAmount("");
      setBillDueDate("");
      setBillDescription("Monthly water bill");
      setWaterUsage("");
      setBillingPeriod("");
      setCurrentReading("");
      setPreviousReading("");
      setBillAccountNumber("");
      setMeterNumber("");
      setWaterCharge("");
      setTaxAmount("");
      setPenaltyAmount("");
      setAmountAfterDue("");
      setBillDialogOpen(false);
    }
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
                      {editingMethod ? "Update the payment method details below." : "Add a new payment method for customers to use."}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="method-type" className="text-right">Method Type</Label>
                      <div className="col-span-3">
                        <Select value={methodType} onValueChange={setMethodType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GCash">GCash</SelectItem>
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            <SelectItem value="PayMaya">PayMaya</SelectItem>
                            <SelectItem value="Cash">Cash</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="account-name" className="text-right">Account Name</Label>
                      <Input id="account-name" value={accountName} onChange={(e) => setAccountName(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="account-number" className="text-right">Account Number</Label>
                      <Input id="account-number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="instructions" className="text-right">Instructions</Label>
                      <Textarea id="instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} className="col-span-3" rows={3} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setEditingMethod(null);
                      setMethodType("");
                      setAccountName("");
                      setAccountNumber("");
                      setInstructions("");
                      setIsAddMethodDialogOpen(false);
                    }}>Cancel</Button>
                    <Button onClick={editingMethod ? handleUpdateMethod : handleAddMethod} className="bg-blue-600 hover:bg-blue-700">
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
                  <div className="flex justify-center items-center h-40"><p>Loading payment methods...</p></div>
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
                                <Badge variant="outline" className="text-gray-500">Inactive</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" size="sm" onClick={() => handleEditMethod(method)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant={method.isActive ? "destructive" : "outline"} size="sm" onClick={() => handleToggleMethodStatus(method)}>
                                  {method.isActive ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">No payment methods found. Add one to get started.</TableCell>
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
                  <div className="flex justify-center items-center h-40"><p>Loading payment verifications...</p></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
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
                      {pendingVerifications.length > 0 ? (
                        pendingVerifications.map((verification) => (
                          <TableRow key={verification.id}>
                            <TableCell className="font-medium">{verification.customerName}</TableCell>
                            <TableCell>{formatCurrency(verification.amount)}</TableCell>
                            <TableCell>{verification.referenceNumber}</TableCell>
                            <TableCell>{formatDate(verification.paymentDate)}</TableCell>
                            <TableCell>{verification.paymentMethod}</TableCell>
                            <TableCell>{new Date(verification.submittedAt).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" onClick={() => handleOpenVerificationDialog(verification)}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Verify
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">No pending payment verifications found.</TableCell>
                        </TableRow>
                      )}
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
                        <p className="font-medium">{new Date(selectedVerification.submittedAt).toLocaleString()}</p>
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
                  <Button variant="outline" onClick={() => {
                    setSelectedVerification(null);
                    setVerificationStatus("verified");
                    setVerificationNotes("");
                    setIsVerificationDialogOpen(false);
                  }}>Cancel</Button>
                  <Button onClick={handleVerifyPayment} className={verificationStatus === "verified" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}>
                    {verificationStatus === "verified" ? (
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
                {/* Render Customers Table */}
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
                            <Button variant="outline" size="sm" onClick={() => handleOpenBillDialog(customer)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Create Bill
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">No customers found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Dialog open={isBillDialogOpen} onOpenChange={setBillDialogOpen}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Bill</DialogTitle>
                  <DialogDescription>
                    Create a new bill for {selectedCustomer?.name} based on the billing statement.
                  </DialogDescription>
                </DialogHeader>
                {selectedCustomer && (
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Customer</Label>
                      <div className="col-span-3">
                        <p className="font-medium">{selectedCustomer.name}</p>
                        <p className="text-sm text-gray-500">{selectedCustomer.accountNumber}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="billing-period" className="text-right">Billing Period</Label>
                      <Input
                        id="billing-period"
                        type="text"
                        value={billingPeriod}
                        onChange={(e) => setBillingPeriod(e.target.value)}
                        className="col-span-3"
                        placeholder="e.g., 01/03/25 - 02/01/25"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="bill-amount" className="text-right">Amount (₱)</Label>
                      <Input
                        id="bill-amount"
                        type="number"
                        step="0.01"
                        value={billAmount}
                        onChange={(e) => setBillAmount(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="due-date" className="text-right">Due Date</Label>
                      <Input
                        id="due-date"
                        type="date"
                        value={billDueDate}
                        onChange={(e) => setBillDueDate(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="bill-description" className="text-right">Description</Label>
                      <Input
                        id="bill-description"
                        type="text"
                        value={billDescription}
                        onChange={(e) => setBillDescription(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="water-usage" className="text-right">Water Usage (gal)</Label>
                      <Input
                        id="water-usage"
                        type="number"
                        value={waterUsage}
                        onChange={(e) => setWaterUsage(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="current-reading" className="text-right">Current Reading</Label>
                      <Input
                        id="current-reading"
                        type="number"
                        value={currentReading}
                        onChange={(e) => setCurrentReading(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="previous-reading" className="text-right">Previous Reading</Label>
                      <Input
                        id="previous-reading"
                        type="number"
                        value={previousReading}
                        onChange={(e) => setPreviousReading(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="bill-account-number" className="text-right">Account #</Label>
                      <Input
                        id="bill-account-number"
                        type="text"
                        value={billAccountNumber}
                        onChange={(e) => setBillAccountNumber(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="meter-number" className="text-right">Meter #</Label>
                      <Input
                        id="meter-number"
                        type="text"
                        value={meterNumber}
                        onChange={(e) => setMeterNumber(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="water-charge" className="text-right">Water Charge (₱)</Label>
                      <Input
                        id="water-charge"
                        type="number"
                        step="0.01"
                        value={waterCharge}
                        onChange={(e) => setWaterCharge(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="tax-amount" className="text-right">Tax (₱)</Label>
                      <Input
                        id="tax-amount"
                        type="number"
                        step="0.01"
                        value={taxAmount}
                        onChange={(e) => setTaxAmount(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="penalty-amount" className="text-right">Penalty (₱)</Label>
                      <Input
                        id="penalty-amount"
                        type="number"
                        step="0.01"
                        value={penaltyAmount}
                        onChange={(e) => setPenaltyAmount(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="amount-after-due" className="text-right">Amount After Due (₱)</Label>
                      <Input
                        id="amount-after-due"
                        type="number"
                        step="0.01"
                        value={amountAfterDue}
                        onChange={(e) => setAmountAfterDue(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setBillAmount("");
                      setBillDueDate("");
                      setBillDescription("Monthly water bill");
                      setWaterUsage("");
                      setBillingPeriod("");
                      setCurrentReading("");
                      setPreviousReading("");
                      setBillAccountNumber("");
                      setMeterNumber("");
                      setWaterCharge("");
                      setTaxAmount("");
                      setPenaltyAmount("");
                      setAmountAfterDue("");
                      setBillDialogOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateBill} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Bill
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
