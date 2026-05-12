import { PlusCircle, Trash2, Edit } from "lucide-react";
import { useProjects, useDeleteProject } from "@/hooks";
import { useModal } from "@/hooks/useModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CreateProjectModal, EditProjectModal } from "@/components/modals/ProjectModals";
import { DeleteConfirmModal } from "@/components/modals/DeleteConfirmModal";

/**
 * Example component showing how to use Modal System with React Query
 * Demonstrates:
 * - Opening create modal
 * - Opening edit modal
 * - Opening delete confirmation
 * - Automatic closing after action
 * - Loading states
 */
export function ModalSystemExample() {
  const { data: projects, isLoading } = useProjects();
  const deleteProject = useDeleteProject();
  const { openModal } = useModal();

  const handleCreateClick = () => {
    openModal({
      id: `create-project-${Date.now()}`,
      title: "Create New Project",
      component: CreateProjectModal,
      props: {},
    });
  };

  const handleEditClick = (projectId: number) => {
    const project = projects?.find((p) => p.id === projectId);
    if (!project) return;

    openModal({
      id: `edit-project-${projectId}`,
      title: "Edit Project",
      component: EditProjectModal,
      props: { project },
    });
  };

  const handleDeleteClick = (projectId: number) => {
    const project = projects?.find((p) => p.id === projectId);
    if (!project) return;

    openModal({
      id: `delete-project-${projectId}`,
      title: "Delete Project",
      component: DeleteConfirmModal,
      props: {
        title: "Delete Project?",
        message: "Are you sure you want to delete this project?",
        itemName: project.name,
        isLoading: deleteProject.isPending,
        onConfirm: () => deleteProject.mutateAsync(projectId),
      },
    });
  };

  if (isLoading) {
    return <div className="p-4">Loading projects...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Projects (Modal System Example)</h2>
        <Button onClick={handleCreateClick} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          New Project
        </Button>
      </div>

      <div className="grid gap-3">
        {projects?.map((project) => (
          <Card key={project.id}>
            <CardContent className="flex items-center justify-between pt-4">
              <div>
                <div className="font-semibold">{project.name}</div>
                <div className="text-sm text-slate-500">{project.description}</div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => handleEditClick(project.id)}
                  className="gap-2 text-sm"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleDeleteClick(project.id)}
                  className="gap-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {projects?.length === 0 && (
        <div className="text-center py-8 text-slate-500">No projects yet. Create one to get started!</div>
      )}
    </div>
  );
}
