CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(32) NOT NULL UNIQUE,
  role VARCHAR(32) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  date_of_birth DATE NULL,
  id_card VARCHAR(32) NULL,
  address VARCHAR(255) NULL,
  avatar_url VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_users_role_created (role, created_at),
  UNIQUE KEY uq_users_id_card (id_card),
  CONSTRAINT chk_users_role CHECK (role IN ('CANDIDATE', 'HR', 'MANAGEMENT', 'ADMIN'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jobs (
  id VARCHAR(128) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  company_name VARCHAR(255) NOT NULL DEFAULT 'Smart Guard',
  location VARCHAR(255) NOT NULL,
  address VARCHAR(255) NULL,
  employment_type VARCHAR(64) NOT NULL DEFAULT 'Full-time',
  status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  salary_min DECIMAL(12, 2) NULL,
  salary_max DECIMAL(12, 2) NULL,
  salary_currency VARCHAR(8) NOT NULL DEFAULT 'VND',
  slots_filled INT NOT NULL DEFAULT 0,
  slots_total INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_jobs_status_title (status, title),
  KEY idx_jobs_status_updated (status, updated_at),
  CONSTRAINT chk_jobs_status CHECK (status IN ('OPEN', 'CLOSED', 'DRAFT')),
  CONSTRAINT chk_jobs_slots CHECK (slots_filled >= 0 AND slots_total >= 0 AND slots_filled <= slots_total),
  CONSTRAINT chk_jobs_salary_range CHECK (
    salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS applications (
  id VARCHAR(64) PRIMARY KEY,
  candidate_id VARCHAR(64) NOT NULL,
  job_id VARCHAR(128) NOT NULL,
  candidate_full_name VARCHAR(255) NULL,
  candidate_email VARCHAR(255) NULL,
  candidate_phone VARCHAR(32) NULL,
  note TEXT NULL,
  cv_original_name VARCHAR(255) NOT NULL,
  cv_mime_type VARCHAR(128) NOT NULL,
  cv_size INT NOT NULL,
  cv_path VARCHAR(255) NOT NULL,
  health_original_name VARCHAR(255) NULL,
  health_mime_type VARCHAR(128) NULL,
  health_size INT NULL,
  health_path VARCHAR(255) NULL,
  status VARCHAR(64) NOT NULL,
  status_history JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_candidate_job (candidate_id, job_id),
  KEY idx_applications_status_updated (status, updated_at),
  KEY idx_applications_candidate_updated (candidate_id, updated_at),
  KEY idx_applications_job_updated (job_id, updated_at),
  KEY idx_applications_candidate_status (candidate_id, status),
  KEY idx_applications_job_status (job_id, status),
  CONSTRAINT fk_applications_candidate FOREIGN KEY (candidate_id) REFERENCES users(id),
  CONSTRAINT fk_applications_job FOREIGN KEY (job_id) REFERENCES jobs(id),
  CONSTRAINT chk_applications_status CHECK (
    status IN (
      'Under Review',
      'Shortlisted',
      'Rejected',
      'Interview Scheduled',
      'Interviewed',
      'Approved',
      'Final Rejected'
    )
  ),
  CONSTRAINT chk_applications_cv_size CHECK (cv_size >= 0),
  CONSTRAINT chk_applications_health_size CHECK (health_size IS NULL OR health_size >= 0),
  CONSTRAINT chk_applications_status_history CHECK (JSON_VALID(status_history))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS interviews (
  id VARCHAR(64) PRIMARY KEY,
  application_id VARCHAR(64) NOT NULL UNIQUE,
  candidate_id VARCHAR(64) NOT NULL,
  job_id VARCHAR(128) NOT NULL,
  scheduled_start_at DATETIME NULL,
  interview_date VARCHAR(32) NOT NULL,
  interview_time VARCHAR(32) NOT NULL,
  interview_location VARCHAR(255) NOT NULL,
  result VARCHAR(32) NULL,
  comments TEXT NULL,
  scheduled_by VARCHAR(64) NOT NULL,
  evaluated_by VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_interviews_candidate_updated (candidate_id, updated_at),
  KEY idx_interviews_job_updated (job_id, updated_at),
  KEY idx_interviews_scheduled_start (scheduled_start_at),
  KEY idx_interviews_application_updated (application_id, updated_at),
  CONSTRAINT fk_interviews_application FOREIGN KEY (application_id) REFERENCES applications(id),
  CONSTRAINT fk_interviews_candidate FOREIGN KEY (candidate_id) REFERENCES users(id),
  CONSTRAINT fk_interviews_job FOREIGN KEY (job_id) REFERENCES jobs(id),
  CONSTRAINT fk_interviews_scheduled_by FOREIGN KEY (scheduled_by) REFERENCES users(id),
  CONSTRAINT fk_interviews_evaluated_by FOREIGN KEY (evaluated_by) REFERENCES users(id),
  CONSTRAINT chk_interviews_result CHECK (result IS NULL OR result IN ('Pass', 'Fail', 'Pending'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  payload JSON NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME NULL,
  KEY idx_notifications_user_read_created (user_id, is_read, created_at),
  KEY idx_notifications_user_type_created (user_id, type, created_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT chk_notifications_payload CHECK (payload IS NULL OR JSON_VALID(payload)),
  CONSTRAINT chk_notifications_read_state CHECK (
    (is_read = 0 AND read_at IS NULL) OR (is_read = 1)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_threads (
  id VARCHAR(64) PRIMARY KEY,
  candidate_id VARCHAR(64) NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_chat_threads_updated (updated_at),
  CONSTRAINT fk_chat_threads_candidate FOREIGN KEY (candidate_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
