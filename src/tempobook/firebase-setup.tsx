import React from "react";

const FirebaseSetupGuide = () => {
  return (
    <div className="p-8 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-blue-800">Firebase Setup Guide</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-3 text-blue-700">Step 1: Create a Firebase Project</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Go to <a href="https://console.firebase.google.com/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Firebase Console</a></li>
            <li>Click "Add project" and follow the setup wizard</li>
            <li>Give your project a name (e.g., "water-billing-system")</li>
            <li>Enable Google Analytics if desired</li>
            <li>Click "Create project"</li>
          </ol>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-3 text-blue-700">Step 2: Register Your Web App</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>From the project overview page, click the web icon (</>) to add a web app</li>
            <li>Register your app with a nickname (e.g., "water-billing-admin")</li>
            <li>Optionally set up Firebase Hosting</li>
            <li>Click "Register app"</li>
            <li>Copy the Firebase configuration object that looks like this:</li>
          </ol>
          <div className="bg-gray-100 p-4 rounded-md my-3 overflow-x-auto">
            <pre className="text-sm">
              {`const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};`}
            </pre>
          </div>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-3 text-blue-700">Step 3: Configure Environment Variables</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Create or edit the <code className="bg-gray-100 px-2 py-1 rounded">.env.local</code> file in your project root</li>
            <li>Add your Firebase configuration values:</li>
          </ol>
          <div className="bg-gray-100 p-4 rounded-md my-3">
            <pre className="text-sm">
              {`VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id`}
            </pre>
          </div>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-3 text-blue-700">Step 4: Enable Authentication</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>In the Firebase console, go to "Authentication" in the left sidebar</li>
            <li>Click "Get started"</li>
            <li>Enable the "Email/Password" sign-in method</li>
            <li>Optionally enable other authentication methods as needed</li>
            <li>Click "Save"</li>
          </ol>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-3 text-blue-700">Step 5: Set Up Firestore Database</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>In the Firebase console, go to "Firestore Database" in the left sidebar</li>
            <li>Click "Create database"</li>
            <li>Start in production mode or test mode (you can change security rules later)</li>
            <li>Select a location for your database</li>
            <li>Click "Enable"</li>
          </ol>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-3 text-blue-700">Step 6: Configure Firestore Security Rules</h2>
          <p className="mb-2">Set up basic security rules to protect your data:</p>
          <div className="bg-gray-100 p-4 rounded-md my-3 overflow-x-auto">
            <pre className="text-sm">
              {`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read and write their own data
    match /customers/{customerId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /bills/{billId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /payments/{paymentId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /tickets/{ticketId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /ticketResponses/{responseId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}`}
            </pre>
          </div>
          <p className="text-sm text-gray-600 mt-2">Note: These are basic rules. For production, implement more granular security rules based on user roles and permissions.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-3 text-blue-700">Step 7: Create an Admin User</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>In the Firebase console, go to "Authentication" in the left sidebar</li>
            <li>Click "Add user"</li>
            <li>Enter an email and password for your admin user</li>
            <li>Click "Add user"</li>
          </ol>
        </section>
        
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">Next Steps</h3>
          <p className="text-blue-700">
            Your Firebase setup is complete! You can now use the authentication and database services in your application.
            Restart your development server to ensure the environment variables are loaded properly.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FirebaseSetupGuide;
