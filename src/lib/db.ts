import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "dyaccounts.db");

type DbGlobal = {
  db?: Database.Database;
  initialized?: boolean;
};

const globalForDb = globalThis as unknown as DbGlobal;

function getDb() {
  if (!globalForDb.db) {
    fs.mkdirSync(dataDir, { recursive: true });
    globalForDb.db = new Database(dbPath, { fileMustExist: false });
    globalForDb.db.pragma("journal_mode = WAL");
    globalForDb.db.pragma("busy_timeout = 5000");
  }

  if (!globalForDb.initialized) {
    globalForDb.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL CHECK (role IN ('admin', 'customer')),
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT,
        repeater TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS credit_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        amount INTEGER NOT NULL CHECK (amount > 0),
        status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
        source TEXT NOT NULL DEFAULT 'request',
        note TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TEXT,
        reviewed_by INTEGER,
        FOREIGN KEY (customer_id) REFERENCES users (id),
        FOREIGN KEY (reviewed_by) REFERENCES users (id)
      );

      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        amount INTEGER NOT NULL CHECK (amount > 0),
        kind TEXT NOT NULL CHECK (kind IN ('payment', 'clear')),
        note TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        recorded_by INTEGER,
        FOREIGN KEY (customer_id) REFERENCES users (id),
        FOREIGN KEY (recorded_by) REFERENCES users (id)
      );
    `);

    ensureColumn(globalForDb.db, "users", "phone", "TEXT");
    ensureColumn(globalForDb.db, "users", "repeater", "TEXT");
    ensureColumn(globalForDb.db, "credit_requests", "source", "TEXT NOT NULL DEFAULT 'request'");
    ensureColumn(globalForDb.db, "credit_requests", "note", "TEXT");

    const adminExists = globalForDb.db
      .prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
      .get() as { id: number } | undefined;

    if (!adminExists) {
      globalForDb.db
        .prepare(
          `
            INSERT INTO users (role, username, password_hash, full_name)
            VALUES ('admin', @username, @passwordHash, @fullName)
          `,
        )
        .run({
          username: process.env.ADMIN_USERNAME ?? "admin",
          passwordHash: bcrypt.hashSync(process.env.ADMIN_PASSWORD ?? "admin12345", 10),
          fullName: process.env.ADMIN_NAME ?? "مدير النظام",
        });
    }

    globalForDb.initialized = true;
  }

  return globalForDb.db;
}

function ensureColumn(database: Database.Database, tableName: string, columnName: string, definition: string) {
  const columns = database
    .prepare(`PRAGMA table_info(${tableName})`)
    .all() as Array<{ name: string }>;

  if (!columns.some((column) => column.name === columnName)) {
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

export type UserRole = "admin" | "customer";

export type UserRecord = {
  id: number;
  role: UserRole;
  username: string;
  password_hash: string;
  full_name: string;
  phone: string | null;
  repeater: string | null;
  created_at: string;
};

export type PendingRequestRecord = {
  id: number;
  amount: number;
  createdAt: string;
  customerName: string;
  customerUsername: string;
};

export type PaymentRecord = {
  id: number;
  amount: number;
  kind: "payment" | "clear";
  note: string | null;
  createdAt: string;
};

export type RecentPaymentRecord = PaymentRecord & {
  customerName: string;
};

export type CustomerRequestRecord = {
  id: number;
  amount: number;
  status: "pending" | "approved" | "rejected";
  source: "request" | "manual";
  note: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type CustomerExportRecord = {
  id: number;
  fullName: string;
  username: string;
  phone: string | null;
  repeater: string | null;
  createdAt: string;
  totalApproved: number;
  totalPaid: number;
  pendingRequests: number;
  currentDebt: number;
};

export type CustomerOperationRecord = {
  id: number;
  table: "credit_requests" | "payments";
  amount: number;
  status: "pending" | "approved" | "rejected" | null;
  source: "request" | "manual" | null;
  paymentKind: "payment" | "clear" | null;
  note: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export function getUserByUsername(username: string) {
  return getDb()
    .prepare("SELECT * FROM users WHERE username = ? LIMIT 1")
    .get(username) as UserRecord | undefined;
}

export function getUserById(id: number) {
  return getDb().prepare("SELECT * FROM users WHERE id = ? LIMIT 1").get(id) as
    | UserRecord
    | undefined;
}

export function getAdminUser() {
  return getDb()
    .prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1")
    .get() as UserRecord | undefined;
}

export function getCustomerDebt(customerId: number) {
  const row = getDb()
    .prepare(
      `
      SELECT
        COALESCE((SELECT SUM(amount) FROM credit_requests WHERE customer_id = ? AND status = 'approved'), 0) -
        COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id = ?), 0) AS debt
    `,
    )
    .get(customerId, customerId) as { debt: number };

  return row.debt;
}

export function getAdminDashboardData() {
  const database = getDb();

  const customers = database
    .prepare(
      `
      SELECT
        users.id,
        users.full_name as fullName,
        users.username,
        users.phone,
        users.repeater,
        users.created_at as createdAt,
        COALESCE((
          SELECT SUM(amount)
          FROM credit_requests
          WHERE customer_id = users.id AND status = 'approved'
        ), 0) AS totalApproved,
        COALESCE((
          SELECT SUM(amount)
          FROM payments
          WHERE customer_id = users.id
        ), 0) AS totalPaid,
        COALESCE((
          SELECT COUNT(*)
          FROM credit_requests
          WHERE customer_id = users.id AND status = 'pending'
        ), 0) AS pendingRequests
      FROM users
      WHERE users.role = 'customer'
      ORDER BY users.created_at DESC
    `,
    )
    .all() as Array<{
    id: number;
    fullName: string;
    username: string;
    phone: string | null;
    repeater: string | null;
    createdAt: string;
    totalApproved: number;
    totalPaid: number;
    pendingRequests: number;
  }>;

  const pendingRequests = database
    .prepare(
      `
      SELECT
        credit_requests.id,
        credit_requests.amount,
        credit_requests.created_at as createdAt,
        users.full_name as customerName,
        users.username as customerUsername
      FROM credit_requests
      INNER JOIN users ON users.id = credit_requests.customer_id
      WHERE credit_requests.status = 'pending'
      ORDER BY credit_requests.created_at ASC
    `,
    )
    .all() as PendingRequestRecord[];

  const recentPayments = database
    .prepare(
      `
      SELECT
        payments.id,
        payments.amount,
        payments.kind,
        payments.note,
        payments.created_at as createdAt,
        users.full_name as customerName
      FROM payments
      INNER JOIN users ON users.id = payments.customer_id
      ORDER BY payments.created_at DESC
      LIMIT 12
    `,
    )
    .all() as RecentPaymentRecord[];

  const enrichedCustomers = customers.map((customer) => ({
    ...customer,
    currentDebt: customer.totalApproved - customer.totalPaid,
  })) as CustomerExportRecord[];

  return {
    customers: enrichedCustomers,
    pendingRequests,
    recentPayments,
    totals: enrichedCustomers.reduce(
      (accumulator, customer) => {
        accumulator.totalDebt += customer.currentDebt;
        accumulator.totalCustomers += 1;
        accumulator.pendingCount += customer.pendingRequests;
        return accumulator;
      },
      { totalDebt: 0, totalCustomers: 0, pendingCount: 0 },
    ),
  };
}

export function getExportData() {
  const database = getDb();
  const dashboard = getAdminDashboardData();

  const requests = database
    .prepare(
      `
      SELECT
        credit_requests.id,
        users.full_name as customerName,
        users.username as customerUsername,
        credit_requests.amount,
        credit_requests.status,
        credit_requests.source,
        credit_requests.note,
        credit_requests.created_at as createdAt,
        credit_requests.reviewed_at as reviewedAt
      FROM credit_requests
      INNER JOIN users ON users.id = credit_requests.customer_id
      ORDER BY credit_requests.created_at DESC
    `,
    )
    .all() as Array<{
    id: number;
    customerName: string;
    customerUsername: string;
    amount: number;
    status: "pending" | "approved" | "rejected";
    source: "request" | "manual";
    note: string | null;
    createdAt: string;
    reviewedAt: string | null;
  }>;

  const payments = database
    .prepare(
      `
      SELECT
        payments.id,
        users.full_name as customerName,
        users.username as customerUsername,
        payments.amount,
        payments.kind,
        payments.note,
        payments.created_at as createdAt
      FROM payments
      INNER JOIN users ON users.id = payments.customer_id
      ORDER BY payments.created_at DESC
    `,
    )
    .all() as Array<{
    id: number;
    customerName: string;
    customerUsername: string;
    amount: number;
    kind: "payment" | "clear";
    note: string | null;
    createdAt: string;
  }>;

  return {
    generatedAt: new Date().toISOString(),
    totals: dashboard.totals,
    customers: dashboard.customers,
    requests,
    payments,
  };
}

export function getCustomerOperationHistory(customerId: number) {
  const database = getDb();

  return database
    .prepare(
      `
      SELECT
        id,
        'credit_requests' as table_name,
        amount,
        status,
        source,
        NULL as payment_kind,
        note,
        created_at as createdAt,
        reviewed_at as reviewedAt
      FROM credit_requests
      WHERE customer_id = ?

      UNION ALL

      SELECT
        id,
        'payments' as table_name,
        amount,
        NULL as status,
        NULL as source,
        kind as payment_kind,
        note,
        created_at as createdAt,
        NULL as reviewedAt
      FROM payments
      WHERE customer_id = ?

      ORDER BY createdAt DESC, id DESC
    `,
    )
    .all(customerId, customerId)
    .map((row) => {
      const typed = row as {
        id: number;
        table_name: "credit_requests" | "payments";
        amount: number;
        status: "pending" | "approved" | "rejected" | null;
        source: "request" | "manual" | null;
        payment_kind: "payment" | "clear" | null;
        note: string | null;
        createdAt: string;
        reviewedAt: string | null;
      };

      return {
        id: typed.id,
        table: typed.table_name,
        amount: typed.amount,
        status: typed.status,
        source: typed.source,
        paymentKind: typed.payment_kind,
        note: typed.note,
        createdAt: typed.createdAt,
        reviewedAt: typed.reviewedAt,
      };
    }) as CustomerOperationRecord[];
}

export function getCustomerDashboardData(customerId: number) {
  const database = getDb();

  const customer = database
    .prepare(
      `
      SELECT id, full_name as fullName, username, phone, repeater, created_at as createdAt
      FROM users
      WHERE id = ? AND role = 'customer'
      LIMIT 1
    `,
    )
    .get(customerId) as
    | {
        id: number;
        fullName: string;
        username: string;
        phone: string | null;
        repeater: string | null;
        createdAt: string;
      }
    | undefined;

  if (!customer) {
    return null;
  }

  const requests = database
    .prepare(
      `
      SELECT id, amount, status, source, note, created_at as createdAt, reviewed_at as reviewedAt
      FROM credit_requests
      WHERE customer_id = ?
      ORDER BY created_at DESC
    `,
    )
    .all(customerId) as CustomerRequestRecord[];

  const payments = database
    .prepare(
      `
      SELECT id, amount, kind, note, created_at as createdAt
      FROM payments
      WHERE customer_id = ?
      ORDER BY created_at DESC
    `,
    )
    .all(customerId) as PaymentRecord[];

  const totalApproved = database
    .prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM credit_requests WHERE customer_id = ? AND status = 'approved'",
    )
    .get(customerId) as { total: number };

  const totalPaid = database
    .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE customer_id = ?")
    .get(customerId) as { total: number };

  return {
    customer,
    requests,
    payments,
    summary: {
      totalApproved: totalApproved.total,
      totalPaid: totalPaid.total,
      currentDebt: totalApproved.total - totalPaid.total,
    },
  };
}

export function runStatement(sql: string, ...params: unknown[]) {
  return getDb().prepare(sql).run(...params);
}
