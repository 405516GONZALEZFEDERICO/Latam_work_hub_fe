import { AlertDetails } from "./alert-details";
import { FinanceDetails } from "./finance-details";
import { GeneralSummary } from "./general-summary";
import { SpaceDetails } from "./space-details";
import { UserDetails } from "./user-details";

export interface AdminReport {
    generalSummary: GeneralSummary;
    spaceDetails: SpaceDetails;
    userDetails: UserDetails;
    financeDetails: FinanceDetails;
    alerts: AlertDetails;

}
