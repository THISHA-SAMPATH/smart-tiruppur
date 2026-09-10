import bcrypt from "bcryptjs";
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

function getInitialUserSeed(): Array<{
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  industryUnitId: string | null;
  organization: string | null;
  active: boolean;
}> {
  const defaultPassword = "SmartTiruppur2026!";
  const passwordHash = bcrypt.hashSync(defaultPassword, 10);

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
    },
  ];
}

let seedAttempted = false;

async function ensureSeedUsers() {
  if (seedAttempted) return;
  seedAttempted = true;

  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      const initialUsers = getInitialUserSeed();
      for (const u of initialUsers) {
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
  } catch {
    // Gracefully handle database offline or build-time static page collection
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
      await ensureSeedUsers();
      try {
        const users = await prisma.user.findMany({
          where: options?.where ? (options.where as any) : undefined,
          orderBy: { createdAt: "asc" },
        });
        return users.map(mapPrismaUserToDomain);
      } catch (err) {
        console.error("Prisma error in db.user.findMany:", err);
        return [];
      }
    },

    findUnique: async (options: { where: { email?: string; id?: string } }) => {
      await ensureSeedUsers();
      try {
        let raw = null;
        if (options.where.email) {
          raw = await prisma.user.findUnique({
            where: { email: options.where.email.toLowerCase().trim() },
          });
        } else if (options.where.id) {
          raw = await prisma.user.findUnique({
            where: { id: options.where.id },
          });
        }
        return raw ? mapPrismaUserToDomain(raw) : null;
      } catch (err) {
        console.error("Prisma error in db.user.findUnique:", err);
        return null;
      }
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
      await ensureSeedUsers();
      const created = await prisma.user.create({
        data: {
          name: options.data.name.trim(),
          email: options.data.email.toLowerCase().trim(),
          passwordHash: options.data.passwordHash,
          role: options.data.role as any,
          industryUnitId: options.data.industryUnitId || null,
          organization: options.data.organization || null,
          active: options.data.active ?? true,
        },
      });
      return mapPrismaUserToDomain(created);
    },

    update: async (options: {
      where: { id: string };
      data: Partial<User>;
    }) => {
      await ensureSeedUsers();
      const dataToUpdate: any = { ...options.data };
      delete dataToUpdate.id;
      delete dataToUpdate.createdAt;
      delete dataToUpdate.updatedAt;

      const updated = await prisma.user.update({
        where: { id: options.where.id },
        data: dataToUpdate,
      });
      return mapPrismaUserToDomain(updated);
    },

    delete: async (options: { where: { id: string } }) => {
      await ensureSeedUsers();
      const deleted = await prisma.user.delete({
        where: { id: options.where.id },
      });
      return mapPrismaUserToDomain(deleted);
    },

    count: async (options?: { where?: Partial<User> }) => {
      await ensureSeedUsers();
      try {
        return await prisma.user.count({
          where: options?.where ? (options.where as any) : undefined,
        });
      } catch {
        return 0;
      }
    },
  },

  citizenReport: {
    findMany: async (options?: {
      where?: Partial<CitizenReport>;
      orderBy?: { createdAt?: "asc" | "desc" };
    }) => {
      try {
        const whereClause: any = {};
        if (options?.where?.reporterId) {
          whereClause.reporterId = options.where.reporterId;
        }
        if (options?.where?.status) {
          whereClause.status = options.where.status;
        }

        const reports = await prisma.citizenReport.findMany({
          where: whereClause,
          orderBy: {
            createdAt: options?.orderBy?.createdAt || "desc",
          },
          include: {
            reporter: true,
            statusHistory: {
              orderBy: { createdAt: "asc" },
            },
          },
        });

        return reports.map(mapPrismaReportToDomain);
      } catch (err) {
        console.error("Prisma error in citizenReport.findMany:", err);
        return [];
      }
    },

    findUnique: async (options: { where: { id: string } }) => {
      try {
        const raw = await prisma.citizenReport.findUnique({
          where: { id: options.where.id },
          include: {
            reporter: true,
            statusHistory: {
              orderBy: { createdAt: "asc" },
            },
          },
        });
        return raw ? mapPrismaReportToDomain(raw) : null;
      } catch (err) {
        console.error("Prisma error in citizenReport.findUnique:", err);
        return null;
      }
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
      await ensureSeedUsers();

      const created = await prisma.citizenReport.create({
        data: {
          title: options.data.title.trim(),
          description: options.data.description.trim(),
          pollutionType: options.data.pollutionType.trim(),
          locationDescription: options.data.locationDescription.trim(),
          latitude: typeof options.data.latitude === "number" ? options.data.latitude : null,
          longitude: typeof options.data.longitude === "number" ? options.data.longitude : null,
          status: "SUBMITTED",
          reporterId: options.data.reporterId,
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
          statusHistory: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      return mapPrismaReportToDomain(created);
    },

    updateStatus: async (options: {
      id: string;
      status: ReportStatus;
      updatedBy: string;
      notes?: string;
    }) => {
      const updated = await prisma.citizenReport.update({
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
          statusHistory: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      return mapPrismaReportToDomain(updated);
    },
  },
};
