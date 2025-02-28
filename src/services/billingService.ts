import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

const BILLS_COLLECTION = "bills";
const PAYMENTS_COLLECTION = "payments";

export interface Bill {
  id?: string;
  customerId: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  dueDate: string;
  description?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  waterUsage?: number;
}

export interface Payment {
  id?: string;
  customerId: string;
  billId?: string;
  date: string;
  amount: number;
  method: string;
  status: "completed" | "processing" | "failed";
  transactionId?: string;
  notes?: string;
}

// Bill operations
export const addBill = async (bill: Omit<Bill, "id">) => {
  try {
    const docRef = await addDoc(collection(db, BILLS_COLLECTION), bill);
    return { id: docRef.id, ...bill };
  } catch (error) {
    throw error;
  }
};

export const updateBill = async (id: string, data: Partial<Bill>) => {
  try {
    const billRef = doc(db, BILLS_COLLECTION, id);
    await updateDoc(billRef, data);
    return { id, ...data };
  } catch (error) {
    throw error;
  }
};

export const deleteBill = async (id: string) => {
  try {
    const billRef = doc(db, BILLS_COLLECTION, id);
    await deleteDoc(billRef);
    return id;
  } catch (error) {
    throw error;
  }
};

export const getBill = async (id: string) => {
  try {
    const billRef = doc(db, BILLS_COLLECTION, id);
    const billSnap = await getDoc(billRef);

    if (billSnap.exists()) {
      return { id: billSnap.id, ...billSnap.data() } as Bill;
    } else {
      throw new Error("Bill not found");
    }
  } catch (error) {
    throw error;
  }
};

export const getCustomerBills = async (customerId: string) => {
  try {
    const q = query(
      collection(db, BILLS_COLLECTION),
      where("customerId", "==", customerId),
      orderBy("date", "desc"),
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Bill[];
  } catch (error) {
    throw error;
  }
};

// Payment operations
export const addPayment = async (payment: Omit<Payment, "id">) => {
  try {
    const docRef = await addDoc(collection(db, PAYMENTS_COLLECTION), payment);

    // If this payment is for a specific bill, update the bill status
    if (payment.billId && payment.status === "completed") {
      const billRef = doc(db, BILLS_COLLECTION, payment.billId);
      const billSnap = await getDoc(billRef);

      if (billSnap.exists()) {
        const billData = billSnap.data() as Bill;
        if (payment.amount >= billData.amount) {
          await updateDoc(billRef, { status: "paid" });
        }
      }
    }

    return { id: docRef.id, ...payment };
  } catch (error) {
    throw error;
  }
};

export const updatePayment = async (id: string, data: Partial<Payment>) => {
  try {
    const paymentRef = doc(db, PAYMENTS_COLLECTION, id);
    await updateDoc(paymentRef, data);
    return { id, ...data };
  } catch (error) {
    throw error;
  }
};

export const getCustomerPayments = async (customerId: string) => {
  try {
    const q = query(
      collection(db, PAYMENTS_COLLECTION),
      where("customerId", "==", customerId),
      orderBy("date", "desc"),
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Payment[];
  } catch (error) {
    throw error;
  }
};

// Analytics and reporting
export const getBillingTrends = async (months: number = 12) => {
  try {
    // Get start date (X months ago)
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Get all bills since start date
    const q = query(
      collection(db, BILLS_COLLECTION),
      where("date", ">=", startDate.toISOString().split("T")[0]),
      orderBy("date"),
    );

    const billsSnapshot = await getDocs(q);
    const bills = billsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Bill[];

    // Get all payments since start date
    const paymentsQuery = query(
      collection(db, PAYMENTS_COLLECTION),
      where("date", ">=", startDate.toISOString().split("T")[0]),
      orderBy("date"),
    );

    const paymentsSnapshot = await getDocs(paymentsQuery);
    const payments = paymentsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Payment[];

    // Group by month
    const monthlyData = {};

    // Process bills
    bills.forEach((bill) => {
      const date = new Date(bill.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: new Date(
            date.getFullYear(),
            date.getMonth(),
            1,
          ).toLocaleString("default", { month: "short" }),
          billed: 0,
          collected: 0,
          outstanding: 0,
        };
      }

      monthlyData[monthKey].billed += bill.amount;

      if (bill.status !== "paid") {
        monthlyData[monthKey].outstanding += bill.amount;
      }
    });

    // Process payments
    payments.forEach((payment) => {
      if (payment.status === "completed") {
        const date = new Date(payment.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: new Date(
              date.getFullYear(),
              date.getMonth(),
              1,
            ).toLocaleString("default", { month: "short" }),
            billed: 0,
            collected: 0,
            outstanding: 0,
          };
        }

        monthlyData[monthKey].collected += payment.amount;
      }
    });

    // Convert to array and sort by date
    return Object.keys(monthlyData)
      .sort()
      .map((key) => monthlyData[key]);
  } catch (error) {
    throw error;
  }
};

export const getPaymentStatusDistribution = async () => {
  try {
    const billsSnapshot = await getDocs(collection(db, BILLS_COLLECTION));
    const bills = billsSnapshot.docs.map((doc) => doc.data()) as Bill[];

    const statusCounts = {
      paid: 0,
      pending: 0,
      overdue: 0,
      partiallyPaid: 0,
    };

    // Count bills by status
    bills.forEach((bill) => {
      if (bill.status === "paid") {
        statusCounts.paid++;
      } else if (bill.status === "pending") {
        statusCounts.pending++;
      } else if (bill.status === "overdue") {
        statusCounts.overdue++;
      }
    });

    // Format for chart
    return [
      { name: "Paid", value: statusCounts.paid, color: "#4ade80" },
      { name: "Pending", value: statusCounts.pending, color: "#facc15" },
      { name: "Overdue", value: statusCounts.overdue, color: "#f87171" },
      {
        name: "Partially Paid",
        value: statusCounts.partiallyPaid,
        color: "#60a5fa",
      },
    ];
  } catch (error) {
    throw error;
  }
};
