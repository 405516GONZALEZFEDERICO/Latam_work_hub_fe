import { MonthlyIncome } from "./monthly-income";

export interface FinanceDetails {
    totalBilled: number;
    totalCollected: number;
    totalPending: number;
    monthlyIncomeComparison: MonthlyIncome[];
}
