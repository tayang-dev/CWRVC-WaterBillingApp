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
  limit,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "../lib/firebase";

const CUSTOMERS_COLLECTION = "customers";

export interface Customer {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  accountNumber: string;
  status: "active" | "inactive" | "pending";
  joinDate: string;
  lastBillingDate?: string;
  amountDue?: number;
}

export const addCustomer = async (customer: Omit<Customer, "id">) => {
  try {
    const docRef = await addDoc(collection(db, CUSTOMERS_COLLECTION), customer);
    return { id: docRef.id, ...customer };
  } catch (error) {
    throw error;
  }
};

export const updateCustomer = async (id: string, data: Partial<Customer>) => {
  try {
    const customerRef = doc(db, CUSTOMERS_COLLECTION, id);
    await updateDoc(customerRef, data);
    return { id, ...data };
  } catch (error) {
    throw error;
  }
};

export const deleteCustomer = async (id: string) => {
  try {
    const customerRef = doc(db, CUSTOMERS_COLLECTION, id);
    await deleteDoc(customerRef);
    return id;
  } catch (error) {
    throw error;
  }
};

export const getCustomer = async (id: string) => {
  try {
    const customerRef = doc(db, CUSTOMERS_COLLECTION, id);
    const customerSnap = await getDoc(customerRef);

    if (customerSnap.exists()) {
      return { id: customerSnap.id, ...customerSnap.data() } as Customer;
    } else {
      throw new Error("Customer not found");
    }
  } catch (error) {
    throw error;
  }
};

export const getAllCustomers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, CUSTOMERS_COLLECTION));
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as any),
    })) as Customer[];
  } catch (error) {
    throw error;
  }
};

export const searchCustomers = async (searchTerm: string, filters: any) => {
  try {
    let customersQuery = collection(db, CUSTOMERS_COLLECTION);
    let constraints = [];

    // Add filters
    if (filters.status && filters.status !== "all") {
      constraints.push(where("status", "==", filters.status));
    }

    if (filters.billingCycle && filters.billingCycle !== "all") {
      constraints.push(where("billingCycle", "==", filters.billingCycle));
    }

    if (filters.location && filters.location !== "all") {
      constraints.push(where("location", "==", filters.location));
    }

    // Execute query
    const q = query(customersQuery, ...constraints);
    const querySnapshot = await getDocs(q);

    // Filter results by search term client-side (Firestore doesn't support full text search)
    const results = querySnapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as any) }) as Customer)
      .filter((customer) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          customer.name.toLowerCase().includes(searchLower) ||
          customer.email.toLowerCase().includes(searchLower) ||
          customer.accountNumber.toLowerCase().includes(searchLower) ||
          customer.phone.toLowerCase().includes(searchLower)
        );
      });

    return results;
  } catch (error) {
    throw error;
  }
};

export const getPaginatedCustomers = async (
  pageSize: number = 10,
  lastVisible?: QueryDocumentSnapshot<DocumentData>,
) => {
  try {
    let customersQuery;

    if (lastVisible) {
      customersQuery = query(
        collection(db, CUSTOMERS_COLLECTION),
        orderBy("name"),
        startAfter(lastVisible),
        limit(pageSize),
      );
    } else {
      customersQuery = query(
        collection(db, CUSTOMERS_COLLECTION),
        orderBy("name"),
        limit(pageSize),
      );
    }

    const querySnapshot = await getDocs(customersQuery);
    const lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1];

    const customers = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as any),
    })) as Customer[];

    return {
      customers,
      lastVisible: lastVisibleDoc,
    };
  } catch (error) {
    throw error;
  }
};
