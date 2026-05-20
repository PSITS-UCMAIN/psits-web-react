export interface StudentProfile {
  id_number: string;
  first_name: string;
  last_name: string;
  course: string;
  year: string;
  email: string;
  campus: string;
}
export interface StudentProfileResponse {
  data: StudentProfile;
}
