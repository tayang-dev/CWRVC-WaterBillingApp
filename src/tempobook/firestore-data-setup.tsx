import React from "react";

const FirestoreDataSetup = () => {
  return (
    <div className="p-8 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-blue-800">
        Firestore Data Setup Guide
      </h1>

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-3 text-blue-700">
            Step 1: Create Collections
          </h2>
          <p className="mb-3">
            The water billing system uses the following collections in
            Firestore:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>customers</strong> - Customer account information
            </li>
            <li>
              <strong>bills</strong> - Billing records
            </li>
            <li>
              <strong>payments</strong> - Payment transactions
            </li>
            <li>
              <strong>tickets</strong> - Customer service tickets
            </li>
            <li>
              <strong>ticketResponses</strong> - Responses to customer service
              tickets
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-blue-700">
            Step 2: Sample Data Structure
          </h2>

          <div className="mb-4">
            <h3 className="font-semibold text-blue-600 mb-2">
              Customer Document
            </h3>
            <div className="bg-gray-100 p-4 rounded-md overflow-x-auto">
              <pre className="text-sm">
                {`{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "(555) 123-4567",
  "address": "123 Main St, Anytown, USA 12345",
  "accountNumber": "WB-10001",
  "status": "active",
  "joinDate": "2022-05-15",
  "lastBillingDate": "2023-04-15",
  "amountDue": 78.5
}`}
              </pre>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold text-blue-600 mb-2">Bill Document</h3>
            <div className="bg-gray-100 p-4 rounded-md overflow-x-auto">
              <pre className="text-sm">
                {`{
  "customerId": "customer_document_id",
  "date": "2023-04-01",
  "amount": 78.5,
  "status": "paid",
  "dueDate": "2023-04-15",
  "description": "Monthly water bill",
  "billingPeriodStart": "2023-03-01",
  "billingPeriodEnd": "2023-03-31",
  "waterUsage": 2450
}`}
              </pre>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold text-blue-600 mb-2">
              Payment Document
            </h3>
            <div className="bg-gray-100 p-4 rounded-md overflow-x-auto">
              <pre className="text-sm">
                {`{
  "customerId": "customer_document_id",
  "billId": "bill_document_id",
  "date": "2023-04-10",
  "amount": 78.5,
  "method": "Credit Card",
  "status": "completed",
  "transactionId": "txn_123456789",
  "notes": "Payment for April bill"
}`}
              </pre>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold text-blue-600 mb-2">
              Ticket Document
            </h3>
            <div className="bg-gray-100 p-4 rounded-md overflow-x-auto">
              <pre className="text-sm">
                {`{
  "title": "Water meter reading incorrect",
  "description": "I believe my water meter reading is incorrect. My usage hasn't changed but my bill is much higher.",
  "customerId": "customer_document_id",
  "customerName": "John Doe",
  "dateCreated": "2023-06-15T10:30:00Z",
  "status": "open",
  "priority": "medium",
  "category": "billing",
  "assignedTo": "staff_user_id"
}`}
              </pre>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold text-blue-600 mb-2">
              Ticket Response Document
            </h3>
            <div className="bg-gray-100 p-4 rounded-md overflow-x-auto">
              <pre className="text-sm">
                {`{
  "ticketId": "ticket_document_id",
  "author": "Support Agent",
  "authorId": "staff_user_id",
  "authorAvatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=agent",
  "content": "Thank you for bringing this to our attention. I'll review your billing history and check if there were any meter reading issues.",
  "timestamp": "2023-06-15T11:20:00Z",
  "isStaff": true
}`}
              </pre>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-blue-700">
            Step 3: Adding Sample Data
          </h2>
          <p className="mb-3">
            You can add sample data to your Firestore database in several ways:
          </p>

          <h3 className="font-semibold text-blue-600 mb-2">
            Option 1: Using the Firebase Console
          </h3>
          <ol className="list-decimal pl-6 space-y-2">
            <li>
              Go to the{" "}
              <a
                href="https://console.firebase.google.com/"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Firebase Console
              </a>
            </li>
            <li>Select your project</li>
            <li>Go to "Firestore Database" in the left sidebar</li>
            <li>
              Click "Start collection" and create each of the collections listed
              above
            </li>
            <li>
              Add documents to each collection using the sample data structure
            </li>
          </ol>

          <h3 className="font-semibold text-blue-600 mb-2 mt-4">
            Option 2: Using the Application
          </h3>
          <p className="mb-3">
            You can also add data directly through the application:
          </p>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Log in to the application</li>
            <li>
              Go to the Accounts Management section and click "Add Customer" to
              create customer records
            </li>
            <li>
              View a customer's details and click "Generate Bill" to create
              billing records
            </li>
            <li>
              Go to the Customer Service section and click "Create New Ticket"
              to add support tickets
            </li>
          </ol>

          <h3 className="font-semibold text-blue-600 mb-2 mt-4">
            Option 3: Using a Script
          </h3>
          <p className="mb-3">
            For larger amounts of data, you can create a script to populate your
            database:
          </p>
          <div className="bg-gray-100 p-4 rounded-md overflow-x-auto">
            <pre className="text-sm">
              {`// Example script to add sample data
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

// Your Firebase config
const firebaseConfig = { /* your config */ };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sample data
const sampleCustomers = [
  {
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "(555) 123-4567",
    address: "123 Main St, Anytown, USA 12345",
    accountNumber: "WB-10001",
    status: "active",
    joinDate: "2022-05-15",
    lastBillingDate: "2023-04-15",
    amountDue: 78.5
  },
  // Add more customers...
];

// Add customers to Firestore
async function addSampleData() {
  try {
    for (const customer of sampleCustomers) {
      const docRef = await addDoc(collection(db, 'customers'), customer);
      console.log("Customer added with ID: ", docRef.id);
      
      // Add bills for this customer
      // Add payments for this customer
      // Add tickets for this customer
    }
  } catch (error) {
    console.error("Error adding sample data: ", error);
  }
}

addSampleData();`}
            </pre>
          </div>
        </section>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">Next Steps</h3>
          <p className="text-blue-700">
            Once you've set up your Firestore collections and added some sample
            data, you can start using the application with real data. The
            application will automatically connect to your Firestore database
            and display the data you've added.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FirestoreDataSetup;
