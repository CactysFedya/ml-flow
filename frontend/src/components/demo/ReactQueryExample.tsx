import { useState } from "react";
import { useProjects, useCreateProject, useDeleteProject } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ProjectCreatePayload } from "@/types/workspace";

/**
 * Example component showing how to use React Query hooks
 * This demonstrates:
 * - Reading data with useProjects()
 * - Creating with useCreateProject()
 * - Deleting with useDeleteProject()
 * - Loading and error states
 * - Automatic cache invalidation
 */
export function ReactQueryExample() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<ProjectCreatePayload>({ name: "", description: "" });

  // Fetch projects
  const { data: projects, isLoading, error } = useProjects();

  // Create mutation
  const createProjectMutation = useCreateProject();

  // Delete mutation
  const deleteProjectMutation = useDeleteProject();

  const handleCreate = async () => {
    await createProjectMutation.mutateAsync(formData);
    setFormData({ name: "", description: "" });
    setShowForm(false);
    // Cache automatically invalidates and refetches!
  };

  const handleDelete = async (projectId: number) => {
    if (confirm("Are you sure?")) {
      await deleteProjectMutation.mutateAsync(projectId);
      // Cache automatically invalidates and refetches!
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading projects...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error.message}</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-bold">Projects (React Query Example)</h2>

      {!showForm ? (
        <Button onClick={() => setShowForm(true)}>+ New Project</Button>
      ) : (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <input
              type="text"
              placeholder="Project name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
            />
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="form-input"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleCreate}
                disabled={createProjectMutation.isPending || !formData.name}
              >
                {createProjectMutation.isPending ? "Creating..." : "Create"}
              </Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {projects?.map((project) => (
          <Card key={project.id}>
            <CardContent className="flex items-center justify-between pt-4">
              <div>
                <div className="font-semibold">{project.name}</div>
                <div className="text-sm text-slate-500">{project.description}</div>
              </div>
              <Button
                variant="secondary"
                onClick={() => handleDelete(project.id)}
                disabled={deleteProjectMutation.isPending}
              >
                {deleteProjectMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {projects?.length === 0 && (
        <div className="text-center py-8 text-slate-500">No projects yet</div>
      )}
    </div>
  );
}
