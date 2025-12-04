-- PostgreSQL Session Store Table
-- Tạo bảng lưu sessions cho connect-pg-simple

CREATE TABLE IF NOT EXISTS "user_sessions" (
  "sid" VARCHAR NOT NULL COLLATE "default",
  "sess" JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL,
  PRIMARY KEY ("sid")
) WITH (OIDS=FALSE);

-- Tạo index để tăng performance
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "user_sessions" ("expire");

-- Comment
COMMENT ON TABLE "user_sessions" IS 'Bảng lưu session data cho Remember Me và user authentication';