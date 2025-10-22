import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";

admin.initializeApp();

const PENALTY_RATE = 0.10; // 10%

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
        if (billData.appliedPenalty) continue; // Skip already penalized

        const dueDateStr = billData.dueDate;
        if (!dueDateStr) continue;

        const [day, month, year] = dueDateStr.split("/").map(Number);
        const dueDateObj = new Date(year, month - 1, day);
        dueDateObj.setHours(0, 0, 0, 0);

        if (today > dueDateObj) {
          const baseAmount =
            billData.currentAmountDue || billData.originalAmount || billData.amount || 0;

          const penalty = parseFloat((baseAmount * PENALTY_RATE).toFixed(2));
          const newAmount = (billData.amount || 0) + penalty;
          const newCurrentAmountDue = (billData.currentAmountDue || 0) + penalty;

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
        if (billData.appliedPenalty) continue;

        const dueDateStr = billData.dueDate;
        if (!dueDateStr) continue;

        const [day, month, year] = dueDateStr.split("/").map(Number);
        const dueDateObj = new Date(year, month - 1, day);
        dueDateObj.setHours(0, 0, 0, 0);

        if (today > dueDateObj) {
          const baseAmount =
            billData.currentAmountDue || billData.originalAmount || billData.amount || 0;

          const penalty = parseFloat((baseAmount * PENALTY_RATE).toFixed(2));
          const newAmount = (billData.amount || 0) + penalty;
          const newCurrentAmountDue = (billData.currentAmountDue || 0) + penalty;

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
