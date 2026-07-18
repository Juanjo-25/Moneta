import { afterEach, describe, expect, it, vi } from "vitest";
import { checkNativeConnection } from "./tauri";

function setTauriInvoke(
  invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown>
) {
  Object.defineProperty(window, "__TAURI__", {
    configurable: true,
    value: invoke ? { core: { invoke } } : undefined
  });
}

describe("checkNativeConnection", () => {
  afterEach(() => {
    setTauriInvoke();
  });

  it("reports web mode when Tauri is not available", async () => {
    setTauriInvoke();

    await expect(checkNativeConnection()).resolves.toEqual({
      kind: "web",
      message: "Modo web: Tauri no esta disponible."
    });
  });

  it("calls the health check command through Tauri", async () => {
    const invoke = vi.fn().mockImplementation((command: string) => {
      if (command === "health_check") {
        return Promise.resolve("Moneta Tauri conectado");
      }

      return Promise.resolve({
        migrationCount: 1,
        path: "/tmp/moneta.sqlite3"
      });
    });
    setTauriInvoke(invoke);

    await expect(checkNativeConnection()).resolves.toEqual({
      databasePath: "/tmp/moneta.sqlite3",
      kind: "connected",
      message: "Base de datos lista (1 migracion inicial)."
    });
    expect(invoke).toHaveBeenCalledWith("health_check");
    expect(invoke).toHaveBeenCalledWith("database_status");
  });

  it("formats several database migrations", async () => {
    const invoke = vi.fn().mockImplementation((command: string) => {
      if (command === "health_check") {
        return Promise.resolve("Moneta Tauri conectado");
      }

      return Promise.resolve({
        migrationCount: 2,
        path: "/tmp/moneta.sqlite3"
      });
    });
    setTauriInvoke(invoke);

    await expect(checkNativeConnection()).resolves.toEqual({
      databasePath: "/tmp/moneta.sqlite3",
      kind: "connected",
      message: "Base de datos lista (2 migraciones iniciales)."
    });
  });

  it("reports an error when the native database check fails", async () => {
    setTauriInvoke(vi.fn().mockRejectedValue(new Error("native failed")));

    await expect(checkNativeConnection()).resolves.toEqual({
      kind: "error",
      message: "No se pudo conectar con la base de datos local."
    });
  });
});
