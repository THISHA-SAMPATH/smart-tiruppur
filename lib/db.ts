import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

export type Role = "ADMIN" | "REGULATOR" | "INDUSTRY" | "GROUNDWATER_OFFICER" | "CITIZEN";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  industryUnitId: string | null;
  organization: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ReportStatus = "SUBMITTED" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED";

export interface StatusAuditLog {
  status: ReportStatus;
  updatedAt: string;
  updatedBy: string;
  notes?: string;
}

export interface CitizenReport {
  id: string;
  title: string;
  description: string;
  pollutionType: "Water Pollution" | "Air Pollution" | "Solid Waste" | "Other" | string;
  locationDescription: string;
  latitude: number | null;
  longitude: number | null;
  status: ReportStatus;
  reporterId: string;
  reporterName?: string;
  reporterEmail?: string;
  createdAt: string;
  updatedAt: string;
  statusHistory: StatusAuditLog[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const REPORTS_FILE = path.join(DATA_DIR, "citizen_reports.json");

let inMemoryUsers: User[] | null = null;
let inMemoryReports: CitizenReport[] | null = null;

function ensureDataDirectory() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // Ignore read-only filesystem errors on Vercel
  }
}

function getInitialUserSeed(): User[] {
  const defaultPassword = "SmartTiruppur2026!";
  const passwordHash = bcrypt.hashSync(defaultPassword, 10);
  const now = new Date().toISOString();

  return [
    {
      id: "usr_admin_001",
      name: "System Administrator",
      email: "admin@smarttiruppur.local",
      passwordHash,
      role: "ADMIN",
      industryUnitId: null,
      organization: "Smart Tiruppur Core Admin",
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "usr_regulator_001",
      name: "TNPCB Regional Officer",
      email: "regulator@smarttiruppur.local",
      passwordHash,
      role: "REGULATOR",
      industryUnitId: null,
      organization: "Tamil Nadu Pollution Control Board",
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "usr_industry_001",
      name: "Unit 001 Operations Manager",
      email: "industry@smarttiruppur.local",
      passwordHash,
      role: "INDUSTRY",
      industryUnitId: "unit_001",
      organization: "Arulpuram CETP Textile Dyeing Unit 001",
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "usr_groundwater_001",
      name: "CGWB Hydrogeologist",
      email: "groundwater@smarttiruppur.local",
      passwordHash,
      role: "GROUNDWATER_OFFICER",
      industryUnitId: null,
      organization: "Central Ground Water Board - Tiruppur",
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "usr_citizen_001",
      name: "Tiruppur Citizen Representative",
      email: "citizen@smarttiruppur.local",
      passwordHash,
      role: "CITIZEN",
      industryUnitId: null,
      organization: "Civic Environmental Forum",
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function readUsersRaw(): User[] {
  if (inMemoryUsers) return inMemoryUsers;

  ensureDataDirectory();
  if (fs.existsSync(USERS_FILE)) {
    try {
      const raw = fs.readFileSync(USERS_FILE, "utf-8");
      const users = JSON.parse(raw);
      if (Array.isArray(users) && users.length > 0) {
        inMemoryUsers = users;
        return inMemoryUsers;
      }
    } catch {
      // Fallback if file read fails
    }
  }

  inMemoryUsers = getInitialUserSeed();
  writeUsersRaw(inMemoryUsers);
  return inMemoryUsers;
}

function writeUsersRaw(users: User[]) {
  inMemoryUsers = users;
  try {
    ensureDataDirectory();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch {
    // Fail silently on read-only environments like Vercel
  }
}

function getInitialReportsSeed(): CitizenReport[] {
  const now = new Date().toISOString();
  return [
    {
      id: "rep_seed_001",
      title: "Foam accumulation along river bank",
      description: "Dense white foam observed downstream of Kasipalayam bridge during evening hours.",
      pollutionType: "Water Pollution",
      locationDescription: "Noyyal River bank near Kasipalayam Bridge, Tiruppur North",
      latitude: 11.11975,
      longitude: 77.39716,
      status: "SUBMITTED",
      reporterId: "usr_citizen_001",
      reporterName: "Tiruppur Citizen Representative",
      reporterEmail: "citizen@smarttiruppur.local",
      createdAt: now,
      updatedAt: now,
      statusHistory: [
        {
          status: "SUBMITTED",
          updatedAt: now,
          updatedBy: "usr_citizen_001",
          notes: "Initial citizen observation logged.",
        },
      ],
    },
  ];
}

function readReportsRaw(): CitizenReport[] {
  if (inMemoryReports) return inMemoryReports;

  ensureDataDirectory();
  if (fs.existsSync(REPORTS_FILE)) {
    try {
      const raw = fs.readFileSync(REPORTS_FILE, "utf-8");
      const reports = JSON.parse(raw);
      if (Array.isArray(reports)) {
        inMemoryReports = reports;
        return inMemoryReports;
      }
    } catch {
      // Fallback
    }
  }

  inMemoryReports = getInitialReportsSeed();
  writeReportsRaw(inMemoryReports);
  return inMemoryReports;
}

function writeReportsRaw(reports: CitizenReport[]) {
  inMemoryReports = reports;
  try {
    ensureDataDirectory();
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2), "utf-8");
  } catch {
    // Fail silently on read-only environments
  }
}

export const db = {
  user: {
    findMany: async (options?: { where?: Partial<User> }) => {
      const users = readUsersRaw();
      if (!options?.where) return users;
      return users.filter((u) => {
        for (const [key, val] of Object.entries(options.where!)) {
          if ((u as unknown as Record<string, unknown>)[key] !== val) return false;
        }
        return true;
      });
    },

    findUnique: async (options: { where: { email?: string; id?: string } }) => {
      const users = readUsersRaw();
      if (options.where.email) {
        const targetEmail = options.where.email.toLowerCase().trim();
        return users.find((u) => u.email.toLowerCase() === targetEmail) || null;
      }
      if (options.where.id) {
        return users.find((u) => u.id === options.where.id) || null;
      }
      return null;
    },

    create: async (options: {
      data: {
        name: string;
        email: string;
        passwordHash: string;
        role: Role;
        industryUnitId?: string | null;
        organization?: string | null;
        active?: boolean;
      };
    }) => {
      const users = readUsersRaw();
      const now = new Date().toISOString();
      const newUser: User = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: options.data.name.trim(),
        email: options.data.email.toLowerCase().trim(),
        passwordHash: options.data.passwordHash,
        role: options.data.role,
        industryUnitId: options.data.industryUnitId || null,
        organization: options.data.organization || null,
        active: options.data.active ?? true,
        createdAt: now,
        updatedAt: now,
      };
      const updated = [newUser, ...users];
      writeUsersRaw(updated);
      return newUser;
    },

    update: async (options: {
      where: { id: string };
      data: Partial<User>;
    }) => {
      const users = readUsersRaw();
      const index = users.findIndex((u) => u.id === options.where.id);
      if (index === -1) throw new Error("User not found");

      const existing = users[index];
      const updatedUser: User = {
        ...existing,
        ...options.data,
        updatedAt: new Date().toISOString(),
      };

      const updated = [...users];
      updated[index] = updatedUser;
      writeUsersRaw(updated);
      return updatedUser;
    },

    delete: async (options: { where: { id: string } }) => {
      const users = readUsersRaw();
      const existing = users.find((u) => u.id === options.where.id);
      if (!existing) throw new Error("User not found");
      const updated = users.filter((u) => u.id !== options.where.id);
      writeUsersRaw(updated);
      return existing;
    },

    count: async (options?: { where?: Partial<User> }) => {
      const users = await db.user.findMany(options);
      return users.length;
    },
  },

  citizenReport: {
    findMany: async (options?: {
      where?: Partial<CitizenReport>;
      orderBy?: { createdAt?: "asc" | "desc" };
    }) => {
      let reports = readReportsRaw();
      if (options?.where) {
        reports = reports.filter((r) => {
          for (const [key, val] of Object.entries(options.where!)) {
            if ((r as unknown as Record<string, unknown>)[key] !== val) return false;
          }
          return true;
        });
      }
      if (options?.orderBy?.createdAt) {
        const dir = options.orderBy.createdAt === "asc" ? 1 : -1;
        reports = [...reports].sort(
          (a, b) => dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
        );
      } else {
        // Default newest first
        reports = [...reports].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      }
      return reports;
    },

    findUnique: async (options: { where: { id: string } }) => {
      const reports = readReportsRaw();
      return reports.find((r) => r.id === options.where.id) || null;
    },

    create: async (options: {
      data: {
        title: string;
        description: string;
        pollutionType: string;
        locationDescription: string;
        latitude?: number | null;
        longitude?: number | null;
        reporterId: string;
        reporterName?: string;
        reporterEmail?: string;
      };
    }) => {
      const reports = readReportsRaw();
      const now = new Date().toISOString();
      const newReport: CitizenReport = {
        id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: options.data.title.trim(),
        description: options.data.description.trim(),
        pollutionType: options.data.pollutionType.trim(),
        locationDescription: options.data.locationDescription.trim(),
        latitude: typeof options.data.latitude === "number" ? options.data.latitude : null,
        longitude: typeof options.data.longitude === "number" ? options.data.longitude : null,
        status: "SUBMITTED",
        reporterId: options.data.reporterId,
        reporterName: options.data.reporterName || "Anonymous Citizen",
        reporterEmail: options.data.reporterEmail,
        createdAt: now,
        updatedAt: now,
        statusHistory: [
          {
            status: "SUBMITTED",
            updatedAt: now,
            updatedBy: options.data.reporterName || options.data.reporterId,
            notes: "Report submitted by citizen.",
          },
        ],
      };

      const updated = [newReport, ...reports];
      writeReportsRaw(updated);
      return newReport;
    },

    updateStatus: async (options: {
      id: string;
      status: ReportStatus;
      updatedBy: string;
      notes?: string;
    }) => {
      const reports = readReportsRaw();
      const index = reports.findIndex((r) => r.id === options.id);
      if (index === -1) throw new Error("Citizen report not found");

      const existing = reports[index];
      const now = new Date().toISOString();
      const historyLog: StatusAuditLog = {
        status: options.status,
        updatedAt: now,
        updatedBy: options.updatedBy,
        notes: options.notes || `Status changed to ${options.status}`,
      };

      const updatedReport: CitizenReport = {
        ...existing,
        status: options.status,
        updatedAt: now,
        statusHistory: [...(existing.statusHistory || []), historyLog],
      };

      const updated = [...reports];
      updated[index] = updatedReport;
      writeReportsRaw(updated);
      return updatedReport;
    },
  },
};
