import { JobActionOptions } from "../../jobconfig.interface";

export const actionType = "rabbitmq";

export interface RabbitMQJobActionOptions extends JobActionOptions {
  actionType: typeof actionType;
  exchange: string;
  queue: string;
  key: string;
  queueArguments?: Record<string, unknown>;
}

/**
 * Type guard for RabbitMQJobActionOptions
 */
export function isRabbitMQJobActionOptions(
  options: unknown,
): options is RabbitMQJobActionOptions {
  if (typeof options !== "object" || options === null) {
    return false;
  }

  const opts = options as RabbitMQJobActionOptions;
  return (
    opts.actionType === actionType &&
    typeof opts.exchange === "string" &&
    typeof opts.queue === "string" &&
    typeof opts.key === "string" &&
    (opts.queueArguments === undefined ||
      (typeof opts.queueArguments === "object" &&
        opts.queueArguments !== null &&
        !Array.isArray(opts.queueArguments)))
  );
}
