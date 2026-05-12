import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSettings,
  updateSetting,
  getPipelines,
  getModels,
  getTrainingRuns,
  createTrainingRun,
  deleteTrainingRun,
  createPipeline,
  deleteModel,
  deletePipeline,
} from "./api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonOk(data: unknown) {
  return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
}

function jsonCreated(data: unknown) {
  return new Response(JSON.stringify(data), { status: 201, headers: { "Content-Type": "application/json" } });
}

function noContent() {
  return new Response(null, { status: 204 });
}

function jsonError(status: number, detail: string) {
  return new Response(JSON.stringify({ detail }), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("getSettings", () => {
  it("fetches all settings", async () => {
    const data = [{ key: "dark_mode", value: "false", category: "features" }];
    mockFetch.mockResolvedValueOnce(jsonOk(data));
    const result = await getSettings();
    expect(result).toEqual(data);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/settings"));
  });

  it("filters by category", async () => {
    mockFetch.mockResolvedValueOnce(jsonOk([]));
    await getSettings("general");
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("category=general"));
  });
});

describe("updateSetting", () => {
  it("sends PUT with value", async () => {
    const updated = { key: "dark_mode", value: "true", category: "features" };
    mockFetch.mockResolvedValueOnce(jsonOk(updated));
    const result = await updateSetting("dark_mode", "true");
    expect(result).toEqual(updated);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/settings/dark_mode"),
      expect.objectContaining({ method: "PUT" }),
    );
  });
});

describe("getTrainingRuns", () => {
  it("fetches all runs", async () => {
    mockFetch.mockResolvedValueOnce(jsonOk([]));
    const result = await getTrainingRuns();
    expect(result).toEqual([]);
  });

  it("filters by project_id", async () => {
    mockFetch.mockResolvedValueOnce(jsonOk([]));
    await getTrainingRuns(5);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("project_id=5"));
  });
});

describe("createTrainingRun", () => {
  it("sends POST with payload", async () => {
    const run = { id: 1, name: "Test", status: "Running" };
    mockFetch.mockResolvedValueOnce(jsonOk(run));
    const result = await createTrainingRun({ name: "Test", epochs: 10 });
    expect(result).toEqual(run);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/training"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("deleteTrainingRun", () => {
  it("sends DELETE", async () => {
    mockFetch.mockResolvedValueOnce(noContent());
    await deleteTrainingRun(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/training/1"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("throws on error", async () => {
    mockFetch.mockResolvedValueOnce(jsonError(404, "Not found"));
    await expect(deleteTrainingRun(999)).rejects.toThrow("Not found");
  });
});

describe("getPipelines", () => {
  it("fetches all pipelines", async () => {
    mockFetch.mockResolvedValueOnce(jsonOk([]));
    const result = await getPipelines();
    expect(result).toEqual([]);
  });
});

describe("createPipeline", () => {
  it("sends POST with payload", async () => {
    const pipeline = { id: 1, name: "P1", status: "Idle" };
    mockFetch.mockResolvedValueOnce(jsonOk(pipeline));
    const result = await createPipeline({ name: "P1" });
    expect(result).toEqual(pipeline);
  });
});

describe("getModels", () => {
  it("fetches all models", async () => {
    mockFetch.mockResolvedValueOnce(jsonOk([]));
    const result = await getModels();
    expect(result).toEqual([]);
  });
});

describe("deleteModel", () => {
  it("sends DELETE", async () => {
    mockFetch.mockResolvedValueOnce(noContent());
    await deleteModel(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/models/1"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

describe("deletePipeline", () => {
  it("sends DELETE", async () => {
    mockFetch.mockResolvedValueOnce(noContent());
    await deletePipeline(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/pipelines/1"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("throws on error", async () => {
    mockFetch.mockResolvedValueOnce(jsonError(404, "Pipeline not found"));
    await expect(deletePipeline(999)).rejects.toThrow("Pipeline not found");
  });
});
