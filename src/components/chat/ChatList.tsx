import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, User } from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";

interface ChatCustomer {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  accountNumber: string;
  hasNewMessage: boolean;
  hasNewImage: boolean;
  lastMessageAdmin: string;
  lastMessageUser: string;
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
    // Subscribe to real-time updates from the "chats" collection.
    const unsubscribe = onSnapshot(collection(db, "chats"), (snapshot) => {
      const customersList: ChatCustomer[] = snapshot.docs.map((chatDoc) => {
        const data = chatDoc.data();
        const accountNumber = chatDoc.id.trim();
        return {
          id: accountNumber, // Use doc.id as unique ID
          name: `Account ${accountNumber}`, // Adjust display name as needed
          avatar: data.avatar || "", // Optionally stored avatar URL
          lastMessage: data.lastMessage || "Conversation active",
          lastMessageTime: data.lastMessageTime ? data.lastMessageTime.toDate() : new Date(),
          unreadCount: data.unreadCount || 0,
          accountNumber,
          hasNewMessage: data.hasNewMessage || false,
          hasNewImage: data.hasNewImage || false,
          lastMessageAdmin: data.lastMessageAdmin || "",
          lastMessageUser: data.lastMessageUser || "",
        };
      });
      setCustomers(customersList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
                  className={`relative p-4 hover:bg-gray-50 cursor-pointer ${
                    selectedCustomerId === customer.id ? "bg-blue-50" : ""
                  }`}
                  onClick={() =>
                    onSelectCustomer(customer.id, customer.accountNumber)
                  }
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={customer.avatar} alt={customer.name} />
                        <AvatarFallback>
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      {/* Display badge only if the last message from the user is non-empty */}
                      {customer.lastMessageUser.trim() !== "" &&
                        (customer.unreadCount > 0 ||
                          customer.hasNewMessage ||
                          customer.hasNewImage) && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                            {customer.unreadCount > 0 ? customer.unreadCount : "1"}
                          </span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <h4
                          className={`text-sm truncate ${
                            customer.hasNewMessage ? "font-bold text-blue-700" : "font-medium"
                          }`}
                        >
                          {customer.name}
                        </h4>
                        <span className="text-xs text-gray-500">
                          {customer.lastMessageTime.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-gray-500 truncate">
                          {customer.lastMessage}
                        </p>
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
