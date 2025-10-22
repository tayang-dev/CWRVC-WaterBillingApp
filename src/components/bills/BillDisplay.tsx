import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import logoImage from "@/assets/logo.png";
import { QRCodeCanvas } from "qrcode.react";
import { db } from "../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

// Utility function to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
};

// Print a single bill by ID
const handlePrintSingleBill = async (billId: string) => {
  const printContent = document.getElementById(billId);
  if (!printContent) return;

  // cast so TS knows we have HTMLElement APIs
  const original = printContent as HTMLElement;
  const clone = original.cloneNode(true) as HTMLElement;

  // Convert any <canvas> (QR from qrcode.react) in the original to data URLs
  // and replace corresponding canvases in the clone with <img> so bitmap is preserved in print.
  try {
    const originalCanvases = Array.from(original.querySelectorAll<HTMLCanvasElement>("canvas"));
    const cloneCanvases = Array.from(clone.querySelectorAll<HTMLCanvasElement>("canvas"));

    originalCanvases.forEach((c, i) => {
      try {
        const dataUrl = c.toDataURL("image/png");
        const img = document.createElement("img");
        img.src = dataUrl;
        img.style.maxWidth = c.width ? `${c.width}px` : "128px";
        img.style.height = "auto";
        const target = cloneCanvases[i];
        if (target && target.parentNode) {
          target.parentNode.replaceChild(img, target);
        }
      } catch (err) {
        // Non-fatal: leave canvas as-is in clone if conversion fails
        console.warn("Failed to convert canvas to image for printing", err);
      }
    });
  } catch (err) {
    console.warn("Error while preparing canvases for print:", err);
  }

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Water Bill</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 0.5cm;
          }
          
          * {
            box-sizing: border-box;
          }
          
          body { 
            margin: 0; 
            padding: 0; 
            font-family: Arial, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            font-size: 11px;
          }
          
          img { 
            max-width: 100%; 
            height: auto;
          }
          
          table { 
            border-collapse: collapse; 
            width: 100%; 
          }
          
          th, td { 
            border: 1px solid black; 
            padding: 5px; 
            text-align: center;
            font-size: 10px;
          }
          
          th {
            background-color: #efefef !important;
            font-weight: bold;
          }
          
          /* Layout utilities */
          .flex { display: flex; }
          .flex-col { flex-direction: column; }
          .flex-row { flex-direction: row; }
          .items-center { align-items: center; }
          .items-end { align-items: flex-end; }
          .items-start { align-items: flex-start; }
          .justify-between { justify-content: space-between; }
          .justify-center { justify-content: center; }
          .gap-2 { gap: 0.5rem; }
          .gap-3 { gap: 0.75rem; }
          .space-y-1 > * + * { margin-top: 0.25rem; }
          
          /* Spacing */
          .mt-2 { margin-top: 0.5rem; }
          .mt-3 { margin-top: 0.75rem; }
          .mt-4 { margin-top: 1rem; }
          .mb-2 { margin-bottom: 0.5rem; }
          .mb-3 { margin-bottom: 0.75rem; }
          .pb-2 { padding-bottom: 0.5rem; }
          .pt-2 { padding-top: 0.5rem; }
          .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
          .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
          .p-3 { padding: 0.75rem; }
          
          /* Width utilities */
          .w-full { width: 100%; }
          
          /* Border */
          .border { border: 1px solid black; }
          .border-2 { border-width: 2px; }
          .border-t-2 { border-top-width: 2px; }
          .border-b-2 { border-bottom-width: 2px; }
          .border-black { border-color: black; }
          
          /* Text */
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-xs { font-size: 9px; }
          .text-sm { font-size: 10px; }
          .text-base { font-size: 11px; }
          .text-lg { font-size: 14px; }
          .text-xl { font-size: 16px; }
          .text-2xl { font-size: 22px; }
          .font-bold { font-weight: 700; }
          .font-semibold { font-weight: 600; }
          .text-gray-600 { color: #4b5563; }
          
          /* List */
          .list-decimal { list-style-type: decimal; }
          
          /* Flex utilities */
          .flex-1 { flex: 1; }
          
          /* Container */
          .bill-container {
            width: 100%;
            max-width: 21cm;
            margin: 0 auto;
            border: 2px solid black;
            padding: 12px;
            background: white;
          }
          
          /* Header section */
          .header-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid black;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          
          .logo-company {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
          }
          
          .logo {
            width: 70px;
            height: 70px;
            object-fit: contain;
          }
          
          .company-info {
            text-align: center;
            flex: 1;
          }
          
          .bill-number-section {
            text-align: right;
            min-width: 180px;
          }
          
          /* Customer and readings section */
          .customer-readings {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
            align-items: flex-start;
          }
          
          .customer-info-section {
            flex: 1;
          }
          
          .readings-table-wrapper {
            width: 420px;
          }
          
          /* Billing main section */
          .billing-main {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
            align-items: flex-start;
          }
          
          .billing-table-wrapper {
            flex: 1;
          }
          
          .rates-box {
            width: 320px;
          }
          
          /* Footer credentials section */
          .footer-section {
            margin-top: 10px;
            border-top: 2px solid black;
            padding-top: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
          }
          
          .credentials-box {
            text-align: center;
            padding: 8px;
            border: 1px solid black;
            flex: 1;
          }
          
          .qr-box {
            text-align: center;
          }
          
          .qr-image {
            width: 120px;
            height: 120px;
          }
          
          .receipt-note {
            text-align: center;
            font-weight: 700;
            margin: 8px 0;
            padding: 6px;
            border-top: 1px solid black;
            border-bottom: 1px solid black;
          }
          
          /* Hide print button */
          .print\\:hidden {
            display: none !important;
          }
          
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            
            .bill-container {
              margin: 0;
              max-width: 100%;
            }
            
            .print\\:hidden {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        ${(clone as HTMLElement).innerHTML}
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); window.close(); }, 150);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

