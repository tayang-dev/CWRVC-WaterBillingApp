import React, { useEffect, useState } from "react";
import ChatList from "./ChatList";
import CustomerChat from "./CostumerChat";
import { useLocation } from "react-router-dom";

interface CustomerSupportProps {
  userRole?: "admin" | "staff";
}

const CustomerSupport: React.FC<CustomerSupportProps> = ({ userRole = "admin" }) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>("");
  const [selectedCustomerAvatar, setSelectedCustomerAvatar] = useState<string>("");
  const [selectedAccount, setSelectedAccount] = useState<string>("");

  const location = useLocation();

    // Handle chat selection from URL (for notification redirection)
    useEffect(() => {
      const searchParams = new URLSearchParams(location.search);
      const chatId = searchParams.get("chat");
      if (chatId) {
        setSelectedCustomerId(chatId);
        setSelectedAccount(chatId); // If accountNumber is same as chatId, otherwise adjust as needed
        // Optionally set name/avatar if you have a lookup or fetch logic
      }
    }, [location.search]);

  const handleSelectCustomer = (customerId: string, accountNumber: string) => {
    setSelectedCustomerId(customerId);
    setSelectedAccount(accountNumber);

    // For production, fetch customer details from Firestore.
    // For demo, using mock data:
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
    }
  };

  return (
    <div className="w-full h-full bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-blue-800">Customer Service</h1>
          <div className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
            {userRole === "admin" ? "Admin" : "Staff"} Mode
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-150px)]">
          <div className="md:col-span-1">
            <ChatList
              onSelectCustomer={handleSelectCustomer}
              selectedCustomerId={selectedCustomerId || undefined}
              userRole={userRole}
            />
          </div>
          <div className="md:col-span-2">
            {selectedCustomerId && selectedAccount ? (
              <CustomerChat
                customerDocId={selectedCustomerId}
                customerName={selectedCustomerName}
                customerAvatar={selectedCustomerAvatar}
                accountNumber={selectedAccount}
                userRole={userRole}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white rounded-lg border border-gray-200 p-6">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Select a conversation</h3>
                  <p className="text-gray-500">Choose a customer from the list to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerSupport;
