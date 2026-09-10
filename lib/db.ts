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

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

let inMemoryUsers: User[] | null = null;

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
};
