import { ExpiringContract } from "./expiring-contract";
import { OverdueInvoice } from "./overdue-invoice";

export interface AlertDetails {
    contractsExpiringSoon: ExpiringContract[];
    overdueInvoices: OverdueInvoice[];

}
