// ==================== DATA MODELS ====================

export interface User {
  id: string;
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  avatar?: string;
  banner?: string;
  discordId?: string;
  createdAt?: string;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  image?: string;
  owner: User | string;
  members: User[];
  wiki?: string;
  githubRepo?: string | null;
  discordServerId?: string;
  discordChannelId?: string;
  discordWebhookUrl?: string;
  taskCounts?: {
    todo: number;
    inprogress: number;
    done: number;
    total: number;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: 'todo' | 'inprogress' | 'done';
  priority: 'low' | 'medium' | 'high';
  project: string;
  assignee?: User | string | any;
  dueDate?: string;
  labels?: string[];
  githubIssueNumber?: number;
  githubIssueUrl?: string;
  createdAt: string;
}

export interface Comment {
  _id: string;
  text: string;
  task: string;
  user: User;
  createdAt: string;
}

export interface Message {
  _id: string;
  text: string;
  channel: string;
  sender: User;
  createdAt: string;
}

export interface Invite {
  _id: string;
  project: Project;
  from: User;
  to: User;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

// ==================== API RESPONSES ====================

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ProjectsResponse {
  projects: Project[];
}

export interface TasksResponse {
  tasks: Task[];
}

export interface StatsResponse {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  totalUsers?: number;
}
