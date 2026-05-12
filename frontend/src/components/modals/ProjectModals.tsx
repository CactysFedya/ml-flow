import { useState } from "react";
import { useCreateProject, useUpdateProject } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import type { ProjectCreatePayload, ProjectSummary } from "@/types/workspace";

interface CreateProjectModalProps {
  onClose: () => void;
}

export function CreateProjectModal({ onClose }: CreateProjectModalProps) {
  const [formData, setFormData] = useState<ProjectCreatePayload>({
    name: "",
    description: "",
  });

  const createProject = useCreateProject();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Project name is required");
      return;
    }

    await createProject.mutateAsync(formData);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Project Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter project name"
          className="form-input"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Enter project description"
          className="form-input min-h-[100px]"
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={createProject.isPending || !formData.name.trim()}>
          {createProject.isPending ? "Creating..." : "Create Project"}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface EditProjectModalProps {
  project: ProjectSummary;
  onClose: () => void;
}

export function EditProjectModal({ project, onClose }: EditProjectModalProps) {
  const [formData, setFormData] = useState<ProjectCreatePayload>({
    name: project.name,
    description: project.description,
  });

  const updateProject = useUpdateProject(project.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Project name is required");
      return;
    }

    await updateProject.mutateAsync(formData);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Project Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter project name"
          className="form-input"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Enter project description"
          className="form-input min-h-[100px]"
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={updateProject.isPending || !formData.name.trim()}>
          {updateProject.isPending ? "Updating..." : "Update Project"}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
