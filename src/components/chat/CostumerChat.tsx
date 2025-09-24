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
import { Send, User, Paperclip, X, FileText, Image, Video, File, Download, Eye } from "lucide-react";
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
import { getStorage, ref, getDownloadURL, uploadBytes } from "firebase/storage";

const storage = getStorage();

function isImageFile(fileName: string) {
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".bmp") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".svg")
  );
}

function isVideoFile(fileName: string) {
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith(".mp4") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".ogg") ||
    lower.endsWith(".mov") ||
    lower.endsWith(".avi") ||
    lower.endsWith(".mkv")
  );
}

function isDocumentFile(fileName: string) {
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith(".pdf") ||
    lower.endsWith(".doc") ||
    lower.endsWith(".docx") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".rtf") ||
    lower.endsWith(".xls") ||
    lower.endsWith(".xlsx") ||
    lower.endsWith(".ppt") ||
    lower.endsWith(".pptx")
  );
}

function getFileIcon(fileName: string) {
  if (isImageFile(fileName)) return <Image className="h-4 w-4" />;
  if (isVideoFile(fileName)) return <Video className="h-4 w-4" />;
  if (isDocumentFile(fileName)) return <FileText className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
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
  onSendMessage: (message: string) => Promise<boolean>;
  isSending: boolean;
}

const urlCache = new Map<string, string>();

