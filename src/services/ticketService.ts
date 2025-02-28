import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

const TICKETS_COLLECTION = "tickets";
const TICKET_RESPONSES_COLLECTION = "ticketResponses";

export interface Ticket {
  id?: string;
  title: string;
  description: string;
  customerId: string;
  customerName?: string;
  dateCreated: string;
  status: "open" | "in-progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  assignedTo?: string;
}

export interface TicketResponse {
  id?: string;
  ticketId: string;
  author: string;
  authorId: string;
  authorAvatar?: string;
  content: string;
  timestamp: string;
  isStaff: boolean;
}

// Ticket operations
export const addTicket = async (ticket: Omit<Ticket, "id" | "dateCreated">) => {
  try {
    const ticketData = {
      ...ticket,
      dateCreated: new Date().toISOString(),
      status: ticket.status || "open",
    };

    const docRef = await addDoc(collection(db, TICKETS_COLLECTION), ticketData);
    return { id: docRef.id, ...ticketData };
  } catch (error) {
    throw error;
  }
};

export const updateTicket = async (id: string, data: Partial<Ticket>) => {
  try {
    const ticketRef = doc(db, TICKETS_COLLECTION, id);
    await updateDoc(ticketRef, data);
    return { id, ...data };
  } catch (error) {
    throw error;
  }
};

export const getTicket = async (id: string) => {
  try {
    const ticketRef = doc(db, TICKETS_COLLECTION, id);
    const ticketSnap = await getDoc(ticketRef);

    if (ticketSnap.exists()) {
      return { id: ticketSnap.id, ...ticketSnap.data() } as Ticket;
    } else {
      throw new Error("Ticket not found");
    }
  } catch (error) {
    throw error;
  }
};

export const getAllTickets = async () => {
  try {
    const q = query(
      collection(db, TICKETS_COLLECTION),
      orderBy("dateCreated", "desc"),
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Ticket[];
  } catch (error) {
    throw error;
  }
};

export const getCustomerTickets = async (customerId: string) => {
  try {
    const q = query(
      collection(db, TICKETS_COLLECTION),
      where("customerId", "==", customerId),
      orderBy("dateCreated", "desc"),
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Ticket[];
  } catch (error) {
    throw error;
  }
};

export const searchTickets = async (searchTerm: string, filters: any) => {
  try {
    let ticketsQuery = collection(db, TICKETS_COLLECTION);
    let constraints = [];

    // Add filters
    if (filters.status && filters.status !== "all") {
      constraints.push(where("status", "==", filters.status));
    }

    if (filters.priority && filters.priority !== "all") {
      constraints.push(where("priority", "==", filters.priority));
    }

    // Execute query
    const q = query(
      ticketsQuery,
      ...constraints,
      orderBy("dateCreated", "desc"),
    );
    const querySnapshot = await getDocs(q);

    // Filter results by search term client-side
    const results = querySnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as Ticket)
      .filter((ticket) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          ticket.title.toLowerCase().includes(searchLower) ||
          ticket.description.toLowerCase().includes(searchLower) ||
          ticket.customerName?.toLowerCase().includes(searchLower) ||
          ticket.id.toLowerCase().includes(searchLower)
        );
      });

    return results;
  } catch (error) {
    throw error;
  }
};

// Ticket response operations
export const addTicketResponse = async (
  response: Omit<TicketResponse, "id" | "timestamp">,
) => {
  try {
    const responseData = {
      ...response,
      timestamp: new Date().toISOString(),
    };

    const docRef = await addDoc(
      collection(db, TICKET_RESPONSES_COLLECTION),
      responseData,
    );

    // Update the ticket status if needed
    if (response.isStaff) {
      const ticketRef = doc(db, TICKETS_COLLECTION, response.ticketId);
      await updateDoc(ticketRef, { status: "in-progress" });
    }

    return { id: docRef.id, ...responseData };
  } catch (error) {
    throw error;
  }
};

export const getTicketResponses = async (ticketId: string) => {
  try {
    const q = query(
      collection(db, TICKET_RESPONSES_COLLECTION),
      where("ticketId", "==", ticketId),
      orderBy("timestamp"),
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TicketResponse[];
  } catch (error) {
    throw error;
  }
};
