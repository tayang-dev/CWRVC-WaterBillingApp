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
import { Search, User, MessageCircle, Clock, Image as ImageIcon, Users } from "lucide-react";
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
          id: accountNumber,
          name: `Account ${accountNumber}`,
          avatar: data.avatar || "",
          lastMessage: data.lastMessage || "Conversation active",
          lastMessageTime: data.lastMessageTime
            ? data.lastMessageTime.toDate()
            : new Date(),
          unreadCount: data.unreadCount || 0,
          accountNumber,
          hasNewMessage: data.hasNewMessage || false,
          hasNewImage: data.hasNewImage || false,
          lastMessageAdmin: data.lastMessageAdmin || "",
          lastMessageUser: data.lastMessageUser || "",
        };
      });
      
      // Sort customers by last message time (most recent first)
      customersList.sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
      
      setCustomers(customersList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.accountNumber.includes(searchTerm)
  );

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInHours / 24;

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInMs / (1000 * 60));
      return minutes < 1 ? "Just now" : `${minutes}m`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)}d`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
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

  return (
    <Card className="w-full h-full shadow-lg border-0 bg-gradient-to-br from-slate-50 to-white">
      <CardHeader className="pb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5" />
          <div>
            <CardTitle className="text-lg font-semibold">Customer Support</CardTitle>
            <CardDescription className="text-blue-100">
              {userRole === "admin" ? "Admin Dashboard" : "Staff Dashboard"} • {filteredCustomers.length} conversations
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
              {filteredCustomers.map((customer, index) => {
                const isSelected = selectedCustomerId === customer.id;
                const isUnread = customer.lastMessageUser === "User" && 
                               (customer.hasNewMessage || customer.unreadCount > 0 || customer.hasNewImage);
                
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
                        
                        {/* Unread indicator badge */}
                        {isUnread && (
                          <div className="absolute -top-1 -right-1">
                            <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse">
                              {customer.unreadCount > 0 ? customer.unreadCount : "!"}
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col">
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
                          
                          <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                            <div className="flex items-center space-x-1 text-xs text-slate-500">
                              <Clock className="h-3 w-3" />
                              <span>{formatTime(customer.lastMessageTime)}</span>
                            </div>
                            {customer.hasNewImage && (
                              <div className="flex items-center space-x-1">
                                <ImageIcon className="h-3 w-3 text-green-500" />
                                <span className="text-xs text-green-600 font-medium">Image</span>
                              </div>
                            )}
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
                    
                    {/* Hover effect indicator */}
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
      
      {/* Footer stats */}
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