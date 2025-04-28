import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
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
import { AlertCircle, Phone } from "lucide-react";

const formSchema = z.object({
  firstName: z.string()
    .trim()
    .min(2, { message: "First name must be at least 2 characters." })
    .regex(/^[A-Za-zÑñ.\- ]+$/, "Only letters (including Ñ, ñ), dot (.), dash (-), and spaces are allowed")
    .refine((val) => val.trim().length > 0, { message: "First name cannot be empty or spaces only." }),

  lastName: z.string()
    .trim()
    .min(2, { message: "Last name must be at least 2 characters." })
    .regex(/^[A-Za-zÑñ.\- ]+$/, "Only letters (including Ñ, ñ), dot (.), dash (-), and spaces are allowed")
    .refine((val) => val.trim().length > 0, { message: "Last name cannot be empty or spaces only." }),

  middleInitial: z.string()
    .max(2, { message: "Middle initial can be up to 2 characters." })
    .regex(/^[A-Z]{1,2}$/, "Middle initial must be 1 or 2 uppercase letters.")
    .or(z.literal(""))
    .optional(),

  email: z.string()
    .regex(/^[A-Za-z0-9Ññ._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, "Invalid email address. Ensure it follows the format: example@domain.com")
    .or(z.literal(""))
    .optional(),

  phone: z.string()
    .optional()
    .refine((val) => !val || (/^0\d{10}$/.test(val)), { message: "Phone must be exactly 11 digits and start with 0" }),

  site: z.string().min(1, { message: "Please select a site location." }),

  isSenior: z.boolean().default(false),

  accountNumber: z.string(),

  meterNumber: z.string()
    .min(1, { message: "Meter number is required" })
    .regex(/^[A-Za-z0-9\-]+$/, "Meter number can only contain letters, numbers, and dash (-)"),

  block: z.string()
    .min(2, { message: "Block must be at least 2 characters." })
    .max(3, { message: "Block cannot exceed 3 characters." })
    .regex(/^[A-Za-z0-9]+$/, "Block can only contain letters and numbers"),

  lot: z.string()
    .min(2, { message: "Lot must be at least 2 characters." })
    .max(3, { message: "Lot cannot exceed 3 characters." })
    .regex(/^[A-Za-z0-9]+$/, "Lot can only contain letters and numbers"),
});

interface AddCustomerFormProps {
  defaultValues?: Partial<z.infer<typeof formSchema>>;
  onSubmit?: (data: z.infer<typeof formSchema>) => void;
  onCancel?: () => void;
}

const handleNumberOnly = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (!/^[0-9]$/.test(e.key) && e.key !== "Backspace" && e.key !== "Tab") {
    e.preventDefault();
  }
};

