import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";

admin.initializeApp();

const PENALTY_RATE = 0.10; // 10%

// helper: create notification if not exists
async function ensureNotification(
  db: FirebaseFirestore.Firestore,
  accountNumber: string,
  recordId: string,
  type: string,
  description: string,
  customerId?: string
) {
  const notifColl = db.collection("notifications").doc(accountNumber).collection("records");
  // check existing notification of same type for this record
  const existing = await notifColl
    .where("type", "==", type)
    .where("recordId", "==", recordId)
    .limit(1)
    .get();

  if (!existing.empty) return false;

  await notifColl.add({
    accountNumber,
    recordId,
    type,
    description,
    customerId: customerId || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    read: false,
  });

  return true;
}

// --- 🔁 Scheduled Function: Add Penalty Daily ---
export const addDailyPenalty = functions.pubsub
  .schedule("0 0 * * *") // Runs daily at midnight
  .timeZone("Asia/Manila")
  .onRun(async () => {
    const db = admin.firestore();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`🔄 Running daily penalty check: ${today.toLocaleDateString("en-PH")}`);

    const accountsSnapshot = await db.collection("bills").listDocuments();

    let totalUpdated = 0;
    let batch = db.batch();
    let batchCount = 0;

    for (const accountDoc of accountsSnapshot) {
      const accountNumber = accountDoc.id;

      const recordsSnapshot = await db
        .collection("bills")
        .doc(accountNumber)
        .collection("records")
        .where("status", "==", "pending")
        .get();

      if (recordsSnapshot.empty) continue;

      for (const recordDoc of recordsSnapshot.docs) {
        const billData = recordDoc.data();
        if (!billData) continue;

        const recordId = recordDoc.id;
        const dueDateStr = billData.dueDate;
        if (!dueDateStr) {
          // if no due date, ensure there's at least a generic pending notification if none exists
          const anyNotif = await db
            .collection("notifications")
            .doc(accountNumber)
            .collection("records")
            .where("recordId", "==", recordId)
            .limit(1)
            .get();
          if (anyNotif.empty) {
            const desc = `Dear customer, your bill for account ${accountNumber} remains unpaid. Please check your account.`;
            await ensureNotification(db, accountNumber, recordId, "paymentPending", desc, billData.customerId);
          }
          continue;
        }

        const [day, month, year] = dueDateStr.split("/").map(Number);
        const dueDateObj = new Date(year, month - 1, day);
        dueDateObj.setHours(0, 0, 0, 0);

        const msPerDay = 1000 * 60 * 60 * 24;
        const diffDays = Math.round((dueDateObj.getTime() - today.getTime()) / msPerDay);

        // Prepare penalty based on base amount (but do not apply here unless overdue)
        const baseAmount = billData.currentAmountDue || billData.originalAmount || billData.amount || 0;
        const penalty = parseFloat((baseAmount * PENALTY_RATE).toFixed(2));
        const newAmount = (billData.amount || 0) + penalty;
        const newCurrentAmountDue = (billData.currentAmountDue || 0) + penalty;

        // 2 days before due date
        if (diffDays === 2) {
          const desc = `Reminder: Your bill for account ${accountNumber} is due on ${dueDateStr} (in 2 days). Please pay to avoid a penalty of ₱${penalty.toFixed(
            2
          )}.`;
          await ensureNotification(db, accountNumber, recordId, "dueReminder", desc, billData.customerId);
        }

        // on due date
        if (diffDays === 0) {
          const desc = `Notice: Your bill for account ${accountNumber} is due today (${dueDateStr}). Please pay to avoid a penalty of ₱${penalty.toFixed(
            2
          )}.`;
          await ensureNotification(db, accountNumber, recordId, "dueToday", desc, billData.customerId);
        }

        // overdue: today > due date
        if (today > dueDateObj) {
          // create overdue notification (include penalty amount)
          const desc = `Overdue: Your bill for account ${accountNumber} was due on ${dueDateStr} and is now overdue. A penalty of ₱${penalty.toFixed(
            2
          )} has been applied. Current amount due: ₱${newCurrentAmountDue.toFixed(2)}.`;
          // only create notification if not exists
          await ensureNotification(db, accountNumber, recordId, "overdue", desc, billData.customerId);

          if (!billData.appliedPenalty) {
            // apply penalty (same as original)
            batch.update(recordDoc.ref, {
              amount: newAmount,
              currentAmountDue: newCurrentAmountDue,
              penalty,
              appliedPenalty: true,
              penaltyDate: admin.firestore.FieldValue.serverTimestamp(),
              status: "overdue",
            });

            totalUpdated++;
            batchCount++;

            console.log(`🧾 Penalty ₱${penalty} applied to ${accountNumber}/${recordDoc.id}`);

            if (batchCount >= 500) {
              await batch.commit();
              console.log(`✅ Committed batch of ${batchCount} bills`);
              batch = db.batch();
              batchCount = 0;
            }
          }
        }

        // If there is still no notification at all for this unpaid record, create a generic pending notification.
        const anyNotif = await db
          .collection("notifications")
          .doc(accountNumber)
          .collection("records")
          .where("recordId", "==", recordId)
          .limit(1)
          .get();

        if (anyNotif.empty) {
          const desc = `Dear customer, your bill for account ${accountNumber} remains unpaid. Due date: ${dueDateStr}. Please pay to avoid penalties.`;
          await ensureNotification(db, accountNumber, recordId, "paymentPending", desc, billData.customerId);
        }
      }
    }

    if (batchCount > 0) await batch.commit();

    console.log(`✅ Finished daily penalty check. Updated ${totalUpdated} bills.`);
    return null;
  });

