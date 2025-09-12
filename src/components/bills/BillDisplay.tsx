import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import logoImage from "@/assets/logo.png"; // Adjust the path as necessary
import { QRCodeCanvas } from "qrcode.react";

// Utility function to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
};

const BillDisplay = ({ open, onOpenChange, selectedAccount, selectedBills, customersCollection }) => {
  if (!selectedBills || selectedBills.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bills for {selectedAccount}</DialogTitle>
          </DialogHeader>
          <p className="text-gray-500">No bills found for this account.</p>
        </DialogContent>
      </Dialog>
    );
  }

  // Find the customer object from the provided collection using accountNumber
  const getCustomerForBill = (bill) => {
    if (!customersCollection) return null;
    // Try to match by accountNumber
    return customersCollection.find(
      (customer) => customer.accountNumber === bill.accountNumber
    );
  };

  // Sort bills by creation date (newest first) - FIXED the TypeScript error here
  const sortedBills = [...selectedBills].sort((a, b) => {
    // Handle Firestore Timestamp objects, string dates, or fallback to 0
    let dateA = 0;
    let dateB = 0;
    
    if (a.createdAt) {
      // Check if it's a Firestore Timestamp (has seconds and nanoseconds)
      dateA = a.createdAt.seconds ? 
        a.createdAt.seconds * 1000 + a.createdAt.nanoseconds / 1000000 : 
        new Date(a.createdAt).getTime();
    }
    
    if (b.createdAt) {
      // Check if it's a Firestore Timestamp (has seconds and nanoseconds)
      dateB = b.createdAt.seconds ? 
        b.createdAt.seconds * 1000 + b.createdAt.nanoseconds / 1000000 : 
        new Date(b.createdAt).getTime();
    }
    
    return dateB - dateA; // Sort in descending order (newest first)
  });

  // Calculate tiered billing for display purposes