const AddCustomerForm: React.FC<AddCustomerFormProps> = ({
  onSubmit = () => {},
  onCancel = () => {},
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [generatedAccountNumber, setGeneratedAccountNumber] = useState("");
  const [isValidatingDetails, setIsValidatingDetails] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",  
      middleInitial: "",
      email: "",
      phone: "",
      site: "",
      isSenior: false,
      accountNumber: "",
      meterNumber: "",
      block: "",
      lot: "",
    },
  });

  // Generate Account Number based on block, lot, site
  const generateAccountNumber = (block: string, lot: string, selectedSite: string) => {
    const siteCode = selectedSite === "site1" ? "15" :
                     selectedSite === "site2" ? "14" :
                     selectedSite === "site3" ? "12" : "00";

    if (!block || !lot) return "";

    const blockNum = block.padStart(2, "0");
    const blockLot = (block + lot).padStart(4, "0");

    return `${blockNum}-${siteCode}-${blockLot}`;
  };

  // Auto-generate account number when block, lot or site changes
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (values.block && values.lot && values.site) {
        const accountNum = generateAccountNumber(values.block, values.lot, values.site);
        if (accountNum !== form.getValues("accountNumber")) {
          setGeneratedAccountNumber(accountNum);
          form.setValue("accountNumber", accountNum);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Check if account number or meter number already exists
  const checkIfDetailsExist = async (accountNumber: string, meterNumber: string) => {
    setIsValidatingDetails(true);
    
    try {
      // Check if account number exists
      const accountQuery = query(
        collection(db, "customers"), 
        where("accountNumber", "==", accountNumber)
      );
      const accountSnapshot = await getDocs(accountQuery);
      
      if (!accountSnapshot.empty) {
        setError("Account number already exists. Please use a different block/lot/site combination.");
        setIsValidatingDetails(false);
        return true;
      }
      
      // Check if meter number exists
      const meterQuery = query(
        collection(db, "customers"), 
        where("meterNumber", "==", meterNumber)
      );
      const meterSnapshot = await getDocs(meterQuery);
      
      if (!meterSnapshot.empty) {
        setError("Meter number already exists. Please enter a different meter number.");
        setIsValidatingDetails(false);
        return true;
      }
      
      setError("");
      setIsValidatingDetails(false);
      return false;
    } catch (error: any) {
      setError("Error validating customer details: " + error.message);
      setIsValidatingDetails(false);
      return true;
    }
  };

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    setError("");
  
    try {
      // Check if account number or meter number already exists
      const detailsExist = await checkIfDetailsExist(generatedAccountNumber, data.meterNumber);
      
      if (detailsExist) {
        setIsSubmitting(false);
        return;
      }
      
      const siteAddresses = {
        site1: "Site 1, Brgy. Dayap, Calauan, Laguna",
        site2: "Site 2, Brgy. Dayap, Calauan, Laguna",
        site3: "Site 3, Brgy. Dayap, Calauan, Laguna",
      };
  
      const fullName = `${data.firstName} ${data.middleInitial ? data.middleInitial + '. ' : ''}${data.lastName}`.trim();
  
      const customerData = {
        firstName: data.firstName,
        lastName: data.lastName,
        middleInitial: data.middleInitial || null,
        name: fullName,
        email: data.email || null,
        phone: data.phone || null,
        site: data.site,
        accountNumber: generatedAccountNumber,
        meterNumber: data.meterNumber,
        address: siteAddresses[data.site as keyof typeof siteAddresses],
        joinDate: new Date().toISOString().split("T")[0],
        lastBillingDate: new Date().toISOString().split("T")[0],
        status: "active",
        block: data.block,
        lot: data.lot,
      };
  
      await addDoc(collection(db, "customers"), customerData);
      onSubmit({ ...data, accountNumber: generatedAccountNumber });
      form.reset();
      setGeneratedAccountNumber("");
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

            <FormField control={form.control} name="firstName" render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl><Input placeholder="Juan" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="lastName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl><Input placeholder="Dela Cruz" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="middleInitial" render={({ field }) => (
                <FormItem>
                  <FormLabel>Middle Initial (Optional)</FormLabel>
                  <FormControl><Input placeholder="M" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl><Input placeholder="juandelacruz@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="09123456789" 
                      maxLength={11} 
                      inputMode="numeric" 
                      {...field}
                      onKeyDown={handleNumberOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="accountNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl><Input readOnly value={generatedAccountNumber} placeholder="Auto-generated" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="site" render={({ field }) => (
                <FormItem>
                  <FormLabel>Site Location</FormLabel>
                  <Select onValueChange={(value) => field.onChange(value)} defaultValue={field.value}>
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

              <FormField control={form.control} name="meterNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Meter Number</FormLabel>
                  <FormControl><Input placeholder="Enter meter number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="block" render={({ field }) => (
                <FormItem>
                  <FormLabel>Block</FormLabel>
                  <FormControl><Input placeholder="Block" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="lot" render={({ field }) => (
                <FormItem>
                  <FormLabel>Lot</FormLabel>
                  <FormControl><Input placeholder="Lot" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="isSenior" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
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
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting || isValidatingDetails}>Cancel</Button>
        <Button 
          onClick={form.handleSubmit(handleSubmit)} 
          disabled={isSubmitting || isValidatingDetails} 
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? "Adding Customer..." : 
           isValidatingDetails ? "Validating Details..." : "Add Customer"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AddCustomerForm;