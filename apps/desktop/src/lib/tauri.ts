type TauriCore = {
  invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
};

declare global {
  interface Window {
    __TAURI__?: {
      core?: TauriCore;
    };
  }
}

export type NativeConnectionStatus =
  | {
      kind: "connected";
      message: string;
    }
  | {
      kind: "web";
      message: string;
    }
  | {
      kind: "error";
      message: string;
    };

export async function checkNativeConnection(): Promise<NativeConnectionStatus> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return {
      kind: "web",
      message: "Modo web: Tauri no esta disponible."
    };
  }

  try {
    const message = await invoke<string>("health_check");

    return {
      kind: "connected",
      message
    };
  } catch {
    return {
      kind: "error",
      message: "No se pudo conectar con Tauri."
    };
  }
}
