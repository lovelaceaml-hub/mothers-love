import type { TransactionSql } from "postgres";
import { getPublicDisplayClient, retirePublicDisplayClient } from "./public-display-client";

export type GuardedRead<T> = { value: T; error: null } | { value: null; error: Error };

type GuardedReadOptions = {
  signal?: AbortSignal;
  /** Wall-clock limit for the whole read. Past it the client is retired and the read fails closed. */
  deadlineMs: number;
  /** Color Polish reads its snapshot in a repeatable-read, read-write transaction. */
  repeatableReadWrite?: boolean;
};

/**
 * One bounded read on the TV's own database client: a transaction with a 5 second statement
 * timeout, abort checks before each step, and a wall deadline that retires the client so a
 * stuck connection can never hold a public route open. Every TV read goes through here.
 */
export async function guardedPublicDisplayRead<T>(
  options: GuardedReadOptions,
  read: (transaction: TransactionSql) => Promise<T>,
): Promise<GuardedRead<T>> {
  const { signal, deadlineMs, repeatableReadWrite = false } = options;
  if (signal?.aborted) return { value: null, error: new Error("REQUEST_ABORTED") };
  const client = getPublicDisplayClient();
  if (!client) return { value: null, error: new Error("UNAVAILABLE") };

  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  let completed: { value: T } | null = null;
  const operation: Promise<T> = Promise.resolve()
    .then(() => client.begin(repeatableReadWrite ? "read write" : "read only", async (transaction) => {
      if (signal?.aborted) throw new Error("REQUEST_ABORTED");
      await transaction`set local statement_timeout = '5000ms'`;
      if (repeatableReadWrite) await transaction`set transaction isolation level repeatable read`;
      if (signal?.aborted) throw new Error("REQUEST_ABORTED");
      completed = { value: await read(transaction) };
    }))
    .then(() => {
      if (!completed) throw new Error("DATABASE_ERROR");
      return completed.value;
    });
  void operation.then(() => undefined, () => undefined);

  const deadline = new Promise<never>((_, reject) => {
    deadlineTimer = setTimeout(() => {
      retirePublicDisplayClient(client);
      reject(new Error("DATABASE_TIMEOUT"));
    }, deadlineMs);
  });

  try {
    return { value: await Promise.race([operation, deadline]), error: null };
  } catch (error) {
    return { value: null, error: error instanceof Error ? error : new Error("DATABASE_ERROR") };
  } finally {
    if (deadlineTimer !== undefined) clearTimeout(deadlineTimer);
  }
}
