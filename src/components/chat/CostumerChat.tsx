import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User } from "lucide-react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
  getDoc,
  increment,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

interface Message {
  id: string;
  message: string;
  sender: string;
  timestamp: Date;
}

interface CustomerChatProps {
  customerDocId: string; // user document id from "users"
  customerName: string;
  customerAvatar: string;
  accountNumber: string; // The consumer account number from consumerAccounts field
  userRole: "admin" | "staff";
}

const CustomerChat: React.FC<CustomerChatProps> = ({
  customerDocId,
  customerName,
  customerAvatar,
  accountNumber,
  userRole,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountNumber) return;

    const messagesQuery = query(
      collection(db, "chats", accountNumber, "messages"),
      orderBy("timestamp", "asc")
    );
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        message: doc.get("message"),
        sender: doc.get("sender"),
        timestamp: doc.get("timestamp")?.toDate() || new Date(),
      })) as Message[];
      setMessages(messagesList);
      setLoading(false);

      // Automatically mark messages as read when the chat is opened
      markMessagesAsRead();
    });

    return () => unsubscribe();
  }, [accountNumber]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !accountNumber) return;

    try {
      // Reference to parent chat document
      const chatDocRef = doc(db, "chats", accountNumber);

      // Read current chat document to see if an admin reply already exists
      const chatSnap = await getDoc(chatDocRef);
      const currentLastMessageAdmin = chatSnap.exists() ? chatSnap.data()?.lastMessageAdmin || "" : "";

      // Send the admin message in the messages subcollection
      await addDoc(collection(db, "chats", accountNumber, "messages"), {
        message: newMessage,
        sender: "admin",
        timestamp: serverTimestamp(),
      });

      // Update the parent chat document with the admin reply details
      await updateDoc(chatDocRef, {
        lastMessageAdmin: newMessage,
        lastMessageTime: serverTimestamp(),
        unreadCount: increment(1),
        hasNewMessage: true,
      });

      // If it is the first admin reply, add a notification
      if (userRole === "admin" && !currentLastMessageAdmin.trim()) {
        await addDoc(collection(db, "notifications", accountNumber, "records"), {
          type: "customer_service",
          message: newMessage,
          sender: "admin",
          createdAt: serverTimestamp(),
        });
      }

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const markMessagesAsRead = async () => {
    if (!accountNumber) return;

    try {
      await updateDoc(doc(db, "chats", accountNumber), {
        hasNewMessage: false,
        unreadCount: 0,
      });
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center">
          <Avatar className="h-10 w-10 mr-3">
            <AvatarImage src={customerAvatar} alt={customerName} />
            <AvatarFallback>
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-lg">{customerName}</CardTitle>
            <CardDescription>Customer Service Chat</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-0 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-280px)] p-4">
          {loading ? (
            <p className="text-center">Loading messages...</p>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.sender === "admin" ? "bg-blue-100" : "bg-gray-100"
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter className="border-t p-3">
        <div className="flex w-full items-center space-x-2">
          <Input
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-grow"
          />
          <Button onClick={handleSendMessage} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default CustomerChat;
