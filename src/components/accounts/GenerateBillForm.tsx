import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Send } from "lucide-react";

const formSchema = z.object({
  amount: z.string().min(1, { message: "Amount is required" }),
  dueDate: z.string().min(1, { message: "Due date is required" }),
  description: z.string().optional(),
  waterUsage: z.string().min(1, { message: "Water usage is required" }),
});

interface GenerateBillFormProps {
  customerId: string;
  customerName: string;
  accountNumber: string;
  onSubmit?: (data: z.infer<typeof formSchema>) => void;
  onCancel?: () => void;
}

const GenerateBillForm: React.FC<GenerateBillFormProps> = ({
  customerId,
  customerName,
  accountNumber,
  onSubmit = () => {},
  onCancel = () => {},
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Calculate due date (15 days from now)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 15);
  const dueDateString = dueDate.toISOString().split("T")[0];

  // Calculate billing period
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);
  const endDate = new Date();
  const billingPeriod = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: "87.50",
      dueDate: dueDateString,
      description: "Monthly water bill",
      waterUsage: "2450",
    },
  });

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    setError("");
    try {
      // Add bill to Firestore
      const { collection, addDoc } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");

      const billData = {
        customerId,
        date: new Date().toISOString().split("T")[0],
        amount: parseFloat(data.amount),
        status: "pending",
        dueDate: data.dueDate,
        description: data.description || "Monthly water bill",
        billingPeriodStart: startDate.toISOString().split("T")[0],
        billingPeriodEnd: endDate.toISOString().split("T")[0],
        waterUsage: parseInt(data.waterUsage),
      };

      try {
        const docRef = await addDoc(collection(db, "bills"), billData);
        console.log("Bill generated with ID:", docRef.id);

        // Update customer's lastBillingDate and amountDue
        const { doc, updateDoc } = await import("firebase/firestore");
        await updateDoc(doc(db, "customers", customerId), {
          lastBillingDate: new Date().toISOString().split("T")[0],
          amountDue: parseFloat(data.amount),
        });

        onSubmit(data);
      } catch (firestoreError: any) {
        setError(firestoreError.message || "Failed to generate bill");
      }
    } catch (error: any) {
      setError(error.message || "An error occurred while generating the bill");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-white">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-blue-700">
          Generate New Bill
        </CardTitle>
        <CardDescription>
          Create a new bill for this customer. This will be sent to their email
          address.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 text-sm rounded-md bg-red-50 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <p className="text-sm font-medium col-span-1">Customer:</p>
            <p className="col-span-3">{customerName}</p>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <p className="text-sm font-medium col-span-1">Account:</p>
            <p className="col-span-3">{accountNumber}</p>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <p className="text-sm font-medium col-span-1">Billing Period:</p>
            <p className="col-span-3">{billingPeriod}</p>
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 mt-4"
          >
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="waterUsage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Water Usage (gallons)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={form.handleSubmit(handleSubmit)}
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Send className="mr-2 h-4 w-4" />
          {isSubmitting ? "Generating..." : "Generate & Send"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GenerateBillForm;
