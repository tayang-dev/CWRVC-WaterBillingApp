import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import TicketSearch from "./TicketSearch";
import TicketList from "./TicketList";
import NewTicketForm from "./NewTicketForm";

interface Ticket {
  id: string;
  title: string;
  customer: string;
  dateCreated: string;
  status: "open" | "in-progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
}

interface CustomerServiceProps {}

const CustomerService = ({}: CustomerServiceProps) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch tickets from Firestore
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const { collection, query, orderBy, getDocs } = await import(
          "firebase/firestore"
        );
        const { db } = await import("../../lib/firebase");

        const ticketsQuery = query(
          collection(db, "tickets"),
          orderBy("dateCreated", "desc"),
        );

        const ticketsSnapshot = await getDocs(ticketsQuery);
        const ticketsList = ticketsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          title: doc.data().title || "",
          customer: doc.data().customerName || doc.data().customer || "",
          dateCreated:
            doc.data().dateCreated || new Date().toISOString().split("T")[0],
          status: doc.data().status || "open",
          priority: doc.data().priority || "medium",
        }));

        if (ticketsList.length > 0) {
          setTickets(ticketsList as Ticket[]);
        } else {
          // Fallback to mock data if no tickets found
          setTickets([
            {
              id: "TKT-001",
              title: "Water meter reading incorrect",
              customer: "John Smith",
              dateCreated: "2023-06-15",
              status: "open",
              priority: "medium",
            },
            {
              id: "TKT-002",
              title: "Billing dispute for May invoice",
              customer: "Sarah Johnson",
              dateCreated: "2023-06-14",
              status: "in-progress",
              priority: "high",
            },
            {
              id: "TKT-003",
              title: "Request for payment extension",
              customer: "Michael Brown",
              dateCreated: "2023-06-12",
              status: "resolved",
              priority: "low",
            },
            {
              id: "TKT-004",
              title: "Water service interruption",
              customer: "Emily Davis",
              dateCreated: "2023-06-10",
              status: "open",
              priority: "urgent",
            },
            {
              id: "TKT-005",
              title: "Online account access issues",
              customer: "Robert Wilson",
              dateCreated: "2023-06-08",
              status: "closed",
              priority: "medium",
            },
          ]);
        }
      } catch (error) {
        console.error("Error fetching tickets:", error);
        // Fallback to mock data
        setTickets([
          {
            id: "TKT-001",
            title: "Water meter reading incorrect",
            customer: "John Smith",
            dateCreated: "2023-06-15",
            status: "open",
            priority: "medium",
          },
          {
            id: "TKT-002",
            title: "Billing dispute for May invoice",
            customer: "Sarah Johnson",
            dateCreated: "2023-06-14",
            status: "in-progress",
            priority: "high",
          },
          {
            id: "TKT-003",
            title: "Request for payment extension",
            customer: "Michael Brown",
            dateCreated: "2023-06-12",
            status: "resolved",
            priority: "low",
          },
          {
            id: "TKT-004",
            title: "Water service interruption",
            customer: "Emily Davis",
            dateCreated: "2023-06-10",
            status: "open",
            priority: "urgent",
          },
          {
            id: "TKT-005",
            title: "Online account access issues",
            customer: "Robert Wilson",
            dateCreated: "2023-06-08",
            status: "closed",
            priority: "medium",
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);
  const [activeTab, setActiveTab] = useState("all-tickets");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>(tickets);

  // Handle search functionality
  const handleSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredTickets(tickets);
      return;
    }

    const lowercasedSearch = searchTerm.toLowerCase();
    const results = tickets.filter(
      (ticket) =>
        ticket.id.toLowerCase().includes(lowercasedSearch) ||
        ticket.title.toLowerCase().includes(lowercasedSearch) ||
        ticket.customer.toLowerCase().includes(lowercasedSearch),
    );

    setFilteredTickets(results);
  };

  // Handle filter changes
  const handleFilterChange = (filter: string) => {
    if (filter === "all") {
      setFilteredTickets(tickets);
      return;
    }

    // Example filter implementation - can be expanded based on requirements
    const results = tickets.filter((ticket) => {
      if (filter === "recent") {
        // Filter for tickets created in the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return new Date(ticket.dateCreated) >= sevenDaysAgo;
      }
      return true;
    });

    setFilteredTickets(results);
  };

  // Handle status filter
  const handleStatusChange = (status: string) => {
    if (status === "all") {
      setFilteredTickets(tickets);
      return;
    }

    const results = tickets.filter((ticket) => ticket.status === status);
    setFilteredTickets(results);
  };

  // Handle priority filter
  const handlePriorityChange = (priority: string) => {
    if (priority === "all") {
      setFilteredTickets(tickets);
      return;
    }

    const results = tickets.filter((ticket) => ticket.priority === priority);
    setFilteredTickets(results);
  };

  // Handle ticket selection
  const handleSelectTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setActiveTab("ticket-details");
  };

  // Handle creating a new ticket
  const handleCreateTicket = () => {
    setActiveTab("new-ticket");
  };

  // Handle form submission for new ticket
  const handleNewTicketSubmit = async (data: any) => {
    try {
      // Add ticket to Firestore
      const { collection, addDoc } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");

      const ticketData = {
        title: data.title,
        description: data.description,
        customerId: data.customerId,
        customerName: data.customerName || "",
        dateCreated: new Date().toISOString(),
        status: "open",
        priority: data.priority,
        category: data.category,
      };

      const docRef = await addDoc(collection(db, "tickets"), ticketData);
      console.log("Ticket created with ID:", docRef.id);

      // Refresh tickets list
      const ticketsQuery = await import("firebase/firestore").then(
        ({ collection, query, orderBy, getDocs }) => {
          return query(
            collection(db, "tickets"),
            orderBy("dateCreated", "desc"),
          );
        },
      );

      const ticketsSnapshot = await getDocs(ticketsQuery);
      const ticketsList = ticketsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        title: doc.data().title || "",
        customer: doc.data().customerName || doc.data().customer || "",
        dateCreated:
          doc.data().dateCreated || new Date().toISOString().split("T")[0],
        status: doc.data().status || "open",
        priority: doc.data().priority || "medium",
      }));

      setTickets(ticketsList as Ticket[]);
      setActiveTab("all-tickets");
    } catch (error) {
      console.error("Error creating ticket:", error);
    }
  };

  // Find the selected ticket details
  const selectedTicket = tickets.find(
    (ticket) => ticket.id === selectedTicketId,
  );

  // Render ticket details component
  const renderTicketDetails = () => {
    if (!selectedTicket) return null;

    return (
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {selectedTicket.title}
            </h1>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <span>Created: {selectedTicket.dateCreated}</span>
              </span>
              <span className="flex items-center gap-1 ml-4">
                <span>Ticket #{selectedTicket.id}</span>
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              {selectedTicket.status.replace("-", " ")}
            </div>
            <div className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
              {selectedTicket.priority}
            </div>
          </div>
        </div>

        <div className="mb-6 p-4 border rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                {selectedTicket.customer.charAt(0)}
              </div>
              <div>
                <h3 className="font-medium">{selectedTicket.customer}</h3>
                <p className="text-sm text-gray-500">
                  {selectedTicket.customer.toLowerCase().replace(" ", ".")}
                  @example.com
                </p>
              </div>
            </div>
          </div>
          <p className="text-gray-700">
            This is a placeholder for the ticket description. In a real
            application, this would contain the detailed description of the
            issue reported by the customer.
          </p>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Ticket History</h2>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                    S
                  </div>
                  <span className="font-medium">Support Agent</span>
                </div>
                <span className="text-sm text-gray-500">Today, 10:30 AM</span>
              </div>
              <p className="text-gray-700">
                This is a placeholder for a support agent response. In a real
                application, this would contain the actual response from the
                support team.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Add Response</h2>
          <textarea
            placeholder="Type your response here..."
            className="w-full min-h-[120px] p-3 border rounded-lg mb-4"
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline">Cancel</Button>
            <Button>Send Response</Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-blue-800">Customer Service</h1>
          <Button
            onClick={handleCreateTicket}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Ticket
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all-tickets">All Tickets</TabsTrigger>
            <TabsTrigger value="ticket-details" disabled={!selectedTicketId}>
              Ticket Details
            </TabsTrigger>
            <TabsTrigger value="new-ticket">New Ticket</TabsTrigger>
          </TabsList>

          <TabsContent value="all-tickets" className="space-y-6">
            <TicketSearch
              onSearch={handleSearch}
              onFilterChange={handleFilterChange}
              onStatusChange={handleStatusChange}
              onPriorityChange={handlePriorityChange}
              onClear={() => setFilteredTickets(tickets)}
            />
            <TicketList
              tickets={filteredTickets}
              onSelectTicket={handleSelectTicket}
            />
          </TabsContent>

          <TabsContent value="ticket-details">
            {renderTicketDetails()}
          </TabsContent>

          <TabsContent value="new-ticket">
            <NewTicketForm onSubmit={handleNewTicketSubmit} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CustomerService;
