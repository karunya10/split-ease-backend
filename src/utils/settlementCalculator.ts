import prisma from "../prisma.js";
import { Decimal } from "@prisma/client/runtime/library";

interface DebtBalance {
  userId: string;
  balance: Decimal; // Positive means user is owed money, negative means user owes money
}

interface Settlement {
  fromUserId: string;
  toUserId: string;
  amount: Decimal;
}


export async function calculateGroupSettlements(
  groupId: string
): Promise<Settlement[]> {
 
  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: {
      splits: true,
    },
  });

  // Get existing paid settlements to account for them
  const paidSettlements = await prisma.settlement.findMany({
    where: {
      groupId,
      status: "PAID",
    },
  });

  const balances: { [userId: string]: Decimal } = {};

  for (const expense of expenses) {
    const paidBy = expense.paidById;
    const totalAmount = expense.amount;

 
    if (!balances[paidBy]) {
      balances[paidBy] = new Decimal(0);
    }

    balances[paidBy] = balances[paidBy].plus(totalAmount);

    for (const split of expense.splits) {
      if (!balances[split.userId]) {
        balances[split.userId] = new Decimal(0);
      }
      balances[split.userId] = balances[split.userId]!.minus(split.amountOwed);
    }
  }

  // Adjust balances based on existing paid settlements
  // If A paid B $50, then A's balance increases by $50 and B's balance decreases by $50
  for (const settlement of paidSettlements) {
    const fromUserId = settlement.fromUserId;
    const toUserId = settlement.toUserId;
    const amount = settlement.amount;

    // Initialize balances if they don't exist
    if (!balances[fromUserId]) {
      balances[fromUserId] = new Decimal(0);
    }
    if (!balances[toUserId]) {
      balances[toUserId] = new Decimal(0);
    }

    // The person who paid (fromUser) gets credited, the person who received (toUser) gets debited
    balances[fromUserId] = balances[fromUserId].plus(amount);
    balances[toUserId] = balances[toUserId].minus(amount);
  }

  // Convert to array and separate debtors from creditors
  const debtBalances: DebtBalance[] = Object.entries(balances).map(
    ([userId, balance]) => ({
      userId,
      balance,
    })
  );

  // Separate users who owe money (negative balance) from those who are owed money (positive balance)
  const debtors = debtBalances
    .filter((db) => db.balance.lt(0))
    .map((db) => ({
      userId: db.userId,
      amount: db.balance.abs(), // Convert to positive amount
    }));

  const creditors = debtBalances
    .filter((db) => db.balance.gt(0))
    .map((db) => ({
      userId: db.userId,
      amount: db.balance,
    }));

  // Calculate optimal settlements using a greedy algorithm
  const settlements: Settlement[] = [];

  // Create mutable copies of debtors and creditors arrays
  const mutableDebtors = debtors.map((d) => ({ ...d }));
  const mutableCreditors = creditors.map((c) => ({ ...c }));

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (
    debtorIndex < mutableDebtors.length &&
    creditorIndex < mutableCreditors.length
  ) {
    const debtor = mutableDebtors[debtorIndex];
    const creditor = mutableCreditors[creditorIndex];

    if (!debtor || !creditor) {
      break;
    }

    // Settle the minimum of what debtor owes and what creditor is owed
    const settlementAmount = Decimal.min(debtor.amount, creditor.amount);

    if (settlementAmount.gt(0)) {
      settlements.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amount: settlementAmount,
      });
    }

    // Update remaining amounts
    debtor.amount = debtor.amount.minus(settlementAmount);
    creditor.amount = creditor.amount.minus(settlementAmount);

    // Move to next debtor/creditor if current one is settled
    if (debtor.amount.eq(0)) {
      debtorIndex++;
    }
    if (creditor.amount.eq(0)) {
      creditorIndex++;
    }
  }

  return settlements;
}


export async function updateGroupSettlements(groupId: string): Promise<void> {
 
  const newSettlements = await calculateGroupSettlements(groupId);
  await prisma.$transaction(async (tx) => {
    // Delete only PENDING settlements for the group (keep PAID ones)
    await tx.settlement.deleteMany({
      where: {
        groupId,
        status: "PENDING",
      },
    });

    // Create new settlements
    if (newSettlements.length > 0) {
      await tx.settlement.createMany({
        data: newSettlements.map((settlement) => ({
          ...settlement,
          groupId,
          status: "PENDING",
        })),
      });
    }
  });
}

/**
 * Get settlement summary for a user in a group
 */
export async function getUserSettlementSummary(
  userId: string,
  groupId?: string
) {
  const whereClause: any = {
    OR: [{ fromUserId: userId }, { toUserId: userId }],
    status: "PENDING", // Only show pending settlements in summary
  };

  if (groupId) {
    whereClause.groupId = groupId;
  }

  const settlements = await prisma.settlement.findMany({
    where: whereClause,
    include: {
      fromUser: {
        select: { id: true, name: true, email: true },
      },
      toUser: {
        select: { id: true, name: true, email: true },
      },
      group: {
        select: { id: true, name: true },
      },
    },
  });

  let totalOwed = new Decimal(0);
  let totalOwing = new Decimal(0);

  for (const settlement of settlements) {
    if (settlement.fromUserId === userId) {
      totalOwing = totalOwing.plus(settlement.amount);
    } else {
      totalOwed = totalOwed.plus(settlement.amount);
    }
  }

  return {
    settlements,
    totalOwed: totalOwed.toNumber(),
    totalOwing: totalOwing.toNumber(),
    netBalance: totalOwed.minus(totalOwing).toNumber(),
  };
}
