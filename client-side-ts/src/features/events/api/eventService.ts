import api from "@/api/axios";
import axios, { AxiosError } from "axios";
import backendConnection from "../../../api/backendApi";
import { showToast } from "../../../utils/alertHelper";
import type {
  AddAttendeeFormData,
  AddAttendeeV2Payload,
  AddAttendeeV2Response,
  ApiErrorResponse,
  ChangeAttendeePasswordV2Payload,
  ChangeAttendeePasswordV2Response,
  CreateEventData,
  CreateEventResponse,
  DrawRaffleWinnerResponse,
  EditableAttendeeResponse,
  EditAttendeeV2Payload,
  EditAttendeeV2Response,
  Event,
  EventCheckData,
  EventStatisticsResponse,
  GetAttendeesParams,
  GetRafflePoolResponse,
  MarkAttendanceV2Payload,
  MarkAttendanceV2Response,
  PaginatedAttendeesResponse,
  RaffleQueryParams,
  RaffleResponse,
  RaffleWinnerResponse,
  RemoveAttendeeFormData,
  RemoveRaffleResponse,
  StatisticsData,
  UpdateSettingsFormData,
} from "../types/event.types";

const getAuthToken = (): string | null => {
  return sessionStorage.getItem("Token");
};

// Helper function to handle API errors
const handleApiError = (
  error: unknown,
  shouldReload: boolean = false
): false => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    if (axiosError.response?.data) {
      if (shouldReload) {
        //uncomment the line if its not error
        // window.location.reload();
      }
      console.error(
        "Error:",
        axiosError.response.data.message || "An error occurred"
      );
    } else {
      console.error("Error:", "An error occurred");
    }
  } else {
    console.error("Error:", error);
  }
  return false;
};

// Optional: You can define an interface for the expected API response shape
interface EventApiResponse {
  data: Event[];
}

interface EventByIdApiResponse {
  data: Event;
}

export const getEvents = async (): Promise<Event[] | false> => {
  try {
    const response = await api.get<EventApiResponse>(
      "/api/v2/events/get-all-event"
    );

    const eventsArray = response.data.data;

    return Array.isArray(eventsArray) ? eventsArray : [];
  } catch (error) {
    return handleApiError(error, true);
  }
};
/**
 * GET /api/v2/events/my-events
 *
 * Returns all events where each event's `attendees` array contains only the
 * requesting student's record (from the JWT), or an empty array if they are
 * not listed.
 */
export const getMyEvents = async (): Promise<Event[]> => {
  const response = await api.get<{ data: Event[] }>("/api/v2/events/my-events");
  return Array.isArray(response.data.data) ? response.data.data : [];
};

