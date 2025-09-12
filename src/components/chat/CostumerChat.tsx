import React, { useState, useEffect, useRef } from "react";
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
import { getStorage, ref, getDownloadURL } from "firebase/storage";

const storage = getStorage();

function isImageFile(fileName: string) {
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".bmp")
  );
}

function isVideoFile(fileName: string) {
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith(".mp4") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".ogg") ||
    lower.endsWith(".mov")
  );
}


function parseFileMessage(message: string) {
  // Format: "File attached: originalFileName|chat_files/timestamp_originalFileName"
  if (!message.startsWith("File attached:")) return null;
  const content = message.replace("File attached:", "").trim();
  const [displayName, fileId] = content.split("|");
  return { displayName, fileId };
}

interface Message {
  id: string;
  message: string;
  sender: string;
  timestamp: Date;
}

interface CustomerChatProps {
  customerDocId: string;
  customerName: string;
  customerAvatar: string;
  accountNumber: string;
  userRole: "admin" | "staff";
}

const urlCache = new Map<string, string>();

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
  const [fileUrls, setFileUrls] = useState<{ [key: string]: string }>({});
  const lastMessageRef = useRef<HTMLDivElement | null>(null);
  // Add this outside the component to make it persist across renders

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

      markMessagesAsRead();
    });

    return () => unsubscribe();
  }, [accountNumber]);

useEffect(() => {
  const fetchFileUrls = async () => {
    const urls: { [key: string]: string } = {};
    for (const msg of messages) {
      const fileInfo = msg.message && parseFileMessage(msg.message);
      if (fileInfo && fileInfo.fileId) {
        // Check if URL is already cached
        if (urlCache.has(fileInfo.fileId)) {
          urls[msg.id] = urlCache.get(fileInfo.fileId)!;
        } else {
          try {
            const fileRef = ref(storage, fileInfo.fileId);
            const url = await getDownloadURL(fileRef);
            urlCache.set(fileInfo.fileId, url);
            urls[msg.id] = url;
          } catch (e) {
            // Handle errors silently
          }
        }
      }
    }
    setFileUrls(urls);
  };

  fetchFileUrls();
}, [messages]);


  useEffect(() => {
    if (!loading && messages.length > 0 && lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !accountNumber) return;

    try {
      const chatDocRef = doc(db, "chats", accountNumber);
      const chatSnap = await getDoc(chatDocRef);
      const currentLastMessageAdmin = chatSnap.exists() ? chatSnap.data()?.lastMessageAdmin || "" : "";

      await addDoc(collection(db, "chats", accountNumber, "messages"), {
        message: newMessage,
        sender: "admin",
        timestamp: serverTimestamp(),
      });

      await updateDoc(chatDocRef, {
        lastMessageAdmin: newMessage,
        lastMessageTime: serverTimestamp(),
        unreadCount: increment(1),
        hasNewMessage: true,
      });

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
              {messages.map((msg, idx) => {
                const fileInfo = msg.message && parseFileMessage(msg.message);
                const isLast = idx === messages.length - 1;
                return (
                  <div
                    key={msg.id}
                    ref={isLast ? lastMessageRef : undefined}
                    className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.sender === "admin" ? "bg-blue-100" : "bg-gray-100"
                      }`}
                    >
                    {fileInfo && fileInfo.fileId ? (
                      <div>
                        {fileUrls[msg.id] && isImageFile(fileInfo.displayName) && (
                          <div className="mt-2">
                            <img
                              src={fileUrls[msg.id]}
                              alt={fileInfo.displayName}
                              style={{ maxWidth: 200, borderRadius: 8 }}
                            />
                          </div>
                        )}

                        {fileUrls[msg.id] && isVideoFile(fileInfo.displayName) && (
                          <div className="mt-2">
                            <video
                              src={fileUrls[msg.id]}
                              controls
                              style={{ maxWidth: 300, borderRadius: 8 }}
                            />
                          </div>
                        )}

                        {fileUrls[msg.id] && !isImageFile(fileInfo.displayName) && !isVideoFile(fileInfo.displayName) && (
                          <div className="mt-2">
                            <a
                              href={fileUrls[msg.id]}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "#2563eb", textDecoration: "underline" }}
                            >
                              📄 {fileInfo.displayName}
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm">{msg.message}</p>
                    )}

                    </div>
                  </div>
                );
              })}
              <div ref={lastMessageRef} />
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