const CustomerChat: React.FC<CustomerChatProps> = ({
  customerDocId,
  customerName,
  customerAvatar,
  accountNumber,
  userRole,
  onSendMessage,
  isSending,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [fileUrls, setFileUrls] = useState<{ [key: string]: string }>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Add ref for the message input field
  const messageInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !accountNumber || isUploading) return;

    setIsUploading(true);

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = selectedFile.name.split('.').pop();
      const fileName = `${timestamp}_${selectedFile.name}`;
      const filePath = `chat_files/${fileName}`;

      // Upload file to Firebase Storage
      const fileRef = ref(storage, filePath);
      await uploadBytes(fileRef, selectedFile);

      // Create file message
      const fileMessage = `File attached: ${selectedFile.name}|${filePath}`;

      // Use parent's onSendMessage for duplicate prevention
      const canSend = await onSendMessage(fileMessage);
      if (!canSend) {
        setIsUploading(false);
        return;
      }

      // Add message to Firestore
      const chatDocRef = doc(db, "chats", accountNumber);
      const chatSnap = await getDoc(chatDocRef);
      const currentLastMessageAdmin = chatSnap.exists() ? chatSnap.data()?.lastMessageAdmin || "" : "";

      await addDoc(collection(db, "chats", accountNumber, "messages"), {
        message: fileMessage,
        sender: "admin",
        timestamp: serverTimestamp(),
      });

      await updateDoc(chatDocRef, {
        lastMessageAdmin: `📎 ${selectedFile.name}`,
        lastMessageTime: serverTimestamp(),
        unreadCount: increment(1),
        hasNewMessage: true,
      });

      if (userRole === "admin" && !currentLastMessageAdmin.trim()) {
        await addDoc(collection(db, "notifications", accountNumber, "records"), {
          type: "customer_service",
          message: `File: ${selectedFile.name}`,
          sender: "admin",
          createdAt: serverTimestamp(),
        });
      }

      // Clear selected file and focus back to input
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      // Focus the message input after file upload
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 100);

    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !accountNumber || isSending) return;

    // Use parent's onSendMessage for duplicate prevention
    const canSend = await onSendMessage(newMessage);
    if (!canSend) return;

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
      
      // Focus the input field after sending message
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 50);
      
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // Focus back to message input
    setTimeout(() => {
      messageInputRef.current?.focus();
    }, 50);
  };

  return (
    <Card className="w-full h-full flex flex-col shadow-lg bg-gradient-to-br from-white to-gray-50">
      <CardHeader className="pb-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Avatar className="h-12 w-12 ring-2 ring-blue-200 ring-offset-2">
              <AvatarImage src={customerAvatar} alt={customerName} />
              <AvatarFallback className="bg-blue-500 text-white">
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl font-semibold text-gray-800">{customerName}</CardTitle>
            <CardDescription className="text-sm text-gray-600 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Customer Service Chat
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-0 overflow-hidden bg-gradient-to-b from-gray-50 to-white">
        <ScrollArea className="h-[calc(100vh-300px)] p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 ml-12">
              {messages.map((msg, idx) => {
                const fileInfo = msg.message && parseFileMessage(msg.message);
                const isLast = idx === messages.length - 1;
                const isAdminOrSystem = msg.sender === "admin" || msg.sender === "System";
                
                return (
                  <div
                    key={msg.id}
                    ref={isLast ? lastMessageRef : undefined}
                    className={`flex ${isAdminOrSystem ? "justify-end" : "justify-start"} animate-fade-in`}
                  >
                    <div className={`relative group max-w-[75%] ${isAdminOrSystem ? "order-2 mr-12" : "order-1"}`}>
                      {/* Avatar for customer messages */}
                      {!isAdminOrSystem && (
                        <div className="absolute -left-12 top-0">
                          <Avatar className="h-8 w-8 border-2 border-white shadow-md">
                            <AvatarImage src={customerAvatar} alt={customerName} />
                            <AvatarFallback className="bg-gray-400 text-white text-xs">
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                      
                      {/* Avatar for admin messages */}
                      {isAdminOrSystem && (
                        <div className="absolute -right-12 top-0">
                          <Avatar className="h-8 w-8 border-2 border-blue-200 shadow-md">
                            <AvatarFallback className="bg-blue-500 text-white text-xs">
                              A
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                      
                      {/* Message bubble */}
                      <div
                        className={`relative rounded-2xl p-4 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
                          isAdminOrSystem 
                            ? "bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white shadow-blue-200" 
                            : "bg-white border border-gray-100 text-gray-800 shadow-gray-200 hover:border-gray-200"
                        }`}
                      >
                        {/* Message content */}
                        {fileInfo && fileInfo.fileId ? (
                          <div className="space-y-3">
                            {fileUrls[msg.id] && isImageFile(fileInfo.displayName) && (
                              <div className="space-y-2">
                                <div className="relative group/image">
                                <a href={fileUrls[msg.id]} target="_blank" rel="noopener noreferrer" className="relative group/image block">
                                  <img
                                    src={fileUrls[msg.id]}
                                    alt={fileInfo.displayName}
                                    className="max-w-[250px] rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 shadow-md"
                                  />
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover/image:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center pointer-events-none">
                                    <Eye className="h-6 w-6 text-white opacity-0 group-hover/image:opacity-100 transition-opacity duration-200" />
                                  </div>
                                </a>
                                </div>
                                <p className={`text-xs ${isAdminOrSystem ? 'text-blue-100' : 'text-gray-500'}`}>
                                  {fileInfo.displayName}
                                </p>
                              </div>
                            )}

                            {fileUrls[msg.id] && isVideoFile(fileInfo.displayName) && (
                              <div className="space-y-2">
                                <video
                                  src={fileUrls[msg.id]}
                                  controls
                                  className="max-w-[300px] rounded-lg shadow-md"
                                />
                                <p className={`text-xs ${isAdminOrSystem ? 'text-blue-100' : 'text-gray-500'}`}>
                                  {fileInfo.displayName}
                                </p>
                              </div>
                            )}

                            {fileUrls[msg.id] && !isImageFile(fileInfo.displayName) && !isVideoFile(fileInfo.displayName) && (
                              <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-md ${
                                isAdminOrSystem ? 'bg-white/10 border-white/20' : 'bg-gray-50 border-gray-200'
                              }`}>
                                <div className={`p-2 rounded-lg ${isAdminOrSystem ? 'bg-white/20' : 'bg-blue-50'}`}>
                                  {React.cloneElement(getFileIcon(fileInfo.displayName), {
                                    className: `h-5 w-5 ${isAdminOrSystem ? 'text-white' : 'text-blue-500'}`
                                  })}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <a
                                    href={fileUrls[msg.id]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`text-sm font-medium hover:underline truncate block ${
                                      isAdminOrSystem ? 'text-white' : 'text-blue-600'
                                    }`}
                                  >
                                    {fileInfo.displayName}
                                  </a>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(fileUrls[msg.id], '_blank')}
                                  className={`h-8 w-8 p-0 ${
                                    isAdminOrSystem 
                                      ? 'hover:bg-white/20 text-white' 
                                      : 'hover:bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed">{msg.message}</p>
                        )}
                        
                        {/* Message timestamp */}
                        <div className={`text-xs mt-2 ${
                          isAdminOrSystem ? 'text-blue-100' : 'text-gray-400'
                        }`}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      

                    </div>
                  </div>
                );
              })}
              <div ref={lastMessageRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter className="border-t border-gray-200 p-4 bg-white">
        <div className="w-full space-y-3">
          {/* File preview section */}
          {selectedFile && (
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 animate-fade-in">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  {React.cloneElement(getFileIcon(selectedFile.name), {
                    className: "h-5 w-5 text-blue-600"
                  })}
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-800">{selectedFile.name}</span>
                  <div className="text-xs text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleFileUpload}
                  disabled={isUploading}
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-all duration-200"
                >
                  {isUploading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    "Send File"
                  )}
                </Button>
                <Button
                  onClick={removeSelectedFile}
                  size="sm"
                  variant="outline"
                  className="hover:bg-red-50 hover:border-red-200 transition-all duration-200"
                >
                  <X className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            </div>
          )}

          {/* Message input section */}
          <div className="flex w-full items-center space-x-3">
            {/* File upload button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,video/*,.pdf,.doc,.docx,.txt,.rtf,.xls,.xlsx,.ppt,.pptx"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              size="icon"
              variant="outline"
              disabled={isSending || isUploading}
              className="shrink-0 h-11 w-11 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
            >
              <Paperclip className="h-5 w-5 text-gray-600 group-hover:text-blue-600 transition-colors duration-200" />
            </Button>

            {/* Message input */}
            <div className="flex-1 relative">
              <Input
                ref={messageInputRef}
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isSending || isUploading}
                className="h-11 pl-4 pr-12 rounded-xl border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
              />
            </div>

            {/* Send message button */}
            <Button 
              onClick={handleSendMessage} 
              size="icon"
              disabled={!newMessage.trim() || isSending || isUploading}
              className="shrink-0 h-11 w-11 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 transition-all duration-200 transform hover:scale-105 active:scale-95"
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Send className="h-5 w-5 text-white" />
              )}
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default CustomerChat;