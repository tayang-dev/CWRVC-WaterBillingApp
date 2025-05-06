import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
  writeBatch,
  collectionGroup,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Bell, LogOut, Settings, ChevronDown } from "lucide-react";
import { format } from "date-fns";

// Define TypeScript interface for notifications
interface Notification {
  id: string;
  title: string;
  message: string;
  link: string;
  date: string;
  read: boolean;
  collectionName: string; // Track which collection the notification belongs to
  rawTimestamp?: number;
}

// Define Firestore document structure
interface FirestoreData {
  accountNumber?: string;
  customerName?: string;
  verificationStatus?: string;
  status?: string;
  date?: string;
  read?: boolean;
  timestamp?: Timestamp | string;
  firstName?: string;
  lastName?: string;
  feedback?: string;
  rating?: number;
  categories?: string[];
  userId?: string;
  appVersion?: string;
  lastMessageTime?: Timestamp;
  lastMessageAdmin?: string;
  hasNewMessage?: boolean;
  submissionDateTime?: string;
  dueDate?: string;
}

// Define meter reading interface extending FirestoreData
interface MeterReading extends FirestoreData {
  id: string;
  currentReading?: number;
  previousReading?: number;
  name?: string;
  site?: string;
  month?: number;
  year?: number;
}

const Header = ({
  userName = "Admin User",
  userAvatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
}) => {
  const { userRole } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getFirestore();
  const [unbilledReadingsCount, setUnbilledReadingsCount] = useState(0);
  const [unbilledReadings, setUnbilledReadings] = useState<MeterReading[]>([]);
  const [unreadReadingsCount, setUnreadReadingsCount] = useState(0);

  useEffect(() => {
    const collections = [
      {
        name: "paymentVerifications",
        condition: where("status", "==", "pending"),
        title: "Pending Payment",
        link: (id: string) => `/payments?tab=payment-verification&id=${id}`,
      },
      {
        name: "requests",
        condition: where("status", "==", "pending"),
        title: "New Service Request",
        link: (id: string) => `/requests?tab=service-requests&id=${id}`,
      },
      {
        name: "chats",
        condition: where("hasNewMessage", "==", true),
        title: "New Chat Message",
        link: (id: string) => `/customer-support?tab=chat&chat=${id}`,
      },
      {
        name: "leaks",
        condition: where("read", "==", false),
        title: "New Leak Report",
        link: (id: string) => `/reports?tab=leak-reports&id=${id}`,
      },
      {
        name: "feedback",
        condition: where("read", "==", false),
        title: "New Customer Feedback",
        link: (id: string) => `/feedback?tab=feedback-list&id=${id}`,
      },
    ];

    const sortByDateDesc = (notifications: Notification[]) => {
      return [...notifications].sort((a, b) => (b.rawTimestamp ?? 0) - (a.rawTimestamp ?? 0));
    };

    const unsubscribeList = collections.map(({ name, condition, title, link }) => {
      const colRef = condition ? query(collection(db, name), condition) : collection(db, name);

      return onSnapshot(colRef, (snapshot) => {
        console.log(`[${name}] Fetched ${snapshot.docs.length} documents`);

        const updates: Notification[] = [];

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data() as FirestoreData;
          const notificationId = docSnap.id;
          const readStatus = data.read ?? false;

          let rawTime: number;
          let date: string;

          if (data.timestamp instanceof Timestamp) {
            rawTime = data.timestamp.toMillis();
            date = format(data.timestamp.toDate(), "MMM dd, yyyy hh:mm a");
          } else if (typeof data.timestamp === "string") {
            rawTime = new Date(data.timestamp).getTime();
            date = format(new Date(data.timestamp), "MMM dd, yyyy hh:mm a");
          } else {
            rawTime = Date.now();
            date = format(new Date(rawTime), "MMM dd, yyyy hh:mm a");
          }

          let message = "New notification";
          if (name === "chats") {
            message = data.lastMessageAdmin || "New chat message";
          } else if (name === "leaks") {
            message = data.accountNumber || "Leak report";
          } else if (name === "paymentVerifications") {
            message = data.customerName || data.accountNumber || "Payment verification";
          } else if (name === "requests") {
            message = data.accountNumber || "Customer request";
          } else if (name === "users") {
            message = [data.firstName, data.lastName].filter(Boolean).join(" ") || "User verification";
          } else if (name === "feedback") {
            const rating = data.rating ? `${data.rating}★` : "";
            const category = data.categories && data.categories.length > 0 ? `[${data.categories[0]}]` : "";
            message = `${rating} ${category} ${data.feedback?.substring(0, 30)}${data.feedback && data.feedback.length > 30 ? '...' : ''}`.trim();
          }

          updates.push({
            id: notificationId,
            title,
            message,
            link: link(notificationId),
            date,
            read: readStatus,
            collectionName: name,
            rawTimestamp: rawTime,
          });
        }

        setNotifications((prev) => {
          const updatedIds = new Set(updates.map((u) => `${u.collectionName}-${u.id}`));

          const filteredPrev = prev.filter((n) => {
            const idKey = `${n.collectionName}-${n.id}`;
            return !updatedIds.has(idKey);
          });

          const merged = [...filteredPrev, ...updates];
          return sortByDateDesc(merged);
        });
      });
    });

    return () => {
      unsubscribeList.forEach((unsubscribe) => unsubscribe());
    };
  }, [db]);

  // --- Meter Readings Notification Logic ---
  useEffect(() => {
    // Listen to all meter readings records
    const unsubRecords = onSnapshot(
      collectionGroup(db, "records"),
      async (snapshot) => {
        const readings = snapshot.docs
          .map((doc) => ({ 
            id: doc.id, 
            ...doc.data() as FirestoreData,
            // Get reference path components for updating the document later
            accountNumber: doc.data().accountNumber || doc.ref.parent.parent?.id
          }))
          .filter((r) => r.accountNumber && r.dueDate);

        // Listen to all bills
        const unsubBills = onSnapshot(collectionGroup(db, "records"), (billsSnap) => {
          const bills = billsSnap.docs.map((b) => b.data());

          // Helper to calculate billing period from due date
          const calculateBillingPeriodFromDueDate = (dueDateStr: string) => {
            if (!dueDateStr) return "";
            const [day, month, year] = dueDateStr.split("/").map(Number);
            const dueDate = new Date(year, month - 1, day);
            const from = new Date(dueDate.getFullYear(), dueDate.getMonth() - 1, 1);
            const to = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);

            const format = (date: Date) =>
              `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;

            return `${format(from)} - ${format(to)}`;
          };

          // Build a set of billed keys: accountNumber + billingPeriod
          const billedKeys = new Set(
            bills
              .filter((b) => b.accountNumber && b.billingPeriod)
              .map(
                (b) =>
                  String(b.accountNumber).trim() +
                  "_" +
                  String(b.billingPeriod).trim()
              )
          );

          // Only readings that do NOT have a bill for the same accountNumber + billingPeriod
          const unbilled = readings.filter((r) => {
            const billingPeriod = calculateBillingPeriodFromDueDate(r.dueDate!);
            const key = String(r.accountNumber).trim() + "_" + billingPeriod;
            return !billedKeys.has(key);
          });

          setUnbilledReadings(unbilled);
          setUnbilledReadingsCount(unbilled.length);
          
          // Count unread readings (those without a read:true field)
          const unreadCount = unbilled.filter(r => !r.read).length;
          setUnreadReadingsCount(unreadCount);
        });

        // Clean up bills listener when records change
        return () => unsubBills();
      }
    );

    return () => {
      unsubRecords();
    };
  }, [db]);

  // Function to mark a meter reading as read
  const markMeterReadingAsRead = async (reading: MeterReading) => {
    try {
      if (!reading.id || !reading.accountNumber) return;
      
      // Path to the document: meterReadings/accountNumber/records/readingId
      const readingRef = doc(db, `meterReadings/${reading.accountNumber}/records/${reading.id}`);
      await updateDoc(readingRef, { 
        read: true,
        readTimestamp: Timestamp.now() 
      });
      
      // Update local state to reflect changes immediately
      setUnbilledReadings(prev => 
        prev.map(r => 
          r.id === reading.id ? {...r, read: true} : r
        )
      );
      
      // Update unread count
      setUnreadReadingsCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking meter reading as read:", error);
    }
  };

  // Function to mark all meter readings as read
  const markAllMeterReadingsAsRead = async () => {
    const unreadReadings = unbilledReadings.filter(r => !r.read);
    if (unreadReadings.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      let batchCount = 0;
      
      for (const reading of unreadReadings) {
        if (reading.id && reading.accountNumber) {
          const readingRef = doc(db, `meterReadings/${reading.accountNumber}/records/${reading.id}`);
          batch.update(readingRef, { 
            read: true,
            readTimestamp: Timestamp.now() 
          });
          batchCount++;
          
          if (batchCount >= 400) {
            await batch.commit();
            batchCount = 0;
          }
        }
      }
      
      if (batchCount > 0) {
        await batch.commit();
      }
      
      // Update local state to reflect changes
      setUnbilledReadings(prev => 
        prev.map(reading => ({...reading, read: true}))
      );
      
      // Update unread count
      setUnreadReadingsCount(0);
    } catch (error) {
      console.error("Error marking all meter readings as read:", error);
    }
  };

  const markAsRead = async (notification: Notification) => {
    if (!notification.read) {
      try {
        // Use the correct collection name stored in the notification
        const notificationRef = doc(db, notification.collectionName, notification.id);
        await updateDoc(notificationRef, { read: true });

        // Update local state - maintain sorting when updating
        setNotifications((prev) => {
          const updated = prev.map((n) =>
            n.id === notification.id && n.collectionName === notification.collectionName
              ? { ...n, read: true }
              : n
          );
          // No need to resort since read status doesn't affect sorting
          return updated;
        });

        // Navigate to the specific link with tab parameters
        if (notification.link) {
          navigate(notification.link);
          setShowNotifications(false);
        }
      } catch (error) {
        console.error(`Error marking notification as read (${notification.collectionName}/${notification.id}):`, error);
      }
    } else if (notification.link) {
      // If already read, just navigate and close the notification panel
      navigate(notification.link);
      setShowNotifications(false);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter((n) => !n.read);
    // Check if there are any unread notifications or unread meter readings
    if (unreadNotifications.length === 0 && unreadReadingsCount === 0) return;
  
    try {
      // Handle regular notifications
      const batch = writeBatch(db);
      const updatedIds = new Set();
      let batchCount = 0;
  
      for (const notification of unreadNotifications) {
        try {
          const notificationRef = doc(db, notification.collectionName, notification.id);
          batch.update(notificationRef, { read: true });
          updatedIds.add(`${notification.collectionName}-${notification.id}`);
          batchCount++;
  
          if (batchCount >= 400) {
            await batch.commit();
            batchCount = 0;
          }
        } catch (error) {
          console.error(`Error adding to batch: ${notification.collectionName}/${notification.id}`, error);
        }
      }
  
      if (batchCount > 0) {
        await batch.commit();
      }
  
      setNotifications((prev) => {
        const updated = prev.map((n) =>
          updatedIds.has(`${n.collectionName}-${n.id}`) ? { ...n, read: true } : n
        );
        return updated;
      });
  
      // Handle meter readings - mark all as read
      await markAllMeterReadingsAsRead();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");
    if (confirmLogout) {
      await signOut(auth);
      window.location.href = "/";
    }
  };

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const notificationPanel = document.getElementById("notification-panel");
      const notificationButton = document.getElementById("notification-button");

      if (
        showNotifications &&
        notificationPanel &&
        !notificationPanel.contains(target) &&
        notificationButton &&
        !notificationButton.contains(target)
      ) {
        setShowNotifications(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  return (
    <header className="w-full h-20 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
      <div></div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative">
        <Button
          id="notification-button"
          variant="ghost"
          size="icon"
          className="text-gray-500 relative"
          onClick={() => setShowNotifications(!showNotifications)}
        >
          <Bell className="h-5 w-5" />
          {(notifications.some((n) => !n.read) || unreadReadingsCount > 0) && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500" variant="default">
              {notifications.filter((n) => !n.read).length + (unreadReadingsCount > 0 ? 1 : 0)}
            </Badge>
          )}
        </Button>

          {showNotifications && (
            <div
              id="notification-panel"
              className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50 border border-gray-200"
            >
              <div className="p-3 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-sm font-semibold">Notifications</h3>
                <Button
                  variant="link"
                  onClick={markAllAsRead}
                  className="text-xs"
                  disabled={!notifications.some((n) => !n.read) && unreadReadingsCount === 0}
                >
                  Mark All as Read
                </Button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                    {/* --- Unbilled Meter Readings Notification --- */}
                    {unreadReadingsCount > 0 && (
                  <div
                    className="p-3 border-b border-blue-100 bg-blue-50 cursor-pointer"
                    onClick={() => {
                      // Mark all meter readings as read
                      markAllMeterReadingsAsRead();                     
                      navigate("/bills?tab=customer-billing");
                      setShowNotifications(false);
                    }}
                  >
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm font-medium">New Meter Readings</p>
                        <p className="text-xs text-gray-500">
                          {unbilledReadingsCount} meter reading{unbilledReadingsCount > 1 ? "s" : ""} without a bill.
                        </p>
                        {/* Show up to 3 account numbers/names */}
                        {unbilledReadings.slice(0, 3).map((r, idx) => (
                          <div key={r.id || idx} className="text-xs text-gray-700">
                            <span className="font-semibold">{r.accountNumber}</span>
                            {r.name ? ` - ${r.name}` : ""} | Due: {r.dueDate}
                          </div>
                        ))}
                        {unbilledReadingsCount > 3 && (
                          <div className="text-xs text-gray-400">
                            +{unbilledReadingsCount - 3} more...
                          </div>
                        )}
                        <p className="text-xs text-gray-400">{new Date().toLocaleString()}</p>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-blue-600 mt-1"></div>
                    </div>
                  </div>
                )}
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div
                      key={`${notification.collectionName}-${notification.id}`}
                      onClick={() => markAsRead(notification)}
                      className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                        !notification.read ? "bg-blue-50" : ""
                      } }`}
                    >
                      <div className="flex justify-between">
                        <div>
                          <p className="text-sm font-medium">{notification.title}</p>
                          <p className="text-xs text-gray-500">{notification.message}</p>
                          <p className="text-xs text-gray-400">{notification.date}</p>
                        </div>
                        {!notification.read && <div className="h-2 w-2 rounded-full bg-blue-600 mt-1"></div>}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 p-3">No new notifications</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 hover:bg-gray-100 px-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userAvatar} alt={userName} />
                <AvatarFallback>{userName.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;