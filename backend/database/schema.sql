CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(32) NOT NULL UNIQUE,
  role VARCHAR(32) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id VARCHAR(128) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255) NOT NULL,
  slots_filled INT NOT NULL DEFAULT 0,
  slots_total INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS applications (
  id VARCHAR(64) PRIMARY KEY,
  candidate_id VARCHAR(64) NOT NULL,
  job_id VARCHAR(128) NOT NULL,
  cv_original_name VARCHAR(255) NOT NULL,
  cv_mime_type VARCHAR(128) NOT NULL,
  cv_size INT NOT NULL,
  cv_path VARCHAR(255) NOT NULL,
  status VARCHAR(64) NOT NULL,
  status_history JSON NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_candidate_job (candidate_id, job_id),
  CONSTRAINT fk_applications_candidate FOREIGN KEY (candidate_id) REFERENCES users(id),
  CONSTRAINT fk_applications_job FOREIGN KEY (job_id) REFERENCES jobs(id)
);

CREATE TABLE IF NOT EXISTS interviews (
  id VARCHAR(64) PRIMARY KEY,
  application_id VARCHAR(64) NOT NULL UNIQUE,
  candidate_id VARCHAR(64) NOT NULL,
  job_id VARCHAR(128) NOT NULL,
  interview_date VARCHAR(32) NOT NULL,
  interview_time VARCHAR(32) NOT NULL,
  interview_location VARCHAR(255) NOT NULL,
  result VARCHAR(32) NULL,
  comments TEXT NULL,
  scheduled_by VARCHAR(64) NOT NULL,
  evaluated_by VARCHAR(64) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_interviews_application FOREIGN KEY (application_id) REFERENCES applications(id),
  CONSTRAINT fk_interviews_candidate FOREIGN KEY (candidate_id) REFERENCES users(id),
  CONSTRAINT fk_interviews_job FOREIGN KEY (job_id) REFERENCES jobs(id)
);
