import { ModuleMetadata } from "@nestjs/common";
import { OpenTelemetryModuleConfig } from "./open-telemetry-module.config";

export interface OpenTelemetryAsyncOptionModule
  extends Pick<ModuleMetadata, "imports"> {
  useFactory?: (
    ...args: any[]
  ) =>
    | Promise<Partial<OpenTelemetryModuleConfig>>
    | Partial<OpenTelemetryModuleConfig>;
  inject?: any[];
}
