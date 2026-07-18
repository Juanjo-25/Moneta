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
    const invoke = vi.fn().mockResolvedValue("Moneta Tauri conectado");
    setTauriInvoke(invoke);

    await expect(checkNativeConnection()).resolves.toEqual({
      kind: "connected",
      message: "Moneta Tauri conectado"
    });
    expect(invoke).toHaveBeenCalledWith("health_check");
  });

  it("reports an error when the health check fails", async () => {
    setTauriInvoke(vi.fn().mockRejectedValue(new Error("native failed")));

    await expect(checkNativeConnection()).resolves.toEqual({
      kind: "error",
      message: "No se pudo conectar con Tauri."
    });
  });
});
