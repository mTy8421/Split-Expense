-- All money is stored as integer satang. Run with npm run db:setup.
CREATE TABLE IF NOT EXISTS users (
 id text PRIMARY KEY, display_name text, email text UNIQUE, auth_provider text,
 auth_subject text, revision integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(auth_provider,auth_subject)
);
CREATE TABLE IF NOT EXISTS groups (
 owner_id text NOT NULL REFERENCES users(id), id text NOT NULL, name text NOT NULL,
 date date NOT NULL, currency char(3) NOT NULL DEFAULT 'THB', position integer NOT NULL,
 PRIMARY KEY(owner_id,id)
);
CREATE TABLE IF NOT EXISTS group_members (
 owner_id text NOT NULL, group_id text NOT NULL, id text NOT NULL, user_id text REFERENCES users(id),
 name text NOT NULL, position integer NOT NULL,
 PRIMARY KEY(owner_id,group_id,id),
 FOREIGN KEY(owner_id,group_id) REFERENCES groups(owner_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS expenses (
 owner_id text NOT NULL, group_id text NOT NULL, id text NOT NULL, name text NOT NULL,
 amount bigint NOT NULL CHECK(amount>0 AND amount<=10000000000), payer_id text NOT NULL,
 category text NOT NULL, date date NOT NULL, split_mode text NOT NULL CHECK(split_mode IN ('equal','amount','percent')),
 split_inputs jsonb NOT NULL DEFAULT '{}', receipt_url text, position integer NOT NULL,
 PRIMARY KEY(owner_id,group_id,id),
 FOREIGN KEY(owner_id,group_id) REFERENCES groups(owner_id,id) ON DELETE CASCADE,
 FOREIGN KEY(owner_id,group_id,payer_id) REFERENCES group_members(owner_id,group_id,id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE IF NOT EXISTS expense_participants (
 owner_id text NOT NULL, group_id text NOT NULL, expense_id text NOT NULL, member_id text NOT NULL,
 amount bigint NOT NULL CHECK(amount>=0), position integer NOT NULL,
 PRIMARY KEY(owner_id,group_id,expense_id,member_id),
 FOREIGN KEY(owner_id,group_id,expense_id) REFERENCES expenses(owner_id,group_id,id) ON DELETE CASCADE,
 FOREIGN KEY(owner_id,group_id,member_id) REFERENCES group_members(owner_id,group_id,id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE IF NOT EXISTS settlements (
 owner_id text NOT NULL, group_id text NOT NULL, id text NOT NULL,
 from_member_id text NOT NULL, to_member_id text NOT NULL,
 amount bigint NOT NULL CHECK(amount>0 AND amount<=10000000000), paid_at timestamptz NOT NULL, position integer NOT NULL,
 PRIMARY KEY(owner_id,group_id,id), CHECK(from_member_id<>to_member_id),
 FOREIGN KEY(owner_id,group_id) REFERENCES groups(owner_id,id) ON DELETE CASCADE,
 FOREIGN KEY(owner_id,group_id,from_member_id) REFERENCES group_members(owner_id,group_id,id) DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(owner_id,group_id,to_member_id) REFERENCES group_members(owner_id,group_id,id) DEFERRABLE INITIALLY DEFERRED
);
-- Login can claim an anonymous user's records; never expose these tables through a public client key.
-- Expense share totals are validated by the shared TypeScript engine before each transaction.

