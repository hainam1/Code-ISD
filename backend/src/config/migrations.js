import { readFile } from 'node:fs/promises';

async function hasColumn(connection, tableName, columnName) {
  const [rows] = await connection.query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  );

  return rows.length > 0;
}

async function hasIndex(connection, tableName, indexName) {
  const [rows] = await connection.query(
    `SELECT INDEX_NAME
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?
     LIMIT 1`,
    [tableName, indexName]
  );

  return rows.length > 0;
}

async function hasConstraint(connection, tableName, constraintName) {
  const [rows] = await connection.query(
    `SELECT CONSTRAINT_NAME
     FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = ?
     LIMIT 1`,
    [tableName, constraintName]
  );

  return rows.length > 0;
}

async function ensureColumn(connection, tableName, columnName, definition) {
  if (await hasColumn(connection, tableName, columnName)) {
    return;
  }

  await connection.query(
    `ALTER TABLE \`${tableName}\`
     ADD COLUMN \`${columnName}\` ${definition}`
  );
}

async function ensureIndex(connection, tableName, indexName, definition) {
  if (await hasIndex(connection, tableName, indexName)) {
    return;
  }

  await connection.query(
    `ALTER TABLE \`${tableName}\`
     ADD INDEX \`${indexName}\` ${definition}`
  );
}

async function replaceCheckConstraint(connection, tableName, constraintName, expression) {
  if (await hasConstraint(connection, tableName, constraintName)) {
    await connection.query(
      `ALTER TABLE \`${tableName}\`
       DROP CHECK \`${constraintName}\``
    );
  }

  await connection.query(
    `ALTER TABLE \`${tableName}\`
     ADD CONSTRAINT \`${constraintName}\` CHECK (${expression})`
  );
}

async function backfillInterviewSchedule(connection) {
  const [rows] = await connection.query(
    `SELECT id, interview_date, interview_time
     FROM interviews
     WHERE scheduled_start_at IS NULL`
  );

  for (const row of rows) {
    const hasValidDate = /^\d{4}-\d{2}-\d{2}$/.test(String(row.interview_date || ''));
    const hasValidTime = /^\d{2}:\d{2}(:\d{2})?$/.test(String(row.interview_time || ''));

    if (!hasValidDate || !hasValidTime) {
      continue;
    }

    const normalizedTime = String(row.interview_time).length === 5
      ? `${row.interview_time}:00`
      : row.interview_time;

    await connection.query(
      `UPDATE interviews
       SET scheduled_start_at = ?
       WHERE id = ?`,
      [`${row.interview_date} ${normalizedTime}`, row.id]
    );
  }
}

const migrations = [
  {
    id: '001_initial_schema',
    async up(connection, context) {
      const schemaSql = await readFile(context.schemaFile, 'utf8');
      await connection.query(schemaSql);
    }
  },
  {
    id: '002_schema_hardening',
    async up(connection) {
      await connection.query(
        `ALTER TABLE users
         MODIFY role VARCHAR(32) NOT NULL`
      );
      await replaceCheckConstraint(
        connection,
        'users',
        'chk_users_role',
        "role IN ('CANDIDATE', 'HR', 'MANAGEMENT', 'ADMIN')"
      );

      await ensureIndex(connection, 'users', 'idx_users_role_created', '(role, created_at)');
      await ensureIndex(connection, 'jobs', 'idx_jobs_status_updated', '(status, updated_at)');
      await ensureIndex(connection, 'applications', 'idx_applications_candidate_status', '(candidate_id, status)');
      await ensureIndex(connection, 'applications', 'idx_applications_job_status', '(job_id, status)');
      await ensureIndex(connection, 'notifications', 'idx_notifications_user_type_created', '(user_id, type, created_at)');

      await ensureColumn(connection, 'interviews', 'scheduled_start_at', 'DATETIME NULL AFTER job_id');
      await backfillInterviewSchedule(connection);
      await ensureIndex(connection, 'interviews', 'idx_interviews_scheduled_start', '(scheduled_start_at)');
      await ensureIndex(connection, 'interviews', 'idx_interviews_application_updated', '(application_id, updated_at)');
    }
  },
  {
    id: '003_chat_schema',
    async up(connection) {
      await connection.query(
        `CREATE TABLE IF NOT EXISTS chat_threads (
          id VARCHAR(64) PRIMARY KEY,
          candidate_id VARCHAR(64) NOT NULL UNIQUE,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          KEY idx_chat_threads_updated (updated_at),
          CONSTRAINT fk_chat_threads_candidate FOREIGN KEY (candidate_id) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      );

      await connection.query(
        `CREATE TABLE IF NOT EXISTS chat_messages (
          id VARCHAR(64) PRIMARY KEY,
          thread_id VARCHAR(64) NOT NULL,
          sender_id VARCHAR(64) NOT NULL,
          receiver_id VARCHAR(64) NOT NULL,
          content TEXT NOT NULL,
          is_read TINYINT(1) NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          read_at DATETIME NULL,
          KEY idx_chat_messages_thread_created (thread_id, created_at),
          KEY idx_chat_messages_receiver_read_created (receiver_id, is_read, created_at),
          CONSTRAINT fk_chat_messages_thread FOREIGN KEY (thread_id) REFERENCES chat_threads(id),
          CONSTRAINT fk_chat_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id),
          CONSTRAINT fk_chat_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users(id),
          CONSTRAINT chk_chat_messages_read_state CHECK (
            (is_read = 0 AND read_at IS NULL) OR (is_read = 1)
          )
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      );
    }
  }
];

export async function runMigrations(pool, context) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(128) PRIMARY KEY,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );

    const [rows] = await connection.query('SELECT id FROM schema_migrations');
    const applied = new Set(rows.map((row) => row.id));

    for (const migration of migrations) {
      if (applied.has(migration.id)) {
        continue;
      }

      await migration.up(connection, context);
      await connection.query('INSERT INTO schema_migrations (id) VALUES (?)', [migration.id]);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
