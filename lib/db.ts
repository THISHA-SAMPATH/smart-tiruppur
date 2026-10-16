import { PRECOMPUTED_DEMO_HASH } from "./password";
import { prisma } from "./prisma";

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

// Initial seed users with instant precomputed hash
const INITIAL_USERS: User[] = [
  {
    id: "usr_admin_001",
    name: "System Administrator",
    email: "admin@smarttiruppur.local",
    passwordHash: PRECOMPUTED_DEMO_HASH,
    role: "ADMIN",
    industryUnitId: null,
    organization: "Smart Tiruppur Core Admin",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "usr_regulator_001",
    name: "TNPCB Regional Officer",
    email: "regulator@smarttiruppur.local",
    passwordHash: PRECOMPUTED_DEMO_HASH,
    role: "REGULATOR",
    industryUnitId: null,
    organization: "Tamil Nadu Pollution Control Board",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "usr_industry_001",
    name: "Unit 001 Operations Manager",
    email: "industry@smarttiruppur.local",
    passwordHash: PRECOMPUTED_DEMO_HASH,
    role: "INDUSTRY",
    industryUnitId: "unit_001",
    organization: "Arulpuram CETP Textile Dyeing Unit 001",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "usr_groundwater_001",
    name: "CGWB Hydrogeologist",
    email: "groundwater@smarttiruppur.local",
    passwordHash: PRECOMPUTED_DEMO_HASH,
    role: "GROUNDWATER_OFFICER",
    industryUnitId: null,
    organization: "Central Ground Water Board - Tiruppur",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "usr_citizen_001",
    name: "Tiruppur Citizen Representative",
    email: "citizen@smarttiruppur.local",
    passwordHash: PRECOMPUTED_DEMO_HASH,
    role: "CITIZEN",
    industryUnitId: null,
    organization: "Civic Environmental Forum",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// In-Memory store for instant response without database TCP lag
const inMemoryUsers: Map<string, User> = new Map(
  INITIAL_USERS.map((u) => [u.email.toLowerCase().trim(), { ...u }]),
);

const inMemoryReports: Map<string, CitizenReport> = new Map();

// Check if a real PostgreSQL database URL is configured
function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  if (!url) return false;
  // Ignore placeholder or example database URLs that cause connection timeouts
  if (url.includes("ep-sample-123456") || url.includes("user:password@")) return false;
  return true;
}

// Helper with timeout to prevent queries from hanging if database is unreachable
async function withTimeout<T>(promise: Promise<T>, ms = 1200): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Database query timed out")), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

let seedAttempted = false;

async function ensureSeedUsers() {
  if (seedAttempted || !isDatabaseConfigured()) return;
  seedAttempted = true;

  try {
    await withTimeout(
      (async () => {
        const userCount = await prisma.user.count();
        if (userCount === 0) {
          for (const u of INITIAL_USERS) {
            await prisma.user.upsert({
              where: { id: u.id },
              update: {},
              create: {
                id: u.id,
                name: u.name,
                email: u.email,
                passwordHash: u.passwordHash,
                role: u.role as any,
                industryUnitId: u.industryUnitId,
                organization: u.organization,
                active: u.active,
              },
            });
          }
        }
      })(),
      2000,
    );
  } catch {
    // Gracefully handle database offline or timeout
  }
}

function mapPrismaUserToDomain(raw: any): User {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    passwordHash: raw.passwordHash,
    role: raw.role as Role,
    industryUnitId: raw.industryUnitId,
    organization: raw.organization,
    active: raw.active,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : String(raw.createdAt),
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : String(raw.updatedAt),
  };
}

function mapPrismaReportToDomain(raw: any): CitizenReport {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    pollutionType: raw.pollutionType,
    locationDescription: raw.locationDescription,
    latitude: raw.latitude,
    longitude: raw.longitude,
    status: raw.status as ReportStatus,
    reporterId: raw.reporterId,
    reporterName: raw.reporter?.name || "Anonymous Citizen",
    reporterEmail: raw.reporter?.email || undefined,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : String(raw.createdAt),
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : String(raw.updatedAt),
    statusHistory: Array.isArray(raw.statusHistory)
      ? raw.statusHistory.map((h: any) => ({
          status: h.status as ReportStatus,
          updatedAt: h.createdAt instanceof Date ? h.createdAt.toISOString() : String(h.createdAt),
          updatedBy: h.updatedBy,
          notes: h.notes || undefined,
        }))
      : [],
  };
}

