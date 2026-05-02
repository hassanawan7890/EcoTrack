export type Role = 'admin' | 'crew' | 'staff' | 'citizen'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
  is_active: boolean
  created_at: string
  last_login: string | null
  avatar_url: string | null
}

export interface Zone {
  id: number
  name: string
  description: string | null
  coordinates?: [number, number][] | null
  created_at: string
}

export interface Vehicle {
  id: number
  plate_number: string
  type: 'Garbage Truck' | 'Recycling Truck' | 'Organic Truck'
  capacity_tons: number
}

export interface Route {
  id: number
  name: string
  zone_id: number
  zone?: Zone
  crew_id: string | null
  crew?: Profile
  schedule_day: string
  path_coordinates?: [number, number][] | null
  is_active: boolean
}

export interface PickupRequest {
  id: number
  citizen_id: string
  citizen?: Profile
  route_id: number | null
  route?: Route
  type: 'Regular' | 'Bulk' | 'Special'
  status: 'Pending' | 'Scheduled' | 'Completed' | 'Missed' | 'Cancelled'
  scheduled_date: string
  address: string
  notes: string | null
  created_at: string
}

export interface PickupStatusEntry {
  id: number
  pickup_id: number
  status: string
  changed_by: string
  changed_at: string
  notes: string | null
}

export interface Complaint {
  id: number
  citizen_id: string
  citizen?: Profile
  pickup_id: number | null
  pickup?: PickupRequest | null
  subject: string
  description: string
  status: 'Open' | 'In Progress' | 'Resolved'
  resolution_notes: string | null
  created_at: string
  resolved_at: string | null
}

export interface IssueReport {
  id: number
  crew_id: string
  crew?: Profile
  pickup_id: number | null
  type: 'Access Blocked' | 'Container Full' | 'Wrong Address' | 'Hazardous Material' | 'Other'
  description: string
  photo_url: string | null
  status: 'Open' | 'Reviewed' | 'Closed'
  admin_notes: string | null
  created_at: string
}

export interface RecyclingCenter {
  id: number
  name: string
  address: string
  manager_id: string | null
  is_active: boolean
}

export interface LoadData {
  id: number
  staff_id: string
  staff?: Profile
  center_id: number
  center?: RecyclingCenter
  crew_id: string
  crew?: Profile
  gross_weight: number
  tare_weight: number
  net_weight: number
  load_date: string
  created_at: string
}

export interface MaterialCategory {
  id: number
  name: string
}

export interface LoadMaterial {
  id: number
  load_id: number
  material_id: number
  material?: MaterialCategory
  weight_kg: number
}

export interface ContaminationReport {
  id: number
  load_id: number
  load?: LoadData
  staff_id: string
  staff?: Profile
  percent: number
  type: string
  notes: string | null
  photo_url: string | null
  created_at: string
}

export interface Notification {
  id: number
  user_id: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export interface DashboardStats {
  totalPickups: number
  completedPickups: number
  pendingPickups: number
  missedPickups: number
  openComplaints: number
  resolvedComplaints: number
  avgContamination: number
  activeUsers: number
}
