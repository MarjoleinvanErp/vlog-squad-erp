export type TaskType =
  | "photo"
  | "video"
  | "text"
  | "multiple_choice"
  | "arrival";
export type SubmissionStatus = "pending" | "approved" | "rejected";
export type IncidentType = "sos" | "inactive" | "out_of_zone";

export interface EventRow {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  start_lat: number | null;
  start_lng: number | null;
  admin_code: string;
  no_go_zones: unknown[];
  active: boolean;
  created_at: string;
}

export interface TeamRow {
  id: string;
  event_id: string;
  name: string;
  code: string;
  color: string;
  team_photo_url: string | null;
  created_at: string;
}

export interface TeamMemberRow {
  id: string;
  team_id: string;
  name: string;
  created_at: string;
}

export interface LocationRow {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  radius_meters: number;
  arrival_points: number;
  bonus_first: number;
  bonus_second: number;
  bonus_third: number;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export interface TaskRow {
  id: string;
  event_id: string;
  location_id: string | null;
  title: string;
  description: string;
  type: TaskType;
  max_points: number;
  options: { choices: string[]; correct: number } | null;
  min_photos: number | null;
  max_photos: number | null;
  min_seconds: number | null;
  max_seconds: number | null;
  requires_approval: boolean;
  sort_order: number;
  created_at: string;
}

export interface SubmissionRow {
  id: string;
  team_id: string;
  task_id: string;
  text_answer: string | null;
  choice_index: number | null;
  photo_urls: string[];
  submitted_at: string;
  status: SubmissionStatus;
  awarded_points: number | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
}

export interface LocationVisitRow {
  id: string;
  team_id: string;
  location_id: string;
  arrived_at: string;
  order_position: number;
  bonus_awarded: number;
}

export interface TeamLocationRow {
  team_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  updated_at: string;
}

export interface IncidentRow {
  id: string;
  team_id: string;
  type: IncidentType;
  lat: number | null;
  lng: number | null;
  created_at: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
}
