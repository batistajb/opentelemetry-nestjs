import { SetMetadata } from "@nestjs/common";
import { constants } from "../../constants";

export const Span = (name?: string) =>
  SetMetadata(constants.TRACE_METADATA, name);
