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
      databasePath?: string;
    }
  | {
      kind: "web";
      message: string;
    }
  | {
      kind: "error";
      message: string;
    };

type DatabaseStatus = {
  migrationCount: number;
  path: string;
};

function formatMigrationCount(count: number): string {
  return count === 1 ? "1 migracion inicial" : `${count} migraciones iniciales`;
}

export async function checkNativeConnection(): Promise<NativeConnectionStatus> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return {
      kind: "web",
      message: "Modo web: Tauri no esta disponible."
    };
  }

  try {
    await invoke<string>("health_check");
    const database = await invoke<DatabaseStatus>("database_status");

    return {
      kind: "connected",
      databasePath: database.path,
      message: `Base de datos lista (${formatMigrationCount(database.migrationCount)}).`
    };
  } catch {
    return {
      kind: "error",
      message: "No se pudo conectar con la base de datos local."
    };
  }
}