export const db = {
  user: {
    findMany: async (options?: { where?: Partial<User> }) => {
      if (isDatabaseConfigured()) {
        try {
          const users = await withTimeout(
            prisma.user.findMany({
              where: options?.where ? (options.where as any) : undefined,
              orderBy: { createdAt: "asc" },
            }),
          );
          return users.map(mapPrismaUserToDomain);
        } catch {
          // Fall through to in-memory
        }
      }

      // Instant in-memory lookup
      const all = Array.from(inMemoryUsers.values());
      if (!options?.where) return all;
      return all.filter((u) => {
        if (options.where?.role && u.role !== options.where.role) return false;
        if (options.where?.email && u.email.toLowerCase() !== options.where.email.toLowerCase()) return false;
        if (options.where?.id && u.id !== options.where.id) return false;
        return true;
      });
    },

    findUnique: async (options: { where: { email?: string; id?: string } }) => {
      const email = options.where.email?.toLowerCase().trim();
      const id = options.where.id;

      if (isDatabaseConfigured()) {
        try {
          let raw = null;
          if (email) {
            raw = await withTimeout(
              prisma.user.findUnique({
                where: { email },
              }),
            );
          } else if (id) {
            raw = await withTimeout(
              prisma.user.findUnique({
                where: { id },
              }),
            );
          }
          if (raw) return mapPrismaUserToDomain(raw);
        } catch {
          // Fall through to in-memory
        }
      }

      // Instant in-memory lookup (0ms)
      if (email && inMemoryUsers.has(email)) {
        return inMemoryUsers.get(email)!;
      }
      if (id) {
        for (const u of inMemoryUsers.values()) {
          if (u.id === id) return u;
        }
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
      const email = options.data.email.toLowerCase().trim();
      const newUser: User = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: options.data.name.trim(),
        email,
        passwordHash: options.data.passwordHash,
        role: options.data.role,
        industryUnitId: options.data.industryUnitId || null,
        organization: options.data.organization || null,
        active: options.data.active ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      inMemoryUsers.set(email, newUser);

      if (isDatabaseConfigured()) {
        try {
          const created = await withTimeout(
            prisma.user.create({
              data: {
                name: newUser.name,
                email: newUser.email,
                passwordHash: newUser.passwordHash,
                role: newUser.role as any,
                industryUnitId: newUser.industryUnitId,
                organization: newUser.organization,
                active: newUser.active,
              },
            }),
          );
          return mapPrismaUserToDomain(created);
        } catch {
          // Database error handled
        }
      }

      return newUser;
    },

    update: async (options: {
      where: { id: string };
      data: Partial<User>;
    }) => {
      for (const [key, user] of inMemoryUsers.entries()) {
        if (user.id === options.where.id) {
          const updated = { ...user, ...options.data, updatedAt: new Date().toISOString() };
          inMemoryUsers.set(key, updated);
          return updated;
        }
      }

      if (isDatabaseConfigured()) {
        try {
          const dataToUpdate: any = { ...options.data };
          delete dataToUpdate.id;
          delete dataToUpdate.createdAt;
          delete dataToUpdate.updatedAt;

          const updated = await withTimeout(
            prisma.user.update({
              where: { id: options.where.id },
              data: dataToUpdate,
            }),
          );
          return mapPrismaUserToDomain(updated);
        } catch {
          // Handled
        }
      }

      return null;
    },

    delete: async (options: { where: { id: string } }) => {
      for (const [key, user] of inMemoryUsers.entries()) {
        if (user.id === options.where.id) {
          inMemoryUsers.delete(key);
          return user;
        }
      }

      if (isDatabaseConfigured()) {
        try {
          const deleted = await withTimeout(
            prisma.user.delete({
              where: { id: options.where.id },
            }),
          );
          return mapPrismaUserToDomain(deleted);
        } catch {
          // Handled
        }
      }

      return null;
    },

    count: async (options?: { where?: Partial<User> }) => {
      if (isDatabaseConfigured()) {
        try {
          return await withTimeout(
            prisma.user.count({
              where: options?.where ? (options.where as any) : undefined,
            }),
          );
        } catch {
          // Handled
        }
      }
      return inMemoryUsers.size;
    },
  },

  citizenReport: {
    findMany: async (options?: {
      where?: Partial<CitizenReport>;
      orderBy?: { createdAt?: "asc" | "desc" };
    }) => {
      if (isDatabaseConfigured()) {
        try {
          const whereClause: any = {};
          if (options?.where?.reporterId) whereClause.reporterId = options.where.reporterId;
          if (options?.where?.status) whereClause.status = options.where.status;

          const reports = await withTimeout(
            prisma.citizenReport.findMany({
              where: whereClause,
              orderBy: { createdAt: options?.orderBy?.createdAt || "desc" },
              include: {
                reporter: true,
                statusHistory: { orderBy: { createdAt: "asc" } },
              },
            }),
          );
          return reports.map(mapPrismaReportToDomain);
        } catch {
          // Fall through
        }
      }

      const all = Array.from(inMemoryReports.values());
      return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    findUnique: async (options: { where: { id: string } }) => {
      if (isDatabaseConfigured()) {
        try {
          const raw = await withTimeout(
            prisma.citizenReport.findUnique({
              where: { id: options.where.id },
              include: {
                reporter: true,
                statusHistory: { orderBy: { createdAt: "asc" } },
              },
            }),
          );
          if (raw) return mapPrismaReportToDomain(raw);
        } catch {
          // Fall through
        }
      }
      return inMemoryReports.get(options.where.id) || null;
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
      const id = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const newReport: CitizenReport = {
        id,
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

      inMemoryReports.set(id, newReport);

      if (isDatabaseConfigured()) {
        try {
          const created = await withTimeout(
            prisma.citizenReport.create({
              data: {
                id,
                title: newReport.title,
                description: newReport.description,
                pollutionType: newReport.pollutionType,
                locationDescription: newReport.locationDescription,
                latitude: newReport.latitude,
                longitude: newReport.longitude,
                status: "SUBMITTED",
                reporterId: newReport.reporterId,
                statusHistory: {
                  create: {
                    status: "SUBMITTED",
                    updatedBy: options.data.reporterName || options.data.reporterId,
                    notes: "Report submitted by citizen.",
                  },
                },
              },
              include: {
                reporter: true,
                statusHistory: { orderBy: { createdAt: "asc" } },
              },
            }),
          );
          return mapPrismaReportToDomain(created);
        } catch {
          // Handled
        }
      }

      return newReport;
    },

    updateStatus: async (options: {
      id: string;
      status: ReportStatus;
      updatedBy: string;
      notes?: string;
    }) => {
      const rep = inMemoryReports.get(options.id);
      if (rep) {
        rep.status = options.status;
        rep.updatedAt = new Date().toISOString();
        rep.statusHistory.push({
          status: options.status,
          updatedAt: new Date().toISOString(),
          updatedBy: options.updatedBy,
          notes: options.notes || `Status changed to ${options.status}`,
        });
      }

      if (isDatabaseConfigured()) {
        try {
          const updated = await withTimeout(
            prisma.citizenReport.update({
              where: { id: options.id },
              data: {
                status: options.status,
                statusHistory: {
                  create: {
                    status: options.status,
                    updatedBy: options.updatedBy,
                    notes: options.notes || `Status changed to ${options.status}`,
                  },
                },
              },
              include: {
                reporter: true,
                statusHistory: { orderBy: { createdAt: "asc" } },
              },
            }),
          );
          return mapPrismaReportToDomain(updated);
        } catch {
          // Handled
        }
      }

      return rep || null;
    },
  },
};
