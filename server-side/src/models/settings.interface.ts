export interface ISettings {
  membership_price: number;
  studentCreatedAtBackfilled?: boolean;
  studentYearLastUpdated?: Date;
  chatbotEnabled?: boolean;
  noetixDisabledAdmins?: string[];
  noetixDisabledTools?: string[];
  noetixMaxIterations?: number;
}
