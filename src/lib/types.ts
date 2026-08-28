export type TaskOrigin = 'personal' | 'requested';
export type TaskStatus = 'open' | 'completed' | 'cancelled';

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  family_id: string | null;
  creator_id: string;
  assignee_id: string;
  title: string;
  notes: string | null;
  due_at: string | null;
  origin: TaskOrigin;
  status: TaskStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NewTaskInput = {
  title: string;
  notes?: string | null;
  due_at?: string | null;
};

export type UpdateTaskInput = {
  title?: string;
  notes?: string | null;
  due_at?: string | null;
};
