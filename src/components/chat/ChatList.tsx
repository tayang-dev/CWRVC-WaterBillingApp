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
import { Badge } from "@/components/ui/badge";
import { Search, User, MessageCircle, Clock, Users } from "lucide-react";
import { collection, onSnapshot, getDocs, query, orderBy, limit } from "firebase/firestore";
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
  userRole = "staff",
}) => {
  const [customers, setCustomers] = useState<ChatCustomer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🚀 ChatList mounted and useEffect running");
    
    // Helper: convert Firestore Timestamp / number / string to Date
    const toDate = (val: any): Date | null => {
      if (!val) return null;
      
      // Handle Firestore Timestamp
      if (typeof val === "object" && typeof val.toDate === "function") {
        try { 
          return val.toDate();
        } catch (e) { 
          console.error("❌ Failed to convert Firestore Timestamp:", e);
          return null;
        }
      }
      
      // Handle seconds/milliseconds timestamp
      if (typeof val === "number") {
        // If number is too small, it might be seconds instead of milliseconds
        const timestamp = val < 10000000000 ? val * 1000 : val;
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          return date;
        }
        return null;
      }
      
      // Handle string dates
      if (typeof val === "string") {
        const date = new Date(val);
        if (!isNaN(date.getTime())) {
          return date;
        }
        return null;
      }
      
      // Already a Date object
      if (val instanceof Date) {
        if (!isNaN(val.getTime())) {
          return val;
        }
        return null;
      }
      
      return null;
    };

    console.log("📌 Setting up Firestore listener for 'chats' collection...");
    
    const unsubscribe = onSnapshot(
      collection(db, "chats"), 
      async (snapshot) => {
        console.log("\n" + "=".repeat(60));
        console.log("📬 FIRESTORE SNAPSHOT RECEIVED");
        console.log("=".repeat(60));
        console.log("📊 Snapshot size:", snapshot.size);

        const customersList: ChatCustomer[] = await Promise.all(
          snapshot.docs.map(async (chatDoc) => {
            const data = chatDoc.data();
            const accountNumber = chatDoc.id.trim();
            
            console.log(`\n💬 Processing chat: ${accountNumber}`);

            // Try to get latest message from subcollection messages
            let lastMsgText = data.lastMessage || "Conversation active";
            let lastMsgTime: Date | null = null;
            let lastMsgSender = data.lastMessageUser || "";

            try {
              console.log(`🔍 Fetching messages subcollection for ${accountNumber}...`);
              const msgsRef = collection(db, "chats", accountNumber, "messages");
              const q = query(msgsRef, orderBy("timestamp", "desc"), limit(1));
              const msgsSnap = await getDocs(q);
              
              if (!msgsSnap.empty) {
                const m = msgsSnap.docs[0].data();
                console.log(`📄 Latest message for ${accountNumber}:`, {
                  message: m.message,
                  sender: m.sender,
                  timestamp: m.timestamp
                });
                
                lastMsgText = m.message || lastMsgText;
                lastMsgSender = m.sender || lastMsgSender;
                
                // Try to convert timestamp
                const convertedTime = toDate(m.timestamp);
                if (convertedTime) {
                  lastMsgTime = convertedTime;
                  console.log(`✅ Message timestamp: ${convertedTime.toISOString()}`);
                }
              }
            } catch (err) {
              console.error(`🔥 ERROR fetching messages for ${accountNumber}:`, err);
            }

            // Fallback to parent document timestamps if message timestamp is invalid
            if (!lastMsgTime) {
              console.log(`🔄 Using fallback timestamp for ${accountNumber}`);
              lastMsgTime = toDate(data.lastMessageTime) || toDate(data.createdAt) || new Date();
            }

            // Ensure we always have a valid date
            if (!lastMsgTime || isNaN(lastMsgTime.getTime())) {
              console.warn(`⚠️ Invalid date for ${accountNumber}, using current time`);
              lastMsgTime = new Date();
            }

            const customer = {
              id: accountNumber,
              name: `Account ${accountNumber}`,
              avatar: data.avatar || "",
              lastMessage: lastMsgText,
              lastMessageTime: lastMsgTime,
              unreadCount: data.unreadCount || 0,
              accountNumber,
              hasNewMessage: data.hasNewMessage || false,
              hasNewImage: data.hasNewImage || false,
              lastMessageAdmin: lastMsgSender === "admin" ? lastMsgText : (data.lastMessageAdmin || ""),
              lastMessageUser: lastMsgSender !== "admin" ? lastMsgText : (data.lastMessageUser || ""),
            } as ChatCustomer;
            
            console.log(`✅ Customer ${accountNumber} time:`, customer.lastMessageTime.toISOString());
            
            return customer;
          })
        );

        // Sort by timestamp
        customersList.sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
        
        console.log("\n📊 FINAL SORTED LIST:");
        customersList.forEach(c => {
          console.log(`${c.id}: ${c.lastMessageTime.toLocaleString()}`);
        });

        setCustomers(customersList);
        setLoading(false);
      }, 
      (err) => {
        console.error("🔥 FIRESTORE SNAPSHOT ERROR:", err);
        setLoading(false);
      }
    );

    return () => {
      console.log("🧹 ChatList cleanup");
      unsubscribe();
    };
  }, []);

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.accountNumber.includes(searchTerm)
  );

  const formatCompactDateTime = (date: Date | null | undefined): string => {
    // Add defensive checks
    if (!date) {
      console.warn("⚠️ formatCompactDateTime: date is null/undefined");
      return "—";
    }
    
    if (!(date instanceof Date)) {
      console.warn("⚠️ formatCompactDateTime: not a Date object:", date);
      return "—";
    }
    
    if (isNaN(date.getTime())) {
      console.warn("⚠️ formatCompactDateTime: invalid date:", date);
      return "—";
    }
    
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const diffTime = today.getTime() - msgDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      if (date.toDateString() === now.toDateString()) {
        return timeStr;
      } else if (diffDays === 1) {
        return `Yesterday ${timeStr}`;
      } else if (diffDays < 7) {
        return `${date.toLocaleDateString([], { weekday: "short" })} ${timeStr}`;
      } else {
        const dateStr = date.toLocaleDateString([], {
          month: "short",
          day: "numeric",
          year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
        });
        return `${dateStr} ${timeStr}`;
      }
    } catch (error) {
      console.error("❌ Error formatting date:", error, date);
      return "—";
    }
  };

  const formatFullLocale = (date?: Date | null) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return "";
    try {
      return date.toLocaleString();
    } catch {
      return "";
    }
  };

  const getStatusIndicator = (customer: ChatCustomer) => {
    const isUnread = customer.lastMessageUser === "User" && 
                    (customer.hasNewMessage || customer.unreadCount > 0);
    
    if (isUnread) {
      return (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium text-blue-600">New</span>
        </div>
      );
    }
    return null;
  };

  console.log("🎨 Rendering ChatList with", customers.length, "customers");

  return (
    <Card className="w-full h-full shadow-lg border-0 bg-gradient-to-br from-slate-50 to-white">
      <CardHeader className="pb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5" />
          <div>
            <CardTitle className="text-lg font-semibold">Customer Service</CardTitle>
            <CardDescription className="text-blue-100">
              {userRole === "admin" ? "Admin Dashboard" : "Cashier Dashboard"} • {filteredCustomers.length} conversations
            </CardDescription>
          </div>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by account number or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-slate-200 focus:bg-white/20"
          />
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-280px)]">
          {loading ? (
            <div className="flex flex-col justify-center items-center h-40 text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
              <p className="text-sm">Loading conversations...</p>
            </div>
          ) : filteredCustomers.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {filteredCustomers.map((customer) => {
                const isSelected = selectedCustomerId === customer.id;
                const isUnread = customer.lastMessageUser === "User" && 
                               (customer.hasNewMessage || customer.unreadCount > 0 || customer.hasNewImage);
                
                // Debug log for each customer render
                console.log(`Rendering ${customer.id}:`, {
                  lastMessageTime: customer.lastMessageTime,
                  formatted: formatCompactDateTime(customer.lastMessageTime),
                  isValid: customer.lastMessageTime instanceof Date && !isNaN(customer.lastMessageTime.getTime())
                });
                
                return (
                  <div
                    key={customer.id}
                    className={`relative p-4 transition-all duration-200 cursor-pointer group hover:shadow-md ${
                      isSelected 
                        ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-r-4 border-blue-500" 
                        : "hover:bg-slate-50"
                    }`}
                    onClick={() => onSelectCustomer(customer.id, customer.accountNumber)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="relative flex-shrink-0">
                        <Avatar className={`ring-2 transition-all ${
                          isUnread ? "ring-blue-400 ring-offset-2" : "ring-slate-200"
                        }`}>
                          <AvatarImage src={customer.avatar} alt={customer.name} />
                          <AvatarFallback className={`${
                            isUnread ? "bg-blue-100 text-blue-700" : "bg-slate-100"
                          }`}>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        
                        {isUnread && (
                          <div className="absolute -top-1 -right-1">
                            <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse">
                              {customer.unreadCount > 0 ? customer.unreadCount : "!"}
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex justify-between items-start gap-2 overflow-visible">
                            <div className="flex-1 min-w-0 pr-3">
                              <h4 className={`text-sm font-medium truncate ${
                                isUnread ? "text-blue-900 font-semibold" : "text-slate-900"
                              }`}>
                                {customer.name}
                              </h4>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="outline" className="text-xs px-2 py-0">
                                  {customer.accountNumber}
                                </Badge>
                                {getStatusIndicator(customer)}
                              </div>
                            </div>

                              <div className="flex flex-col items-end justify-center flex-shrink-0 w-[140px] min-w-[110px] z-20">
                                <span
                                  className="text-[11px] text-slate-700 font-medium z-20 whitespace-nowrap"
                                  title={formatFullLocale(customer.lastMessageTime)}
                                >
                                  {formatCompactDateTime(customer.lastMessageTime)}
                                </span>
                                <Clock className="h-3 w-3 text-gray-500 opacity-70 mt-1" />
                              </div>



                          </div>
                        
                        <div className="flex items-center space-x-2">
                          <p className={`text-xs truncate flex-1 ${
                            isUnread ? "text-slate-600 font-medium" : "text-slate-500"
                          }`}>
                            {userRole === "admin"
                              ? (customer.lastMessageAdmin || "Waiting for response...")
                              : (customer.lastMessage || "Conversation active")}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-blue-400 to-purple-400 transition-all duration-200 ${
                      isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-50"
                    }`}></div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col justify-center items-center h-40 text-slate-400">
              <Users className="h-12 w-12 mb-3 text-slate-300" />
              <p className="text-sm font-medium">No conversations found</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchTerm ? "Try adjusting your search terms" : "Conversations will appear here"}
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
      
      <div className="px-4 py-2 bg-slate-50 border-t rounded-b-lg">
        <div className="flex justify-between items-center text-xs text-slate-500">
          <span className="flex items-center space-x-1">
            <MessageCircle className="h-3 w-3" />
            <span>{customers.filter(c => c.hasNewMessage || c.unreadCount > 0).length} active</span>
          </span>
          <span className="flex items-center space-x-1">
            <Users className="h-3 w-3" />
            <span>{filteredCustomers.length} total</span>
          </span>
        </div>
      </div>
    </Card>
  );
};

export default ChatList;