// --- 🧠 Manual Trigger Function ---
export const triggerPenaltyManually = functions.https.onRequest(async (req, res) => {
  try {
    const db = admin.firestore();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`🔄 Manual penalty trigger at ${today.toISOString()}`);

    const accountsSnapshot = await db.collection("bills").listDocuments();
    let totalUpdated = 0;
    let batch = db.batch();
    let batchCount = 0;
    const updatedBills: string[] = [];

    for (const accountDoc of accountsSnapshot) {
      const accountNumber = accountDoc.id;
      const recordsSnapshot = await db
        .collection("bills")
        .doc(accountNumber)
        .collection("records")
        .where("status", "==", "pending")
        .get();

      if (recordsSnapshot.empty) continue;

      for (const recordDoc of recordsSnapshot.docs) {
        const billData = recordDoc.data();
        if (!billData) continue;
        const recordId = recordDoc.id;

        const dueDateStr = billData.dueDate;
        if (!dueDateStr) {
          // create generic pending notif if none
          const anyNotif = await db
            .collection("notifications")
            .doc(accountNumber)
            .collection("records")
            .where("recordId", "==", recordId)
            .limit(1)
            .get();
          if (anyNotif.empty) {
            const desc = `Dear customer, your bill for account ${accountNumber} remains unpaid. Please check your account.`;
            await ensureNotification(db, accountNumber, recordId, "paymentPending", desc, billData.customerId);
          }
          continue;
        }

        const [day, month, year] = dueDateStr.split("/").map(Number);
        const dueDateObj = new Date(year, month - 1, day);
        dueDateObj.setHours(0, 0, 0, 0);

        const msPerDay = 1000 * 60 * 60 * 24;
        const diffDays = Math.round((dueDateObj.getTime() - today.getTime()) / msPerDay);

        const baseAmount = billData.currentAmountDue || billData.originalAmount || billData.amount || 0;
        const penalty = parseFloat((baseAmount * PENALTY_RATE).toFixed(2));
        const newAmount = (billData.amount || 0) + penalty;
        const newCurrentAmountDue = (billData.currentAmountDue || 0) + penalty;

        // 2 days before (manual trigger: also create if already overdue and missing)
        if (diffDays === 2 || (today > dueDateObj && diffDays <= 2)) {
          const desc = `Reminder: Your bill for account ${accountNumber} is due on ${dueDateStr} (in 2 days). Please pay to avoid a penalty of ₱${penalty.toFixed(
            2
          )}.`;
          await ensureNotification(db, accountNumber, recordId, "dueReminder", desc, billData.customerId);
        }

        // on due date (manual trigger: also create if already overdue and missing)
        if (diffDays === 0 || (today > dueDateObj && diffDays <= 0)) {
          const desc = `Notice: Your bill for account ${accountNumber} is due today (${dueDateStr}). Please pay to avoid a penalty of ₱${penalty.toFixed(
            2
          )}.`;
          await ensureNotification(db, accountNumber, recordId, "dueToday", desc, billData.customerId);
        }

        // overdue
        if (today > dueDateObj) {
          const desc = `Overdue: Your bill for account ${accountNumber} was due on ${dueDateStr} and is now overdue. A penalty of ₱${penalty.toFixed(
            2
          )} has been applied. Current amount due: ₱${newCurrentAmountDue.toFixed(2)}.`;
          await ensureNotification(db, accountNumber, recordId, "overdue", desc, billData.customerId);

          if (!billData.appliedPenalty) {
            batch.update(recordDoc.ref, {
              amount: newAmount,
              currentAmountDue: newCurrentAmountDue,
              penalty,
              appliedPenalty: true,
              penaltyDate: admin.firestore.FieldValue.serverTimestamp(),
              status: "overdue",
            });

            totalUpdated++;
            batchCount++;
            updatedBills.push(`${accountNumber}/${recordDoc.id}`);

            if (batchCount >= 500) {
              await batch.commit();
              batch = db.batch();
              batchCount = 0;
            }
          }
        }

        // Generic pending notification if none exists
        const anyNotif = await db
          .collection("notifications")
          .doc(accountNumber)
          .collection("records")
          .where("recordId", "==", recordId)
          .limit(1)
          .get();

        if (anyNotif.empty) {
          const desc = `Dear customer, your bill for account ${accountNumber} remains unpaid. Due date: ${dueDateStr}. Please pay to avoid penalties.`;
          await ensureNotification(db, accountNumber, recordId, "paymentPending", desc, billData.customerId);
        }
      }
    }

    if (batchCount > 0) await batch.commit();

    console.log(`✅ Applied penalty to ${totalUpdated} overdue bills`);
    res.status(200).json({
      message: `Successfully applied penalty to ${totalUpdated} overdue bills.`,
      penaltyRate: `${PENALTY_RATE * 100}%`,
      updatedBills,
    });
  } catch (error: any) {
    console.error("❌ Error applying penalties:", error);
    res.status(500).json({ error: error.message });
  }
});