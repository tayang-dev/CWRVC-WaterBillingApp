import React, { forwardRef } from "react";
import { Printer } from "lucide-react";
import logoImage from "@/assets/logo.png";

export interface DisconnectionItem {
  accountNumber: string;
  name: string;
  site?: string;
  unpaidCount: number;
  totalDue: number;
}

interface DisconnectionNoticeDisplayProps {
  item: DisconnectionItem;
}

const DisconnectionNoticeDisplay = forwardRef<HTMLDivElement, DisconnectionNoticeDisplayProps>(
  (props, ref) => {
    const handlePrint = () => {
      window.print();
    };

    return (
      <div className="relative">
        {/* Print Button - Hidden when printing */}
        <div className="text-center mb-4 print:hidden">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition-colors"
          >
            <Printer size={20} />
            Print Notice
          </button>
        </div>

        <div
          ref={ref}
          className="max-w-2xl mx-auto border-2 border-black p-6 bg-white"
        >
          {/* Original Logo Header */}
          <div className="flex items-center gap-3 mb-4">
            <img
              src={logoImage}
              alt="Logo"
              className="w-16 h-16 object-contain"
            />
            <div>
              <h1 className="text-lg font-bold">
                CENTENNIAL WATER RESOURCE VENTURE CORPORATION
              </h1>
              <p className="text-xs">
                Southville 7, Site 3, Brgy. Sto. Tomas, Calauan, Laguna
              </p>
            </div>
          </div>

          {/* Notice Header */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-red-700">
              DISCONNECTION NOTICE
            </h2>
            <p className="text-base mt-2">
              Account #: <b>{props.item.accountNumber}</b>
            </p>
            <p className="text-base">
              Name: <b>{props.item.name}</b>
            </p>
            {props.item.site && (
              <p className="text-base">
                Site: <b>{props.item.site}</b>
              </p>
            )}
            <p className="text-base">
              Unpaid Months: <b>{props.item.unpaidCount}</b>
            </p>
            <p className="text-base">
              Total Due:{" "}
              <b>
                ₱{props.item.totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </b>
            </p>
          </div>

          {/* PLEASE PAY FULL AMOUNT - Prominent Alert */}
          <div className="bg-red-600 text-white p-4 mb-4 text-center">
            <p className="text-xl font-bold tracking-wide">
              ⚠ PLEASE PAY FULL AMOUNT ⚠
            </p>
            <p className="text-lg mt-1 font-bold">
              ₱{props.item.totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Warning Box */}
          <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6">
            <p className="font-semibold text-yellow-900">
              Our records show that your account has unpaid water bills for{" "}
              {props.item.unpaidCount} months.
              <br />
              Please settle your outstanding balance within <b>5 days</b> from
              receipt of this notice to avoid service disconnection.
            </p>
            <ul className="list-disc ml-6 mt-3 text-sm text-yellow-900">
              <li>Payment after the due date may result in penalties.</li>
              <li>
                Disconnection will be done without further notice if payment is
                not received.
              </li>
              <li>For questions, please contact our office immediately.</li>
            </ul>
          </div>

          {/* Footer Notice */}
          <div className="text-center mt-8">
            <p className="font-bold text-lg text-red-700">
              THIS IS AN OFFICIAL NOTICE. PLEASE DISREGARD IF PAYMENT HAS BEEN
              MADE.
            </p>
          </div>
        </div>
      </div>
    );
  }
);

DisconnectionNoticeDisplay.displayName = "DisconnectionNoticeDisplay";

export default DisconnectionNoticeDisplay;

// Demo component
function Demo() {
  const sampleItem: DisconnectionItem = {
    accountNumber: "2024-001234",
    name: "Juan Dela Cruz",
    site: "Site 3, Block 5, Lot 12",
    unpaidCount: 3,
    totalDue: 2450.75
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <DisconnectionNoticeDisplay item={sampleItem} />
      </div>
      <style>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}