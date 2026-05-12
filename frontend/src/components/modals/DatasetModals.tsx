import { useState } from "react";
import { useCreateDataset, useUpdateDataset } from "@/hooks/useDatasets";
import { Button } from "@/components/ui/button";
import type { DatasetCreatePayload, DatasetItem, DatasetUpdatePayload } from "@/types/workspace";

interface CreateDatasetModalProps {
  projectId?: number;
  onClose: () => void;
}

export function CreateDatasetModal({ projectId, onClose }: CreateDatasetModalProps) {
  const [formData, setFormData] = useState<DatasetCreatePayload>({
    name: "",
    project_id: projectId,
  });

  const createDataset = useCreateDataset();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      alert("Dataset name is required");
      return;
    }

    await createDataset.mutateAsync(formData);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Dataset Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter dataset name"
          className="form-input"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Source Path
        </label>
        <input
          type="text"
          value={formData.source_path ?? ""}
          onChange={(e) => setFormData({ ...formData, source_path: e.target.value })}
          placeholder="Enter source path"
          className="form-input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Format
        </label>
        <select
          value={formData.format ?? "YOLO"}
          onChange={(e) => setFormData({ ...formData, format: e.target.value })}
          className="form-select"
        >
          <option value="YOLO">YOLO</option>
          <option value="COCO">COCO</option>
          <option value="Pascal VOC">Pascal VOC</option>
          <option value="Custom">Custom</option>
        </select>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={createDataset.isPending || !formData.name?.trim()}>
          {createDataset.isPending ? "Creating..." : "Create Dataset"}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface EditDatasetModalProps {
  dataset: DatasetItem;
  onClose: () => void;
}

export function EditDatasetModal({ dataset, onClose }: EditDatasetModalProps) {
  const [formData, setFormData] = useState<DatasetUpdatePayload>({
    name: dataset.name,
  });

  const updateDataset = useUpdateDataset(dataset.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      alert("Dataset name is required");
      return;
    }

    await updateDataset.mutateAsync(formData);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Dataset Name *
        </label>
        <input
          type="text"
          value={formData.name ?? ""}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter dataset name"
          className="form-input"
          autoFocus
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={updateDataset.isPending || !formData.name?.trim()}>
          {updateDataset.isPending ? "Updating..." : "Update Dataset"}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
