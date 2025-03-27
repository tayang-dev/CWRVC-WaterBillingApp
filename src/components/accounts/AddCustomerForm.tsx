import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { collection, getDocs, addDoc, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email().optional().or(z.literal("")), // Optional email
  phone: z.string().min(10, { message: "Phone number must be at least 10 characters." }),
  site: z.string().min(1, { message: "Please select a site location." }),
  isSenior: z.boolean().default(false),
  accountNumber: z.string().min(7, { message: "Invalid account number format." }), // Validated format
});

interface AddCustomerFormProps {
  defaultValues?: Partial<z.infer<typeof formSchema>>;
  onSubmit?: (data: z.infer<typeof formSchema>) => void;
  onCancel?: () => void;
}

const AddCustomerForm: React.FC<AddCustomerFormProps> = ({
  onSubmit = () => {},
  onCancel = () => {},
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [generatedAccountNumber, setGeneratedAccountNumber] = useState("01-01-001");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      site: "site1",
      isSenior: false,
      accountNumber: generatedAccountNumber, // Initial default value
    },
  });

  // Generate Account Number based on Site
  const generateAccountNumber = async (selectedSite: string) => {
    try {
      const siteCode = selectedSite === "site1" ? "01" :
                       selectedSite === "site2" ? "02" : "03";

      const customersRef = collection(db, "customers");
      const q = query(customersRef, where("site", "==", selectedSite), orderBy("accountNumber", "desc"), limit(1));
      const querySnapshot = await getDocs(q);

      let newAccountNumber = `${siteCode}-01-001`; // Default first entry

      if (!querySnapshot.empty) {
        const latestAccount = querySnapshot.docs[0].data().accountNumber;
        console.log("🔍 Latest Account Found:", latestAccount);

        const [latestSite, latestBlock, latestCustomer] = latestAccount.split("-").map(Number);

        let newBlock = latestBlock;
        let newCustomerNum = latestCustomer + 1;

        if (newCustomerNum > 999) {
          newCustomerNum = 1;
          newBlock++;
        }

        newAccountNumber = `${siteCode}-${String(newBlock).padStart(2, "0")}-${String(newCustomerNum).padStart(3, "0")}`;
      }

      console.log(`✅ Generated Account Number: ${newAccountNumber}`);
      setGeneratedAccountNumber(newAccountNumber);
      form.setValue("accountNumber", newAccountNumber); // Updates form value
    } catch (error) {
      console.error("❌ Error generating account number:", error);
    }
  };

  // Generate new account number when form loads
  useEffect(() => {
    generateAccountNumber("site1");
  }, []);

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    setError("");

    try {
      const siteAddresses = {
        site1: "Site 1, Brgy. Dayap, Calauan, Laguna",
        site2: "Site 2, Brgy. Dayap, Calauan, Laguna",
        site3: "Site 3, Brgy. Dayap, Calauan, Laguna",
      };

      const customerData = {
        ...data,
        email: data.email || null, // Store empty email as `null`
        accountNumber: generatedAccountNumber, // Assign generated account number
        address: siteAddresses[data.site as keyof typeof siteAddresses],
        joinDate: new Date().toISOString().split("T")[0],
        lastBillingDate: new Date().toISOString().split("T")[0],
        amountDue: 0,
        status: "active", // Set default status to "active"
      };

      // Save to Firestore
      const docRef = await addDoc(collection(db, "customers"), customerData);
      console.log("✅ Customer added with ID:", docRef.id);
      
      onSubmit({ ...data, accountNumber: generatedAccountNumber });
      form.reset();
      generateAccountNumber(data.site); // Generate new account number for next customer
    } catch (error: any) {
      setError(error.message || "An error occurred while adding the customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-blue-700">Add New Customer</CardTitle>
        <CardDescription>Fill out the form below to add a new customer to the system.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 text-sm rounded-md bg-red-50 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name</FormLabel>
                  <FormControl><Input placeholder="Juan Dela Cruz" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address (Optional)</FormLabel>
                  <FormControl><Input placeholder="juandelacruz@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl><Input placeholder="09122341234" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="accountNumber" render={() => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl><Input value={generatedAccountNumber} disabled /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="site" render={({ field }) => (
                <FormItem>
                  <FormLabel>Site Location</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value);
                    generateAccountNumber(value);
                  }} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select site location" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="site1">Site 1</SelectItem>
                      <SelectItem value="site2">Site 2</SelectItem>
                      <SelectItem value="site3">Site 3</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="isSenior" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Senior Citizen</FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )} />
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between border-t p-6">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={form.handleSubmit(handleSubmit)}
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? "Adding Customer..." : "Add Customer"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AddCustomerForm;