import React, { useState, useEffect } from "react";
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
  setDoc,
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
}

// Define Firestore document structure
interface FirestoreData {
  accountNumber?: string;
  customerName?: string;
  verificationStatus?: string;
  status?: string;
  date?: string;
  read?: boolean;
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

  useEffect(() => {
    const collections = [
      { name: "users", condition: where("verificationStatus", "==", "pending"), title: "Pending User Verification", link: "/users" },
      { name: "paymentVerifications", condition: where("status", "==", "pending"), title: "Pending Payment", link: "/payments" },
      { name: "requests", condition: where("status", "==", "in-progress"), title: "New Service Request", link: "/requests" },
      { name: "chats", condition: where("status", "==", "active"), title: "New Chat Message", link: "/customer-support" },
    ];

    const unsubscribeList = collections.map(({ name, condition, title, link }) => {
      const colRef = query(collection(db, name), condition);

      return onSnapshot(colRef, async (snapshot) => {
        const updates: Notification[] = [];

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data() as FirestoreData;
          const notificationId = docSnap.id;
          const readStatus = data.read ?? false; // Default to false if read is missing

          if (!("read" in data)) {
            // If `read` field doesn't exist, add it to Firestore
            await setDoc(doc(db, name, notificationId), { read: false }, { merge: true });
          }

          updates.push({
            id: notificationId,
            title,
            message: data.customerName || data.accountNumber || "New notification",
            link,
            date: format(new Date(), "MMM dd, yyyy hh:mm a"),
            read: readStatus,
          });
        }

        setNotifications((prev) => {
          const mergedNotifications = [...prev];

          updates.forEach((update) => {
            const existingIndex = mergedNotifications.findIndex((n) => n.id === update.id);
            if (existingIndex === -1) {
              mergedNotifications.push(update);
            } else {
              mergedNotifications[existingIndex] = update;
            }
          });

          return mergedNotifications;
        });
      });
    });

    return () => {
      unsubscribeList.forEach((unsubscribe) => unsubscribe());
    };
  }, [db]);

  const markAsRead = async (notification: Notification) => {
    if (!notification.read) {
      try {
        const notificationRef = doc(db, notification.link.replace("/", ""), notification.id);
        await updateDoc(notificationRef, { read: true });

        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }

    navigate(notification.link);
  };

  return (
    <header className="w-full h-20 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
      <div></div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500 relative"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-5 w-5" />
            {notifications.some((n) => !n.read) && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500" variant="default">
                {notifications.filter((n) => !n.read).length}
              </Badge>
            )}
          </Button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50 border border-gray-200">
              <div className="p-3 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-sm font-semibold">Notifications</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => markAsRead(notification)}
                      className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer flex justify-between items-start ${
                        !notification.read ? "bg-blue-50" : ""
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-gray-500">{notification.message}</p>
                        <p className="text-xs text-gray-400">{notification.date}</p>
                      </div>
                      {!notification.read && <div className="h-2 w-2 rounded-full bg-blue-600"></div>}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 p-3">No new notifications</p>
                )}
              </div>
              <div className="p-2 border-t border-gray-200 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs w-full"
                  onClick={() => navigate("/notifications")}
                >
                  View All Notifications
                </Button>
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
            <DropdownMenuItem onClick={() => signOut(auth).then(() => (window.location.href = "/"))} className="text-red-600">
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
