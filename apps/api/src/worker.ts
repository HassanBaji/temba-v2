import { run, runMigrations, type Runner } from "graphile-worker";
import { Pool } from "pg";

import { createTaskList, crontab } from "@repo/api/jobs/task-list";

export async function startWorker(options: {
  databaseUrl: string;
  concurrency: number;
}): Promise<{ stop: () => Promise<void> }> {
  const pgPool = new Pool({ connectionString: options.databaseUrl, max: 10 });
  pgPool.on("error", (error) => {
    console.error("Worker pool error", error);
  });

  let runner: Runner | undefined;
  try {
    await runMigrations({ pgPool });
    runner = await run({
      pgPool,
      taskList: createTaskList(),
      concurrency: options.concurrency,
      crontab,
    });
  } catch (error) {
    await pgPool.end();
    throw error;
  }
  console.log(`Worker started (concurrency ${options.concurrency})`);

  return {
    async stop() {
      await runner.stop();
      await pgPool.end();
    },
  };
}
