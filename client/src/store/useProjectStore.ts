import { create } from "zustand";
import type { Project, Task } from "@/types";
import { projectApi, taskApi } from "@/lib/api";

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  tasks: Task[];
  isLoading: boolean;

  // Actions
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (data: Record<string, unknown>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  fetchTasks: (projectId: string) => Promise<void>;
  createTask: (data: Record<string, unknown>) => Promise<void>;
  updateTask: (id: string, data: Record<string, unknown>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>()((set) => ({
  projects: [],
  currentProject: null,
  tasks: [],
  isLoading: false,

  fetchProjects: async () => {
    set({ isLoading: true });
    try {
      const res = await projectApi.getAll();
      set({ projects: res.data.projects || [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchProject: async (id) => {
    set({ isLoading: true });
    try {
      const res = await projectApi.getOne(id);
      set({ currentProject: res.data.project || res.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createProject: async (data) => {
    const res = await projectApi.create(data);
    set((state) => ({
      projects: [...state.projects, res.data.project || res.data],
    }));
  },

  deleteProject: async (id) => {
    await projectApi.delete(id);
    set((state) => ({
      projects: state.projects.filter((p) => p._id !== id),
    }));
  },

  fetchTasks: async (projectId) => {
    try {
      const res = await taskApi.getByProject(projectId);
      const tasksData = res.data.tasks;
      if (tasksData && typeof tasksData === "object" && !Array.isArray(tasksData)) {
        const flatTasks = [
          ...(tasksData.todo || []),
          ...(tasksData.inprogress || []),
          ...(tasksData.done || [])
        ];
        set({ tasks: flatTasks });
      } else {
        set({ tasks: Array.isArray(tasksData) ? tasksData : [] });
      }
    } catch {
      set({ tasks: [] });
    }
  },

  createTask: async (data) => {
    const res = await taskApi.create(data);
    const newTask = res.data.task || res.data;
    set((state) => {
      if (state.tasks.some(t => t._id === newTask._id)) return state;
      return { tasks: [...state.tasks, newTask] };
    });
  },

  updateTask: async (id, data) => {
    const res = await taskApi.update(id, data);
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t._id === id ? res.data.task || { ...t, ...data } : t
      ),
    }));
  },

  deleteTask: async (id) => {
    await taskApi.delete(id);
    set((state) => ({ tasks: state.tasks.filter((t) => t._id !== id) }));
  },
}));
