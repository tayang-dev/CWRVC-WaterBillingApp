import React from "react";

const FirestoreDataSetup = () => {
  return (
    <div className="p-8 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-blue-800">Firestore Data Setup Guide</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-3 text-blue-700">Step 1: Create Collections</h2>
          <p className="mb-3">First, create the following collections in your Firestore database:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>customers</strong> - Store customer account information</li>
            <li><strong>bills</strong> - Store billing records</li>
            <li><strong>payments</strong> - Track payment transactions</li>
            <li><strong>tickets</strong> - Customer support tickets</li>
            <li><strong>ticketResponses</strong> - Responses to support tickets</li>
          </ul>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-3 text-blue-700">Step 2: Sample Customer Data</h2>
          <p className="mb-3">Add sample customer records to the <code className="bg-gray-100 px-2 py-1 rounded">customers</code> collection:</p>
          <div className="bg-gray-100 p-4 rounded-md my-3 overflow-x-auto">
            <pre className="text-sm">
              {`// Customer 1
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "(555) 123-4567",
  "address": "123 Main St, Anytown, USA 12345",
  "accountNumber": "WB-10001",
  "status": "active",
  "joinDate": "2022-05-15",
  "lastBillingDate": "2023-04-15",
  "amountDue": 78.50
}

// Customer 2
{
  "name": "Jane Smith",
  "email": "jane.smith@example.com",
  "phone": "(555) 987-6543",
  "address": "456 Oak Ave, Somewhere, USA 67890",
  "accountNumber": "WB-10002",
  "status": "active",
  "joinDate": "2022-06-20",
  "lastBillingDate": "2023-04-15",
  "amountDue": 65.75
}`}
            </pre>
          </div>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-3 text-blue-700">Step 3: Sample Billing Data</h2>
          <p className="mb-3">Add sample billing records to the <code className="bg-gray-100 px-2 py-1 rounded">bills</code> collection:</p>
          <div className="bg-gray-100 p-4 rounded-md my-3 overflow-x-auto">
            <pre className="text-sm">
              {`// Bill 1
{
  "customerId": "[CUSTOMER_DOC_ID_1]",  // Replace with actual document ID
  "date": "2023-04-01",
  "amount": 78.50,
  "status": "paid",
  "dueDate": "2023-04-15",
  "description": "Monthly water bill",
  "billingPeriodStart": "2023-03-01",
  "billingPeriodEnd": "2023-03-31",
  "waterUsage": 2450
}

// Bill 2
{
  "customerId": "[CUSTOMER_DOC_ID_2]",  // Replace with actual document ID
  "date": "2023-04-01",
  "amount": 65.75,
  "status": "pending",
  "dueDate": "2023-04-15",
  "description": "Monthly water bill",
  "billingPeriodStart": "2023-03-01",
  "billingPeriodEnd": "2023-03-31",
  "waterUsage": 2100
}`}
            </pre>
          </div>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-3 text-blue-700">Step 4: Sample Payment Data</h2>
          <p className="mb-3">Add sample payment records to the <code className="bg-gray-100 px-2 py-1 rounded">payments</code> collection:</p>
          <div className="bg-gray-100 p-4 rounded-md my-3 overflow-x-auto">
            <pre className="text-sm">
              {`// Payment 1
{
  "customerId": "[CUSTOMER_DOC_ID_1]",  // Replace with actual document ID
  "billId": "[BILL_DOC_ID_1]",  // Replace with actual document ID
  "date": "2023-04-10",
  "amount": 78.50,
  "method": "Credit Card",
  "status": "completed",
  "transactionId": "txn_123456789"
}

// Payment 2 (partial payment)
{
  "customerId": "[CUSTOMER_DOC_ID_2]",  // Replace with actual document ID
  "billId": "[BILL_DOC_ID_2]",  // Replace with actual document ID
  "date": "2023-04-12",
  "amount": 30.00,
  "method": "Bank Transfer",
  "status": "completed",
  "transactionId": "txn_987654321"
}`}
            </pre>
          </div>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-3 text-blue-700">Step 5: Sample Support Tickets</h2>
          <p className="mb-3">Add sample support tickets to the <code className="bg-gray-100 px-2 py-1 rounded">tickets</code> collection:</p>
          <div className="bg-gray-100 p-4 rounded-md my-3 overflow-x-auto">
            <pre className="text-sm">
              {`// Ticket 1
{
  "title": "Water meter reading incorrect",
  "description": "I believe my water meter reading is incorrect. My usage hasn't changed but my bill is much higher.",
  "customerId": "[CUSTOMER_DOC_ID_1]",  // Replace with actual document ID
  "customerName": "John Doe",
  "dateCreated": "2023-06-15",
  "status": "open",
  "priority": "medium",
  "category": "billing"
}

// Ticket 2
{
  "title": "Billing dispute for May invoice",
  "description": "I've been charged twice for my May water bill. Please refund the duplicate charge.",
  "customerId": "[CUSTOMER_DOC_ID_2]",  // Replace with actual document ID
  "customerName": "Jane Smith",
  "dateCreated": "2023-06-14",
  "status": "in-progress",
  "priority": "high",
  "category": "billing"
}`}
            </pre>
          </div>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-3 text-blue-700">Step 6: Sample Ticket Responses</h2>
          <p className="mb-3">Add sample responses to the <code className="bg-gray-100 px-2 py-1 rounded">ticketResponses</code> collection:</p>
          <div className="bg-gray-100 p-4 rounded-md my-3 overflow-x-auto">
            <pre className="text-sm">
              {`// Response 1
{
  "ticketId": "[TICKET_DOC_ID_1]",  // Replace with actual document ID
  "author": "Support Agent",
  "authorId": "agent123",
  "content": "Thank you for bringing this to our attention. I'll review your billing history and check if there were any meter reading issues. We'll get back to you shortly.",
  "timestamp": "2023-06-15T11:20:00Z",
  "isStaff": true
}

// Response 2
{
  "ticketId": "[TICKET_DOC_ID_2]",  // Replace with actual document ID
  "author": "Billing Specialist",
  "authorId": "billing456",
  "content": "I've reviewed your account and confirmed the duplicate charge. A refund has been processed and should appear in your account within 3-5 business days. Please let us know if you don't see it by the end of the week.",
  "timestamp": "2023-06-14T14:30:00Z",
  "isStaff": true
}`}
            </pre>
          </div>
        </section>
        
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">Using the Data</h3>
          <p className="text-blue-700">
            With this sample data in place, you can now test all features of the Water Billing System admin portal. 
            Make sure to replace the placeholder document IDs with actual Firestore document IDs after creating the records.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FirestoreDataSetup;