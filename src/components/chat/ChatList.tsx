import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, User } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";

interface ChatCustomer {
  // We’ll use the same interface, but now
  // `id` and `accountNumber` will both refer to the doc.id from "chats"
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  accountNumber: string;
}

interface ChatListProps {
  onSelectCustomer: (customerId: string, accountNumber: string) => void;
  selectedCustomerId?: string;
  userRole?: "admin" | "staff";
}

const ChatList: React.FC<ChatListProps> = ({
  onSelectCustomer,
  selectedCustomerId,
  userRole = "admin",
}) => {
  const [customers, setCustomers] = useState<ChatCustomer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomersWithChat = async () => {
      try {
        // Fetch every doc in the "chats" collection.
        // Each doc ID is treated as an account number.
        const chatsSnapshot = await getDocs(collection(db, "chats"));

        const customersList: ChatCustomer[] = [];
        chatsSnapshot.docs.forEach((chatDoc) => {
          // The doc.id here is the "accountNumber"
          const accountNumber = chatDoc.id.trim();

          customersList.push({
            id: accountNumber,              // Use doc.id as the unique ID
            name: `Account ${accountNumber}`, // Or just use accountNumber directly
            avatar: "",                     // Optional: set a placeholder image
            lastMessage: "Conversation active",
            lastMessageTime: new Date(),
            unreadCount: 0,
            accountNumber,
          });
        });

        setCustomers(customersList);
      } catch (error) {
        console.error("Error fetching chat accounts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomersWithChat();
  }, []);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffInDays === 1) {
      return "Yesterday";
    } else if (diffInDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  // If you want to search by the account number, adjust the filter below
  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-3">
        <CardTitle>Customer Chats</CardTitle>
        <CardDescription>
          {userRole === "admin" ? "Admin" : "Staff"} support conversations
        </CardDescription>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-250px)]">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <p>Loading conversations...</p>
            </div>
          ) : filteredCustomers.length > 0 ? (
            <div className="divide-y">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${
                    selectedCustomerId === customer.id ? "bg-blue-50" : ""
                  }`}
                  onClick={() =>
                    onSelectCustomer(customer.id, customer.accountNumber)
                  }
                >
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={customer.avatar} alt={customer.name} />
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-medium truncate">
                          {customer.name}
                        </h4>
                        <span className="text-xs text-gray-500">
                          {formatTime(customer.lastMessageTime)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-gray-500 truncate">
                          {customer.lastMessage}
                        </p>
                        {customer.unreadCount > 0 && (
                          <Badge className="ml-2 bg-blue-500">
                            {customer.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex justify-center items-center h-32 text-gray-500">
              No conversations found
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ChatList;
