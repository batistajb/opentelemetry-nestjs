import { DynamicModule } from "@nestjs/common";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { TraceService } from "./trace/trace.service";
import { constants } from "./constants";
import {
  OpenTelemetryModuleConfig,
  OpenTelemetryModuleDefaultConfig,
} from "./open-telemetry-module.config";
import { FactoryProvider } from "@nestjs/common/interfaces/modules/provider.interface";
import { OpenTelemetryService } from "./open-telemetry.service";
import { OpenTelemetryAsyncOptionModule } from "./open-telemetry-async-option.module";
import { DecoratorInjector } from "./trace/injectors/decorator.injector";
import { ModuleRef } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { Tracer } from "@opentelemetry/sdk-trace-base";

export class OpenTelemetryModule {
  static async forRoot(
    configuration: Partial<OpenTelemetryModuleConfig> = {}
  ): Promise<DynamicModule> {
    configuration = { ...OpenTelemetryModuleDefaultConfig, ...configuration };
    const injectors = configuration?.traceAutoInjectors ?? [];
    return {
      global: true,
      module: OpenTelemetryModule,
      imports: [EventEmitterModule.forRoot()],
      providers: [
        ...injectors,
        TraceService,
        OpenTelemetryService,
        DecoratorInjector,
        this.buildProvider(configuration),
        this.buildInjectors(configuration),
        this.buildTracer(),
        {
          provide: constants.SDK_CONFIG,
          useValue: configuration,
        },
      ],
      exports: [TraceService, Tracer],
    };
  }

  private static buildProvider(
    configuration?: Partial<OpenTelemetryModuleConfig>
  ): FactoryProvider {
    return {
      provide: constants.SDK,
      useFactory: async () => {
        const sdk = new NodeSDK(configuration);
        await sdk.start();
        return sdk;
      },
    };
  }

  private static buildInjectors(
    configuration?: Partial<OpenTelemetryModuleConfig>
  ): FactoryProvider {
    const injectors = configuration?.traceAutoInjectors ?? [];
    return {
      provide: constants.SDK_INJECTORS,
      useFactory: async (...injectors) => {
        for await (const injector of injectors) {
          if (injector["inject"]) await injector.inject();
        }
      },
      inject: [
        DecoratorInjector,
        // eslint-disable-next-line @typescript-eslint/ban-types
        ...(injectors as Function[]),
      ],
    };
  }

  static async forRootAsync(
    configuration: OpenTelemetryAsyncOptionModule = {}
  ): Promise<DynamicModule> {
    return {
      global: true,
      module: OpenTelemetryModule,
      imports: [...configuration?.imports, EventEmitterModule.forRoot()],
      providers: [
        TraceService,
        OpenTelemetryService,
        this.buildAsyncProvider(),
        this.buildAsyncInjectors(),
        this.buildTracer(),
        {
          provide: constants.SDK_CONFIG,
          useFactory: configuration.useFactory,
          inject: configuration.inject,
        },
      ],
      exports: [TraceService, Tracer],
    };
  }

  private static buildAsyncProvider(): FactoryProvider {
    return {
      provide: constants.SDK,
      useFactory: async (config) => {
        config = { ...OpenTelemetryModuleDefaultConfig, ...config };
        const sdk = new NodeSDK(config);
        await sdk.start();
        return sdk;
      },
      inject: [constants.SDK_CONFIG],
    };
  }

  private static buildAsyncInjectors(): FactoryProvider {
    return {
      provide: constants.SDK_INJECTORS,
      useFactory: async (config, moduleRef: ModuleRef) => {
        config = { ...OpenTelemetryModuleDefaultConfig, ...config };
        const injectors =
          config.traceAutoInjectors ??
          OpenTelemetryModuleDefaultConfig.traceAutoInjectors;

        const decoratorInjector = await moduleRef.create(DecoratorInjector);
        await decoratorInjector.inject();

        for await (const injector of injectors) {
          const created = await moduleRef.create(injector);
          if (created["inject"]) await created.inject();
        }

        return {};
      },
      inject: [constants.SDK_CONFIG, ModuleRef],
    };
  }

  private static buildTracer() {
    return {
      provide: Tracer,
      useFactory: (traceService: TraceService) => traceService.getTracer(),
      inject: [TraceService],
    };
  }
}
