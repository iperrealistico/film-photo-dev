import { openDB } from "idb";
import type { SavedPreset } from "../domain/types";
import { logDebugEvent } from "../debug/logging";

const DATABASE_NAME = "film-dev-db";
const DATABASE_VERSION = 2;

async function openAppDatabase() {
  return openDB(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains("presets")) {
        database.createObjectStore("presets", { keyPath: "id" });
      }

      if (database.objectStoreNames.contains("batches")) {
        database.deleteObjectStore("batches");
      }
    },
  });
}

export async function listPresets() {
  try {
    const database = await openAppDatabase();
    const presets = await (database.getAll("presets") as Promise<
      SavedPreset[]
    >);
    logDebugEvent({
      category: "storage",
      event: "presets_listed",
      detail: { count: presets.length },
    });
    return presets;
  } catch (error) {
    logDebugEvent({
      level: "error",
      category: "storage",
      event: "presets_list_failed",
      detail: { error },
    });
    throw error;
  }
}

export async function savePreset(preset: SavedPreset) {
  try {
    const database = await openAppDatabase();
    await database.put("presets", preset);
    logDebugEvent({
      category: "storage",
      event: "preset_saved",
      detail: {
        presetId: preset.id,
        recipeId: preset.recipeId,
        name: preset.name,
      },
      recipeId: preset.recipeId,
    });
  } catch (error) {
    logDebugEvent({
      level: "error",
      category: "storage",
      event: "preset_save_failed",
      detail: {
        presetId: preset.id,
        error,
      },
      recipeId: preset.recipeId,
    });
    throw error;
  }
}