const BillDisplay = ({ open, onOpenChange, selectedAccount, selectedBills, customersCollection }) => {
  const [ratesConfig, setRatesConfig] = useState(null);

  // Fetch ratesConfig from Firestore
  useEffect(() => {
    const fetchRatesConfig = async () => {
      try {
        const ratesSnap = await getDocs(collection(db, "rates"));
        if (!ratesSnap.empty) {
          const doc = ratesSnap.docs[0];
          const data = doc.data();
          setRatesConfig({
            tiers: data.tiers,
            minimumCharge: data.minimumCharge ?? 94.70,
          });
        } else {
          setRatesConfig({
            tiers: [
              { min: 0, max: 5, rate: 0.00 },
              { min: 6, max: 10, rate: 20.70 },
              { min: 11, max: 20, rate: 22.50 },
              { min: 21, max: 30, rate: 24.40 },
              { min: 31, max: 40, rate: 26.30 },
              { min: 41, max: "above", rate: 28.10 },
            ],
            minimumCharge: 94.70,
          });
        }
      } catch (e) {
        setRatesConfig({
          tiers: [
            { min: 0, max: 5, rate: 0.00 },
            { min: 6, max: 10, rate: 20.70 },
            { min: 11, max: 20, rate: 22.50 },
            { min: 21, max: 30, rate: 24.40 },
            { min: 31, max: 40, rate: 26.30 },
            { min: 41, max: "above", rate: 28.10 },
          ],
          minimumCharge: 94.70,
        });
      }
    };
    fetchRatesConfig();
  }, []);

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
    return customersCollection.find(
      (customer) => customer.accountNumber === bill.accountNumber
    );
  };

  // Helper function to format date from Firestore timestamp
  const formatBillDate = (bill) => {
    try {
      // Check for 'date' field first (your actual field name)
      if (bill.date && bill.date.seconds) {
        return new Date(bill.date.seconds * 1000 + (bill.date.nanoseconds || 0) / 1000000).toLocaleString();
      }
      // Fallback to createdAt if date doesn't exist
      if (bill.createdAt && bill.createdAt.seconds) {
        return new Date(bill.createdAt.seconds * 1000 + (bill.createdAt.nanoseconds || 0) / 1000000).toLocaleString();
      }
      // If it's a direct Date object
      if (bill.date instanceof Date) {
        return bill.date.toLocaleString();
      }
      if (bill.createdAt instanceof Date) {
        return bill.createdAt.toLocaleString();
      }
      return 'Date not available';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date not available';
    }
  };

  // Sort bills by creation date (newest first)
  const sortedBills = [...selectedBills].sort((a, b) => {
    const billNumA = parseInt(a.billNumber) || 0;
    const billNumB = parseInt(b.billNumber) || 0;
    return billNumB - billNumA; // Descending order (largest first)
  });

  // --- Use dynamic ratesConfig for tiered billing ---
  const calculateTieredUsage = (totalUsage) => {
    if (!ratesConfig) {
      // fallback to default
      return {
        tiers: [],
        totalAmount: 0,
      };
    }
    const tiers = ratesConfig.tiers.map(tier => ({
      ...tier,
      usage: 0,
      amount: 0,
    }));

    let remainingUsage = totalUsage;
    let totalAmount = 0;

    // Always apply minimum charge for usage within the minimum tier (including 0)
    const minTier = tiers[0];
    const minTierMin = typeof minTier.min === "number" ? minTier.min : 0;
    const minTierMax = typeof minTier.max === "number" ? minTier.max : 5;
    const minCharge = ratesConfig.minimumCharge ?? 94.70;

    if (totalUsage >= minTierMin && totalUsage <= minTierMax) {
      tiers[0].usage = totalUsage;
      tiers[0].amount = minCharge;
      totalAmount = minCharge;
      return { tiers, totalAmount };
    } else if (totalUsage > minTierMax) {
      tiers[0].usage = minTierMax - minTierMin + 1;
      tiers[0].amount = minCharge;
      totalAmount += minCharge;
      remainingUsage -= (minTierMax - minTierMin + 1);
    } else {
      // usage < minTierMin
      tiers[0].usage = totalUsage;
      tiers[0].amount = minCharge;
      totalAmount = minCharge;
      return { tiers, totalAmount };
    }

    // Distribute remaining usage to other tiers
    for (let i = 1; i < tiers.length && remainingUsage > 0; i++) {
      const tier = tiers[i];
      const tierMin = typeof tier.min === "number" ? tier.min : 0;
      const tierMax = tier.max === "above" || tier.max === "over" ? Infinity : Number(tier.max);
      const tierRange = tierMax === Infinity ? remainingUsage : tierMax - tierMin + 1;
      const tierUsage = Math.min(remainingUsage, tierRange);

      if (tierUsage > 0) {
        tiers[i].usage = tierUsage;
        tiers[i].amount = parseFloat((tierUsage * tier.rate).toFixed(2));
        totalAmount += tiers[i].amount;
        remainingUsage -= tierUsage;
      }
    }

    return { tiers, totalAmount };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        style={{ width: "100%", maxWidth: "1100px" }}
      >
        <DialogHeader>
          <DialogTitle>Bills for {selectedAccount}</DialogTitle>
        </DialogHeader>
        <div className="space-y-8">
          {(() => {
            return sortedBills.map((bill, index) => {
              const { tiers, totalAmount } = calculateTieredUsage(bill.waterUsage || 0);
              const totalAmountAfterDue = parseFloat(bill.amountAfterDue || 0) + parseFloat(bill.arrears || 0);
              const regularAmount = parseFloat(bill.amountWithArrears || 0);
              const arrears = parseFloat(bill.arrears || 0);
              const customer = getCustomerForBill(bill);

              const scf = parseFloat(
                bill.scfApplied ??
                bill.scffee ??
                bill.scf ??
                bill.scfFee ??
                bill.serviceConnectionFee ??
                0
              );
              const billsForAccount = selectedBills.filter(
                b => b.accountNumber === bill.accountNumber
              );

              const getDateObj = (b) => {
                // Check for 'date' field first
                if (b.date && b.date.seconds) {
                  return new Date(b.date.seconds * 1000 + (b.date.nanoseconds || 0) / 1000000);
                }
                if (b.dueDate && typeof b.dueDate === "string" && b.dueDate.includes("/")) {
                  const [day, month, year] = b.dueDate.split("/").map(Number);
                  return new Date(year, month - 1, day);
                }
                if (b.createdAt && b.createdAt.seconds) {
                  return new Date(b.createdAt.seconds * 1000 + (b.createdAt.nanoseconds || 0) / 1000000);
                }
                return new Date(0);
              };

              const earliestBill = billsForAccount.reduce((earliest, current) => {
                return getDateObj(current) < getDateObj(earliest) ? current : earliest;
              }, billsForAccount[0]);

              const showCredentials = bill.id === earliestBill.id;

            return (
                <div
                  key={index}
                  className="border-2 border-black p-4 relative"
                  id={`bill-${index}`}
                  style={{ maxWidth: "900px", margin: "0 auto" }}
                >
                  {/* Print Button - Only visible on screen, hidden when printing */}
                  <div className="absolute top-0 right-2 print:hidden z-10">
                    <Button
                      onClick={() => handlePrintSingleBill(`bill-${index}`)}
                      size="sm"
                      variant="outline"
                      className="bg-white hover:bg-gray-100"
                    >
                      🖨️ Print This Bill
                    </Button>
                  </div>

                  {/* Header */}
                  <div className="flex justify-between items-center border-b-2 border-black pb-3 mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <img 
                        src={logoImage} 
                        alt="Centennial Water Logo" 
                        className="w-20 h-20 object-contain"
                      />
                      <div className="text-center flex-1">
                        <div className="text-lg font-bold">CENTENNIAL WATER RESOURCE VENTURE CORPORATION</div>
                        <div className="text-sm">Southville 7, Site 3, Brgy. Sto. Tomas, Calauan, Laguna</div>
                      </div>
                    </div>
                    <div className="text-right" style={{ minWidth: "180px" }}>
                      <div className="text-sm">BILLING STATEMENT NO.</div>
                      <div className="text-2xl font-bold mt-1">{bill.billNumber || "0000000000"}</div>
                    </div>
                  </div>

                  {/* Customer Info and Readings */}
                  <div className="flex gap-3 mb-3 items-start">
                    <div className="flex-1">
                      <div className="text-xl font-bold mb-1">{bill.customerName || "CUSTOMER NAME"}</div>
                      <div className="text-sm text-gray-600">{bill.customerAddress || "Address information"}</div>
                    </div>

                    <div style={{ width: "420px" }}>
                      <table className="w-full border-collapse border border-black">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-black p-2 text-xs text-center">Current<br/>Reading</th>
                            <th className="border border-black p-2 text-xs text-center">Previous<br/>Reading</th>
                            <th className="border border-black p-2 text-xs text-center">Consumption</th>
                            <th className="border border-black p-2 text-xs text-center">Billing Month</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-black p-2 text-center font-semibold">
                              {bill.meterReading?.current || 0}
                            </td>
                            <td className="border border-black p-2 text-center font-semibold">
                              {bill.meterReading?.previous || 0}
                            </td>
                            <td className="border border-black p-2 text-center font-semibold">
                              {bill.waterUsage || 0}
                            </td>
                            <td className="border border-black p-2 text-center font-semibold text-sm">
                              {bill.billingPeriod || ""}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Billing Details and Rates Breakdown */}
                  <div className="flex gap-3 mb-3 items-start">
                    <div className="flex-1">
                      <table className="w-full border-collapse border border-black">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-black p-2 text-xs">Billing<br/>Period</th>
                            <th className="border border-black p-2 text-xs">Water</th>
                            <th className="border border-black p-2 text-xs">Tax</th>
                            <th className="border border-black p-2 text-xs">SCF</th>
                            <th className="border border-black p-2 text-xs">Senior<br/>Discount</th>
                            <th className="border border-black p-2 text-xs">Arrears</th>
                            <th className="border border-black p-2 text-xs">Over<br/>Payment</th>
                            <th className="border border-black p-2 text-xs">Amount<br/>Due</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-black p-2 text-center text-xs">{bill.billingPeriod || "01/01/25 - 01/31/25"}</td>
                            <td className="border border-black p-2 text-center font-semibold text-xs">{bill.waterChargeBeforeTax?.toFixed(2) || "0.00"}</td>
                            <td className="border border-black p-2 text-center font-semibold text-xs">{bill.tax?.toFixed(2) || "0.00"}</td>
                            <td className="border border-black p-2 text-center font-semibold text-xs">{scf.toFixed(2)}</td>
                            <td className="border border-black p-2 text-center font-semibold text-xs">{bill.seniorDiscount?.toFixed(2) || "0.00"}</td>
                            <td className="border border-black p-2 text-center font-semibold text-xs">{bill.arrears?.toFixed(2) || "0.00"}</td>
                            <td className="border border-black p-2 text-center font-semibold text-xs">{bill.appliedOverpayment?.toFixed(2) || "0.00"}</td>
                            <td className="border border-black p-2 text-center font-bold text-sm">{bill.amountWithArrears?.toFixed(2) || "0.00"}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div style={{ width: "320px" }}>
                      <table className="w-full border-collapse border border-black">
                        <thead>
                          <tr className="bg-gray-100">
                            <th colSpan={5} className="border border-black p-2 text-xs">Rates Breakdown</th>
                          </tr>
                          <tr className="bg-gray-100">
                            <th className="border border-black p-1 text-xs">Min</th>
                            <th className="border border-black p-1 text-xs">Max</th>
                            <th className="border border-black p-1 text-xs">Rate</th>
                            <th className="border border-black p-1 text-xs">Value</th>
                            <th className="border border-black p-1 text-xs">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bill.waterUsage <= 0 ? (
                            <tr>
                              <td colSpan={5} className="border border-black p-2 text-center text-xs">No water usage recorded</td>
                            </tr>
                          ) : (
                            <>
                              {tiers
                                .filter(tier => tier.usage > 0)
                                .map((tier, i) => (
                                  <tr key={i}>
                                    <td className="border border-black p-1 text-center text-xs">{tier.min}</td>
                                    <td className="border border-black p-1 text-center text-xs">{tier.max === Infinity ? "above" : tier.max}</td>
                                    <td className="border border-black p-1 text-center text-xs">{tier.rate.toFixed(2)}</td>
                                    <td className="border border-black p-1 text-center text-xs">{tier.usage}</td>
                                    <td className="border border-black p-1 text-center text-xs">{tier.amount.toFixed(2)}</td>
                                  </tr>
                                ))}
                            </>
                          )}
                          <tr>
                            <td colSpan={4} className="border border-black p-2 text-right font-bold text-xs">Total:</td>
                            <td className="border border-black p-2 text-center font-bold text-xs">{bill.waterChargeBeforeTax?.toFixed(2) || "0.00"}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Account Details */}
                  <div className="mb-3">
                    <table className="w-full border-collapse border border-black">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-black p-2 text-xs">Account#</th>
                          <th className="border border-black p-2 text-xs">Meter#</th>
                          <th className="border border-black p-2 text-xs">Due Date</th>
                          <th className="border border-black p-2 text-xs">Penalty</th>
                          <th className="border border-black p-2 text-xs">Amount After Due Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-black p-2 text-center font-semibold text-xs">{bill.accountNumber || "00-00-0000"}</td>
                          <td className="border border-black p-2 text-center font-semibold text-xs">{bill.meterNumber || "00000000"}</td>
                          <td className="border border-black p-2 text-center font-semibold text-xs">{bill.dueDate || "01/01/2025"}</td>
                          <td className="border border-black p-2 text-center font-semibold text-xs">{bill.penalty?.toFixed(2) || "0.00"}</td>
                          <td className="border border-black p-2 text-center font-bold text-sm">{totalAmountAfterDue.toFixed(2) || "0.00"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Footer Notes */}
                  <div className="mb-3">
                    <div className="font-bold text-sm mb-2">MAHALAGANG PAALALA TUNGKOL SA INYONG WATER BILL:</div>
                    <ol className="list-decimal text-xs space-y-1" style={{ paddingLeft: "18px" }}>
                      <li>HUWAG PONG KALILIMUTAN DALHIN ANG INYONG BILLING STATEMENT KAPAG KAYO AY MAGBABAYAD</li>
                      <li>PARA MAIWASAN ANG PAGBABAYAD NG MULTA, MAGBAYAD PO NG INYONG BILLING STATEMENT NG MAS MAAGA O DI LALAGPAS SA INYONG DUE DATE.</li>
                      <li>ANG SERBISYO PO NG INYONG TUBIG AY PUPUTULIN NG WALANG PAALALA KUNG DI KAYO MAKAPAGBAYAD SA LOOB NG LIMANG(5) ARAW PAGKATAPOS NG DUE DATE.</li>
                    </ol>
                  </div>

                  <div className="text-center font-bold border-t border-b border-black py-2 mb-3 text-sm">
                    "THIS WILL SERVE AS YOUR OFFICIAL RECEIPT WHEN MACHINE VALIDATED"
                  </div>

                  {/* Initial Login Credentials and QR Code */}
                  <div className="flex justify-between items-center gap-3 border-t-2 border-black pt-3">
                    {showCredentials ? (
                      <div className="border border-black p-3 text-center flex-1">
                        <div className="font-bold text-sm mb-2">INITIAL LOGIN CREDENTIALS</div>
                        <div className="text-xs space-y-1">
                          <div>
                            <span className="font-semibold">username:</span> {customer?.email || customer?.phone || "N/A"}
                          </div>
                          <div>
                            <span className="font-semibold">password:</span> {bill.accountNumber || "N/A"}
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 mt-2">
                          Please change your password after your first login for security purposes.
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1"></div>
                    )}
                    
                    <div className="text-center">
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
                        size={120}
                        level="H"
                        includeMargin={true}
                      />
                      <div className="text-xs text-gray-600 mt-1">Scan to view bill details</div>
                    </div>
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