const calculateTieredUsage = (totalUsage) => {
  const tiers = [
    { min: 0, max: 5, rate: 0.00, usage: 0, amount: 0 },
    { min: 6, max: 10, rate: 20.70, usage: 0, amount: 0 },
    { min: 11, max: 20, rate: 22.50, usage: 0, amount: 0 },
    { min: 21, max: 30, rate: 24.40, usage: 0, amount: 0 },
    { min: 31, max: 40, rate: 26.30, usage: 0, amount: 0 },
    { min: 41, max: Infinity, rate: 28.10, usage: 0, amount: 0 },
  ];

  let remainingUsage = totalUsage;
  let totalAmount = 0;

  if (totalUsage <= 0) {
    return { tiers, totalAmount };
  }

  // Always show 5 units and minimum charge for first tier
  if (totalUsage <= 5) {
    tiers[0].usage = totalUsage;
    tiers[0].amount = 94.70;
    totalAmount = 94.70;
    return { tiers, totalAmount };
  } else {
    tiers[0].usage = 5;
    tiers[0].amount = 94.70;
    totalAmount += 94.70;
    remainingUsage -= 5;
  }

  // Distribute remaining usage to other tiers
  for (let i = 1; i < tiers.length && remainingUsage > 0; i++) {
    const tierMin = tiers[i].min;
    const tierMax = tiers[i].max;
    const tierRange = tierMax === Infinity ? remainingUsage : tierMax - tierMin + 1;
    const tierUsage = Math.min(remainingUsage, tierRange);

    if (tierUsage > 0) {
      tiers[i].usage = tierUsage;
      tiers[i].amount = parseFloat((tierUsage * tiers[i].rate).toFixed(2));
      totalAmount += tiers[i].amount;
      remainingUsage -= tierUsage;
    }
  }

  return { tiers, totalAmount };
}

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-6xl w-full max-h-[90vh] overflow-y-auto" // Increased width
        style={{ width: "100%", maxWidth: "1100px" }} // Optional: force even wider if needed
      >
        <DialogHeader>
          <DialogTitle>Bills for {selectedAccount}</DialogTitle>
        </DialogHeader>
        <div className="space-y-8">
          {/* Track which account numbers have already shown credentials */}
          {(() => {
            // For each bill, determine if it's the earliest for the account
            return sortedBills.map((bill, index) => {
              const { tiers, totalAmount } = calculateTieredUsage(bill.waterUsage || 0);
              const totalAmountAfterDue = parseFloat(bill.amountAfterDue || 0) + parseFloat(bill.arrears || 0);
              const regularAmount = parseFloat(bill.amountWithArrears || 0);
              const arrears = parseFloat(bill.arrears || 0);
              const customer = getCustomerForBill(bill);

              // Find all bills for this account
              const billsForAccount = selectedBills.filter(
                b => b.accountNumber === bill.accountNumber
              );

              // Find the earliest bill by dueDate (format: dd/mm/yyyy)
              const getDateObj = (b) => {
                if (b.dueDate && typeof b.dueDate === "string" && b.dueDate.includes("/")) {
                  const [day, month, year] = b.dueDate.split("/").map(Number);
                  return new Date(year, month - 1, day);
                }
                // fallback to createdAt if available
                if (b.createdAt && b.createdAt.seconds) {
                  return new Date(b.createdAt.seconds * 1000 + (b.createdAt.nanoseconds || 0) / 1000000);
                }
                return new Date(0);
              };

              const earliestBill = billsForAccount.reduce((earliest, current) => {
                return getDateObj(current) < getDateObj(earliest) ? current : earliest;
              }, billsForAccount[0]);

              // Only show credentials if this bill is the earliest for the account
              const showCredentials = bill.id === earliestBill.id;

              return (
                <div key={index} className="border-2 border-black p-4 print:p-0">
                  {/* Display creation date for debugging/reference */}
                  <div className="text-right text-sm text-gray-500 mb-2">
                    {bill.createdAt ? 
                      (bill.createdAt.seconds ? 
                        new Date(bill.createdAt.seconds * 1000 + bill.createdAt.nanoseconds / 1000000).toLocaleString() : 
                        new Date(bill.createdAt).toLocaleString()
                      ) : 'Date not available'}
                  </div>
                  
                  {/* Header */}
                  <div className="flex justify-between items-center border-b-2 border-black pb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-24 flex items-center justify-center overflow-hidden">
                        <img 
                          src={logoImage} 
                          alt="Centennial Water Logo" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="text-center">
                        <h1 className="text-xl font-bold">CENTENNIAL WATER RESOURCE VENTURE CORPORATION</h1>
                        <p className="text-sm">Southville 7, Site 3, Brgy. Sto. Tomas, Calauan, Laguna</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <h2 className="text-lg font-bold">BILLING STATEMENT NO.</h2>
                      <p className="text-3xl font-bold">{bill.billNumber || "0000000000"}</p>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="mt-4">
                    <div className="flex justify-between">
                      <div>
                        <h2 className="text-3xl font-bold">{bill.customerName || "CUSTOMER NAME"}</h2>
                        <p className="text-lg">{bill.customerAddress || "Address information"}</p>
                      </div>
                      <div className="border border-black">
                        <table className="text-center">
                          <thead>
                            <tr className="border-b border-black">
                              <th className="px-4 py-2 border-r border-black">Current Reading</th>
                              <th className="px-4 py-2 border-r border-black">Previous Reading</th>
                              <th className="px-4 py-2 border-r border-black">Consumption</th>
                              <th className="px-4 py-2">Billing Month</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-4 py-2 border-r border-black text-xl font-semibold">
                                {bill.meterReading?.current || 0}
                              </td>
                              <td className="px-4 py-2 border-r border-black text-xl font-semibold">
                                {bill.meterReading?.previous || 0}
                              </td>
                              <td className="px-4 py-2 border-r border-black text-xl font-semibold">
                                {bill.waterUsage || 0}
                              </td>
                              <td className="px-4 py-2 text-xl font-semibold">
                                {bill.billingPeriod || ""}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Billing Details */}
                  <div className="mt-6 flex">
                    <table className="w-1/2 border border-black text-center">
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="px-2 py-1 border-r border-black">Billing Period</th>
                          <th className="px-2 py-1 border-r border-black">Water</th>
                          <th className="px-2 py-1 border-r border-black">Tax</th>
                          <th className="px-2 py-1 border-r border-black">SCF</th>
                          <th className="px-2 py-1 border-r border-black">Senior Discount</th>
                          <th className="px-2 py-1 border-r border-black">Arrears</th>
                          <th className="px-2 py-1 border-r border-black">Over Payment</th>
                          <th className="px-2 py-1">Amount Due</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-2 py-1 border-r border-black">{bill.billingPeriod || "01/01/25 - 01/31/25"}</td>
                          <td className="px-2 py-1 border-r border-black">{bill.waterChargeBeforeTax?.toFixed(2) || "0.00"}</td>
                          <td className="px-2 py-1 border-r border-black">{bill.tax?.toFixed(2) || "0.00"}</td>
                          <td className="px-2 py-1 border-r border-black">0.00</td>
                          <td className="px-2 py-1 border-r border-black">{bill.seniorDiscount?.toFixed(2) || "0.00"}</td>
                          <td className="px-2 py-1 border-r border-black">{bill.arrears?.toFixed(2) || "0.00"}</td>
                          <td className="px-2 py-1 border-r border-black">{bill.appliedOverpayment?.toFixed(2) || "0.00"}</td>
                          <td className="px-2 py-1 font-bold">{bill.amountWithArrears?.toFixed(2) || "0.00"}</td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="w-1/2 ml-2">
                      <table className="w-full border border-black text-center">
                        <thead>
                          <tr className="bg-gray-200">
                            <th colSpan={5} className="px-2 py-1 border-b border-black">Rates Breakdown</th>
                          </tr>
                          <tr className="bg-gray-200">
                            <th className="px-2 py-1 border-r border-black">Min</th>
                            <th className="px-2 py-1 border-r border-black">Max</th>
                            <th className="px-2 py-1 border-r border-black">Rate</th>
                            <th className="px-2 py-1 border-r border-black">Value</th>
                            <th className="px-2 py-1">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bill.waterUsage <= 0 ? (
                            <tr>
                              <td colSpan={5} className="px-2 py-1">No water usage recorded</td>
                            </tr>
                          ) : bill.waterUsage <= 10 ? (
                            <tr>
                              <td className="px-2 py-1 border-r border-black">1</td>
                              <td className="px-2 py-1 border-r border-black">10</td>
                              <td className="px-2 py-1 border-r border-black">19.10</td>
                              <td className="px-2 py-1 border-r border-black">{bill.waterUsage}</td>
                              <td className="px-2 py-1">{Math.max(bill.waterUsage * 19.10, 191).toFixed(2)}</td>
                            </tr>
                          ) : (
                            <>
                              {/* Show all applicable tiers based on water usage */}
                              {tiers
                                .filter(tier => tier.usage > 0)
                                .map((tier, i) => (
                                  <tr key={i}>
                                    <td className="px-2 py-1 border-r border-black">{tier.min}</td>
                                    <td className="px-2 py-1 border-r border-black">{tier.max === Infinity ? "above" : tier.max}</td>
                                    <td className="px-2 py-1 border-r border-black">{tier.rate.toFixed(2)}</td>
                                    <td className="px-2 py-1 border-r border-black">{tier.usage}</td>
                                    <td className="px-2 py-1">{tier.amount.toFixed(2)}</td>
                                  </tr>
                                ))}
                            </>
                          )}
                          <tr>
                            <td colSpan={4} className="text-right px-2 py-1 border-t border-black">Total:</td>
                            <td className="px-2 py-1 border-t border-black font-bold">{bill.waterChargeBeforeTax?.toFixed(2) || "0.00"}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Account Details */}
                  <div className="mt-4">
                    <table className="w-full border border-black text-center">
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="px-2 py-1 border-r border-black">Account#</th>
                          <th className="px-2 py-1 border-r border-black">Meter#</th>
                          <th className="px-2 py-1 border-r border-black">Due Date</th>
                          <th className="px-2 py-1 border-r border-black">Penalty</th>
                          <th className="px-2 py-1">Amount After Due Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-2 py-1 border-r border-black">{bill.accountNumber || "00-00-0000"}</td>
                          <td className="px-2 py-1 border-r border-black">{bill.meterNumber || "00000000"}</td>
                          <td className="px-2 py-1 border-r border-black">{bill.dueDate || "01/01/2025"}</td>
                          <td className="px-2 py-1 border-r border-black">{bill.penalty?.toFixed(2) || "0.00"}</td>
                          <td className="px-2 py-1 font-bold">{totalAmountAfterDue.toFixed(2) || "0.00"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Footer Notes */}
                  <div className="mt-6">
                    <h3 className="font-bold text-lg mb-2">MAHALAGANG PAALALA TUNGKOL SA INYONG WATER BILL:</h3>
                    <ol className="list-decimal ml-6 space-y-1">
                      <li>HUWAG PONG KALILIMUTAN DALHIN ANG INYONG BILLING STATEMENT KAPAG KAYO AY MAGBABAYAD</li>
                      <li>PARA MAIWASAN ANG PAGBABAYAD NG MULTA, MAGBAYAD PO NG INYONG BILLING STATEMENT NG MAS MAAGA O DI LALAGPAS SA INYONG DUE DATE.</li>
                      <li>ANG SERBISYO PO NG INYONG TUBIG AY PUPUTULIN NG WALANG PAALALA KUNG DI KAYO MAKAPAGBAYAD SA LOOB NG LIMANG(5) ARAW PAGKATAPOS NG DUE DATE.</li>
                    </ol>
                    <p className="mt-4 text-center font-bold border-t-2 border-black pt-2">
                      "THIS WILL SERVE AS YOUR OFFICIAL RECEIPT WHEN MACHINE VALIDATED"
                    </p>
                  </div>
                  {/* Initial Login Credentials and QR Code in the same row, spaced to start and end */}
                  <div className="mt-6 border-t-2 border-black pt-4 flex flex-row items-center justify-between gap-8">
                    {showCredentials ? (
                      <>
                        {/* Credentials centered */}
                        <div className="flex-1 flex flex-col items-center">
                          <h3 className="font-bold text-lg mb-2">INITIAL LOGIN CREDENTIALS</h3>
                          <div className="flex flex-col items-center space-y-1">
                            <span>
                              <span className="font-semibold">username:</span>
                              <span className="ml-2">{customer?.email || customer?.phone || "N/A"}</span>
                            </span>
                            <span>
                              <span className="font-semibold">password:</span>
                              <span className="ml-2">{bill.accountNumber || "N/A"}</span>
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-gray-600">
                            Please change your password after your first login for security purposes.
                          </p>
                        </div>
                        {/* QR code aligned to the right/end */}
                        <div className="flex flex-col items-end">
                          <QRCodeCanvas
                            value={JSON.stringify({
                              billNumber: bill.billNumber || "0000000000",
                              customerName: bill.customerName || "CUSTOMER NAME",
                              amount: regularAmount.toFixed(2) || "0.00",
                              arrears: arrears.toFixed(2) || "0.00",
                              dueDate: bill.dueDate || "01/01/2025",
                              accountNumber: bill.accountNumber || "00-00-0000",
                              amountAfterDue: totalAmountAfterDue.toFixed(2) || "0.00",
                            })}
                            size={128}
                            level="H"
                            includeMargin={true}
                          />
                          <p className="mt-2 text-sm text-gray-600">Scan to view bill details</p>
                        </div>
                      </>
                    ) : (
                      // Only QR code for subsequent bills
                      <div className="flex flex-col items-end w-full">
                        <QRCodeCanvas
                          value={JSON.stringify({
                            billNumber: bill.billNumber || "0000000000",
                            customerName: bill.customerName || "CUSTOMER NAME",
                            amount: regularAmount.toFixed(2) || "0.00",
                            arrears: arrears.toFixed(2) || "0.00",
                            dueDate: bill.dueDate || "01/01/2025",
                            accountNumber: bill.accountNumber || "00-00-0000",
                            amountAfterDue: totalAmountAfterDue.toFixed(2) || "0.00",
                          })}
                          size={128}
                          level="H"
                          includeMargin={true}
                        />
                        <p className="mt-2 text-sm text-gray-600">Scan to view bill details</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BillDisplay;