export const getEventById = async (eventId: string): Promise<Event | false> => {
  try {
    if (!eventId?.trim()) {
      return false;
    }

    const response = await api.get<EventByIdApiResponse>(
      `/api/v2/events/${eventId}`
    );

    return response.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const createEvent = async (
  data: CreateEventData
): Promise<CreateEventResponse | false> => {
  try {
    const token = getAuthToken();
    const response = await axios.post<CreateEventResponse>(
      `${backendConnection()}/api/events/create-event`,
      data,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    return handleApiError(error, true);
  }
};

export const updateEvent = async (
  eventId: string,
  data: Partial<Event>
): Promise<boolean> => {
  try {
    const token = getAuthToken();
    const response = await axios.put(
      `${backendConnection()}/api/events/update-event/${eventId}`,
      data,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 200) {
      showToast("success", "Event updated successfully!");
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error updating event:", error);
    const errorMessage = axios.isAxiosError(error)
      ? error.response?.data?.message || "Failed to update event"
      : "Failed to update event";
    showToast("error", errorMessage);
    return false;
  }
};

export const getAttendees = async (
  eventId: string,
  params: GetAttendeesParams = {}
): Promise<PaginatedAttendeesResponse | false> => {
  try {
    if (!eventId?.trim()) {
      return false;
    }

    const normalizedParams = {
      ...params,
      attendanceStatus:
        params.attendanceStatus && params.attendanceStatus.length > 0
          ? params.attendanceStatus.join(",")
          : undefined,
      course:
        params.course && params.course.length > 0
          ? params.course.join(",")
          : undefined,
      yearLevel:
        params.yearLevel && params.yearLevel.length > 0
          ? params.yearLevel.join(",")
          : undefined,
    };

    const response = await api.get<PaginatedAttendeesResponse>(
      `/api/v2/events/${eventId}/attendees`,
      { params: normalizedParams }
    );

    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const markAsPresent = async (
  eventId: string,
  attendeeId: string,
  campus: string,
  course: string,
  year: string,
  attendeeName: string
): Promise<boolean | undefined> => {
  try {
    const token = getAuthToken();
    const url = `${backendConnection()}/api/events/attendance/${eventId}/${attendeeId}`;

    const response = await axios.put(
      url,
      {
        campus,
        attendeeName,
        course,
        year,
        currentDate: new Date(),
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 200) {
      showToast("success", "Attendance successfully recorded!");
      return true;
    }
  } catch (error) {
    console.error("Error marking attendance:", error);

    if (axios.isAxiosError(error) && error.response) {
      showToast("error", error.response.data.message || "An error occurred");
    } else {
      showToast("error", "An error occurred while recording attendance.");
    }
  }
};

export const getEventCheck = async (
  eventId: string
): Promise<EventCheckData | false> => {
  try {
    const token = getAuthToken();
    const response = await axios.get<{ data: EventCheckData }>(
      `${backendConnection()}/api/events/check-limit/${eventId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const updateEventSettings = async (
  formData: UpdateSettingsFormData,
  eventId: string
): Promise<boolean> => {
  try {
    const token = getAuthToken();
    const response = await axios.post(
      `${backendConnection()}/api/events/update-settings/${eventId}`,
      formData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.status === 200;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getEligibleRaffleAttendees = async (
  eventId: string
): Promise<RaffleResponse | AxiosError> => {
  try {
    const token = getAuthToken();
    const response = await axios.get<RaffleResponse>(
      `${backendConnection()}/api/events/raffle/${eventId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching eligible attendees:", error);
    return error as AxiosError;
  }
};

export const getEligibleRaffleAttendeesV2 = async (
  eventId: string,
  params?: RaffleQueryParams
): Promise<GetRafflePoolResponse> => {
  const { data } = await api.get<GetRafflePoolResponse>(
    `${backendConnection()}/api/v2/events/raffle/${eventId}`,
    { params }
  );
  return data;
};

export const drawRaffleWinner = async (
  eventId: string,
  params?: RaffleQueryParams
): Promise<DrawRaffleWinnerResponse> => {
  const { data } = await api.post<DrawRaffleWinnerResponse>(
    `${backendConnection()}/api/v2/events/raffle/${eventId}/draw`,
    undefined,
    { params }
  );
  return data;
};

export const undoRaffleWinner = async (
  eventId: string,
  attendeeId: string
): Promise<{ message: string }> => {
  const { data } = await api.post<{ message: string }>(
    `${backendConnection()}/api/v2/events/raffle/${eventId}/undo/${attendeeId}`
  );
  return data;
};

export const raffleWinner = async (
  eventId: string,
  attendeeId: string,
  attendeeName: string
): Promise<RaffleWinnerResponse | AxiosError> => {
  try {
    const token = getAuthToken();
    const response = await axios.post<RaffleWinnerResponse>(
      `${backendConnection()}/api/events/raffle/winner/${eventId}/${attendeeId}`,
      { attendeeName },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error marking attendee as raffle winner:", error);
    return error as AxiosError;
  }
};

export const removeRaffleAttendee = async (
  eventId: string,
  attendeeId: string,
  attendeeName: string
): Promise<RemoveRaffleResponse | false> => {
  try {
    const token = getAuthToken();
    const response = await axios.put<RemoveRaffleResponse>(
      `${backendConnection()}/api/events/raffle/remove/${eventId}/${attendeeId}`,
      { attendeeName },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error removing attendee from raffle:", error);
    return false;
  }
};

export const addAttendee = async (
  formData: AddAttendeeFormData
): Promise<boolean> => {
  try {
    const token = getAuthToken();
    const response = await axios.post(
      `${backendConnection()}/api/events/add-attendee`,
      formData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    showToast(
      response.status === 200 ? "success" : "error",
      response.data.message
    );
    return response.status === 200;
  } catch (error) {
    console.error("Error adding attendee:", error);
    const errorMessage = axios.isAxiosError(error)
      ? error.response?.data?.message || "Something went wrong"
      : "Something went wrong";
    showToast("error", errorMessage);
    return false;
  }
};

export const addAttendeeV2 = async (
  eventId: string,
  payload: AddAttendeeV2Payload
): Promise<AddAttendeeV2Response | false> => {
  try {
    if (!eventId?.trim()) {
      showToast("error", "Event ID is required");
      return false;
    }

    const response = await api.post<AddAttendeeV2Response>(
      `/api/v2/events/${eventId}/attendees`,
      payload
    );

    if (
      response.data.data.isNewStudent &&
      response.data.data.emailSent === false
    ) {
      showToast("warning", response.data.message);
    } else {
      showToast("success", response.data.message);
    }
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      const message =
        axiosError.response?.data?.message || "Failed to add attendee";
      showToast("error", message);
    } else {
      console.error("Error adding attendee V2:", error);
      showToast("error", "An unexpected error occurred");
    }
    return false;
  }
};

export const getStatistic = async (
  eventId: string
): Promise<StatisticsData | [] | false> => {
  try {
    const token = getAuthToken();
    const response = await axios.get<StatisticsData>(
      `${backendConnection()}/api/events/get-statistics/${eventId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.status === 200 ? response.data : [];
  } catch (error) {
    return handleApiError(error);
  }
};

export const getEventStatisticsV2 = async (
  eventId: string
): Promise<EventStatisticsResponse | false> => {
  try {
    if (!eventId?.trim()) {
      return false;
    }

    const response = await api.get<EventStatisticsResponse>(
      `/api/v2/events/${eventId}/statistics`
    );

    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const removeAttendee = async (
  formData: RemoveAttendeeFormData
): Promise<boolean | AxiosError> => {
  try {
    const token = getAuthToken();
    const response = await axios.post(
      `${backendConnection()}/api/events/remove-attendance`,
      formData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    showToast(
      response.status === 200 ? "success" : "error",
      response.data.message
    );
    return response.status === 200;
  } catch (error) {
    return error as AxiosError;
  }
};

export const removeEvent = async (
  eventId: string
): Promise<boolean | AxiosError> => {
  try {
    const token = getAuthToken();
    const response = await axios.post(
      `${backendConnection()}/api/events/remove-event`,
      { eventId },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    showToast(
      response.status === 200 ? "success" : "error",
      response.data.message
    );
    return response.status === 200;
  } catch (error) {
    return error as AxiosError;
  }
};

// ─── Attendance V2 ───────────────────────────────────────────────────────────

export const markAttendanceV2 = async (
  eventId: string,
  idNumber: string,
  payload: MarkAttendanceV2Payload
): Promise<MarkAttendanceV2Response | false> => {
  try {
    if (!eventId?.trim() || !idNumber?.trim()) {
      showToast("error", "Event ID and Student ID are required");
      return false;
    }

    const response = await api.put<MarkAttendanceV2Response>(
      `/api/v2/events/${eventId}/attendance/${idNumber}`,
      payload
    );

    showToast("success", response.data.message);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      const message =
        axiosError.response?.data?.message || "Failed to mark attendance";
      showToast("error", message);
    } else {
      console.error("Error marking attendance V2:", error);
      showToast("error", "An unexpected error occurred");
    }
    return false;
  }
};

// ─── Edit Attendee V2 ────────────────────────────────────────────────────────

export const getEditableAttendee = async (
  eventId: string,
  idNumber: string
): Promise<EditableAttendeeResponse | false> => {
  try {
    if (!eventId?.trim() || !idNumber?.trim()) {
      return false;
    }

    const response = await api.get<EditableAttendeeResponse>(
      `/api/v2/events/${eventId}/attendees/${idNumber}/editable`
    );

    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const editAttendeeV2 = async (
  eventId: string,
  idNumber: string,
  payload: EditAttendeeV2Payload
): Promise<EditAttendeeV2Response | false> => {
  try {
    if (!eventId?.trim() || !idNumber?.trim()) {
      showToast("error", "Event ID and Student ID are required");
      return false;
    }

    const response = await api.put<EditAttendeeV2Response>(
      `/api/v2/events/${eventId}/attendees/${idNumber}`,
      payload
    );

    showToast("success", response.data.message);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      const message =
        axiosError.response?.data?.message || "Failed to update attendee";
      showToast("error", message);
    } else {
      console.error("Error editing attendee V2:", error);
      showToast("error", "An unexpected error occurred");
    }
    return false;
  }
};

export const changeAttendeePasswordV2 = async (
  eventId: string,
  idNumber: string,
  payload: ChangeAttendeePasswordV2Payload
): Promise<ChangeAttendeePasswordV2Response | false> => {
  try {
    if (!eventId?.trim() || !idNumber?.trim()) {
      showToast("error", "Event ID and Student ID are required");
      return false;
    }

    const response = await api.put<ChangeAttendeePasswordV2Response>(
      `/api/v2/events/${eventId}/attendees/${idNumber}/password`,
      payload
    );

    showToast("success", response.data.message);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      const message =
        axiosError.response?.data?.message || "Failed to change password";
      showToast("error", message);
    } else {
      console.error("Error changing attendee password:", error);
      showToast("error", "An unexpected error occurred");
    }
    return false;
  }
};
