export interface IAttendanceSessionType {
  attended: boolean;
  timestamp: Date | null;
}
export interface IAttendanceSession {
  morning: IAttendanceSessionType;
  afternoon: IAttendanceSessionType;
  evening: IAttendanceSessionType;
}

export interface IAttendee {
  id_number: string;
  name: string;
  course: string;
  year: number;
  campus: string;
  attendance: IAttendanceSession;
  confirmedBy: string;
  shirtSize: string;
  shirtPrice: number;
  raffleIsRemoved: boolean;
  raffleIsWinner: boolean;
  transactBy: string;
  transactDate: Date | null;
}
