import React, { useEffect, useState, useRef } from "react";
import ChatList from "./ChatList";
import CustomerChat from "./CostumerChat";
import { useLocation } from "react-router-dom";
import { MessageCircle, Settings } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext"; // <--- added

interface CustomerSupportProps {
  userRole?: "admin" | "staff";
  userName?: string;
}

const CustomerSupport: React.FC<CustomerSupportProps> = ({ 
  userRole,
  userName
}) => {
  console.log("🏠 CustomerSupport component mounted");
  const { userRole: authUserRole, currentUser } = useAuth(); // <--- get role from auth
  const effectiveRole: "admin" | "staff" = authUserRole === "admin" ? "admin" : "staff";
  const displayName = currentUser?.displayName || userName || "User";

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>("");
  const [selectedCustomerAvatar, setSelectedCustomerAvatar] = useState<string>("");
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const lastSentMessage = useRef<string>('');

  const location = useLocation();

  // Convert role to internal role (admin or staff only)
  const getInternalRole = (): "admin" | "staff" => {
    return effectiveRole;
  };

  // Get display name for role
  const getRoleDisplayName = () => {
    return effectiveRole === "admin" ? "Admin" : "Cashier";
  };
  
  // Handle chat selection from URL (for notification redirection)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const chatId = searchParams.get("chat");
    if (chatId) {
      setSelectedCustomerId(chatId);
      setSelectedAccount(chatId);
    }
  }, [location.search]);

  const handleSelectCustomer = (customerId: string, accountNumber: string) => {
    setSelectedCustomerId(customerId);
    setSelectedAccount(accountNumber);
    setIsSending(false);
    lastSentMessage.current = '';

    // Mock customer data - replace with actual API call in production
    const mockCustomers: { [key: string]: { name: string; avatar: string } } = {
      "B3AlM9dYpQ8Zy8TLFkDG": {
        name: "John Doe",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=john",
      },
      "customer-2": {
        name: "Jane Smith",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jane",
      },
      "customer-3": {
        name: "Robert Johnson",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=robert",
      },
      "customer-4": {
        name: "Emily Williams",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emily",
      },
      "customer-5": {
        name: "Michael Brown",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=michael",
      },
    };

    const customer = mockCustomers[customerId];
    if (customer) {
      setSelectedCustomerName(customer.name);
      setSelectedCustomerAvatar(customer.avatar);
    } else {
      setSelectedCustomerName(`Account ${accountNumber}`);
      setSelectedCustomerAvatar("");
    }
  };

  const handleSendMessage = async (message: string) => {
    const trimmedMessage = message.trim();
    
    if (!trimmedMessage || isSending || trimmedMessage === lastSentMessage.current) {
      return false;
    }

    try {
      setIsSending(true);
      lastSentMessage.current = trimmedMessage;
      return true;
    } catch (error) {
      console.error('Error in message sending:', error);
      return false;
    } finally {
      setTimeout(() => {
        setIsSending(false);
        lastSentMessage.current = '';
      }, 500);
    }
  };

  // Online status display
  const getOnlineStatus = () => {
    return { 
      label: "Online", 
      color: "text-green-700", 
      bgColor: "bg-green-50 border-green-200" 
    };
  };

  const statusDisplay = getOnlineStatus();
  const internalRole = getInternalRole();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="w-full h-full p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Enhanced Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
                  Customer Service
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  {getRoleDisplayName()} Dashboard • {displayName}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${statusDisplay.bgColor} ${statusDisplay.color}`}>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">{statusDisplay.label}</span>
              </div>
              
              {userRole === "admin" && (
                <button className="flex items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <Settings className="w-5 h-5 text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)] min-h-[600px]">
            {/* Chat List Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Active Conversations
                  </h2>
                </div>
                <div className="h-[calc(100%-80px)]">
                  <ChatList
                    onSelectCustomer={handleSelectCustomer}
                    selectedCustomerId={selectedCustomerId || undefined}
                    userRole={getInternalRole()}
                  />
                </div>
              </div>
            </div>

            {/* Chat Panel */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full overflow-hidden">
                {selectedCustomerId && selectedAccount ? (
                  <CustomerChat
                    customerDocId={selectedCustomerId}
                    customerName={selectedCustomerName}
                    customerAvatar={selectedCustomerAvatar}
                    accountNumber={selectedAccount}
                    userRole={getInternalRole()}
                    onSendMessage={handleSendMessage}
                    isSending={isSending}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-8">
                    <div className="text-center max-w-md">
                      <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4">
                        <MessageCircle className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-800 mb-3">
                        No Conversation Selected
                      </h3>
                      <p className="text-slate-600 leading-relaxed">
                        Choose a customer from the conversation list to start chatting and providing support.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerSupport;