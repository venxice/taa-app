// Apply pending production migrations only when the existing database matches
// the checked-in baseline. This supports databases created before Prisma
// migration history was introduced without accidentally recreating live tables.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');

require('dotenv').config();

const baselineName = '20261030000000_baseline';
const baselineSqlPath = path.join(
  process.cwd(),
  'prisma',
  'migrations',
  baselineName,
  'migration.sql'
);
const prismaCli = path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');

function runPrisma(args) {
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result.status === 0;
}

function baselineSchema(sql) {
  const tables = new Map();
  const tablePattern = /CREATE TABLE `([^`]+)` \(([\s\S]*?)\) DEFAULT/g;
  for (const match of sql.matchAll(tablePattern)) {
    const [, tableName, body] = match;
    const columns = [...body.matchAll(/^\s+`([^`]+)`\s+/gm)].map((column) => column[1]);
    tables.set(tableName, new Set(columns));
  }
  return tables;
}

async function main() {
  if (!fs.existsSync(baselineSqlPath)) {
    console.error('Production migration check skipped: baseline migration is missing.');
    return;
  }

  const prisma = new PrismaClient();
  try {
    const tableRows = await prisma.$queryRawUnsafe(
      'SELECT TABLE_NAME AS tableName FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()'
    );
    const databaseTables = new Set(tableRows.map((row) => row.tableName));
    const expected = baselineSchema(fs.readFileSync(baselineSqlPath, 'utf8'));

    if (expected.size === 0) {
      console.error('Production migration check skipped: baseline schema could not be parsed.');
      return;
    }

    const missingTables = [...expected.keys()].filter((name) => !databaseTables.has(name));
    if (databaseTables.size > 0 && missingTables.length > 0) {
      console.error(
        `Production migrations skipped: database does not match baseline (missing tables: ${missingTables.join(', ')}).`
      );
      return;
    }

    if (databaseTables.size > 0) {
      const columnRows = await prisma.$queryRawUnsafe(
        'SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()'
      );
      const databaseColumns = new Map();
      for (const row of columnRows) {
        if (!databaseColumns.has(row.tableName)) databaseColumns.set(row.tableName, new Set());
        databaseColumns.get(row.tableName).add(row.columnName);
      }

      const missingColumns = [];
      for (const [table, columns] of expected) {
        for (const column of columns) {
          if (!databaseColumns.get(table)?.has(column)) missingColumns.push(`${table}.${column}`);
        }
      }
      if (missingColumns.length > 0) {
        console.error(
          `Production migrations skipped: database does not match baseline (missing columns: ${missingColumns.join(', ')}).`
        );
        return;
      }
    }

    let migrationRows = [];
    if (databaseTables.has('_prisma_migrations')) {
      migrationRows = await prisma.$queryRawUnsafe(
        'SELECT migration_name AS migrationName, finished_at AS finishedAt, rolled_back_at AS rolledBackAt FROM _prisma_migrations'
      );
    }

    const baselineApplied = migrationRows.some(
      (row) => row.migrationName === baselineName && row.finishedAt && !row.rolledBackAt
    );
    if (!baselineApplied && databaseTables.size > 0) {
      console.log('Existing database matches the schema baseline; recording baseline migration history.');
      if (!runPrisma(['migrate', 'resolve', '--applied', baselineName, '--schema', 'prisma/schema.prisma'])) {
        console.error('Could not record the baseline migration; pending migrations were not run.');
        return;
      }
    }

    const sessionMigration = '20261031000000_sessions_and_payment_reference_history';
    const sessionMigrationApplied = migrationRows.some(
      (row) => row.migrationName === sessionMigration && row.finishedAt && !row.rolledBackAt
    );
    if (!sessionMigrationApplied && databaseTables.size > 0) {
      const userColumns = databaseTables.has('User')
        ? await prisma.$queryRawUnsafe(
            "SELECT COLUMN_NAME AS columnName FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'User' AND COLUMN_NAME = 'tokenVersion'"
          )
        : [];
      if (userColumns.length > 0 || databaseTables.has('PaymentReference')) {
        console.error(
          'Production migrations skipped: session/payment schema is partially present; manual reconciliation is required.'
        );
        return;
      }
    }

    console.log('Applying pending production migrations.');
    if (!runPrisma(['migrate', 'deploy', '--schema', 'prisma/schema.prisma'])) {
      console.error('Pending production migrations did not complete; application startup will continue.');
    }
  } catch (error) {
    console.error('Production migration check failed; application startup will continue.', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Production migration preparation failed; application startup will continue.', error);
});
