"use client";

import { useState } from "react";
import { Camera, FolderKanban } from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";

export default function CreateProjectModal() {
  const { isCreateModalOpen, setCreateModalOpen, createProject } = useProjectStore();
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newImage, setNewImage] = useState("");

  if (!isCreateModalOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert("Image size should be less than 2MB");
    const reader = new FileReader();
    reader.onloadend = () => setNewImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await createProject({ name: newName, description: newDesc, image: newImage });
    setNewName("");
    setNewDesc("");
    setNewImage("");
    setCreateModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white/95 dark:bg-[#14112c]/95 backdrop-blur-2xl border-2 border-transparent rounded-md p-6 shadow-sm text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-200 animate-border-pulse">
        <h3 className="text-lg font-bold mb-5 text-slate-800 dark:text-slate-100">Create New Project</h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Project Icon / DP
            </label>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-md border-2 border-dashed border-indigo-500/30 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-white/5 relative group cursor-pointer">
                {newImage ? (
                  <img src={newImage} alt="Project DP" className="w-full h-full object-cover" />
                ) : (
                  <FolderKanban className="w-6 h-6 text-slate-400" />
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-5 h-5 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <p>Upload a project picture</p>
                <p>Max size: 2MB</p>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Project Name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="E.g., Mobile App Redesign"
              required
              className="w-full px-4 py-2.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Description (optional)
            </label>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={3}
              placeholder="Brief description..."
              className="w-full px-4 py-2.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="flex-1 py-2.5 rounded-md border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 hover:-translate-y-0.5 active:scale-97 text-sm font-medium text-slate-600 dark:text-slate-300 transition-all duration-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-550 hover:-translate-y-0.5 active:scale-97 text-white text-sm font-semibold shadow-sm shadow-indigo-600/15 transition-all duration-200 cursor-pointer"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
