import { BeforeApplicationShutdown, Inject, Injectable } from "@nestjs/common";
import { constants } from "./constants";
import { NodeSDK } from "@opentelemetry/sdk-node";

@Injectable()
export class OpenTelemetryService implements BeforeApplicationShutdown {
  constructor(@Inject(constants.SDK) private readonly sdk: NodeSDK) {}

  async beforeApplicationShutdown() {
    await this.sdk?.shutdown();
  }
}
