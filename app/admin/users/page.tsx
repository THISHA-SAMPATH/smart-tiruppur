"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ErrorBanner } from "@/components/StaleBanner";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "REGULATOR" | "INDUSTRY" | "GROUNDWATER_OFFICER" | "CITIZEN";
  industryUnitId: string | null;
  organization: string | null;
  active: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Create User Form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<UserRecord["role"]>("CITIZEN");
  const [formIndustryUnitId, setFormIndustryUnitId] = useState("");
  const [formOrganization, setFormOrganization] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch users");
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          password: formPassword,
          role: formRole,
          industryUnitId: formRole === "INDUSTRY" ? formIndustryUnitId || "unit_001" : null,
          organization: formOrganization,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create user.");
      }

      setSuccessMsg(`User ${data.user.email} successfully created!`);
      setShowCreateModal(false);
      // Reset form
      setFormName("");
      setFormEmail("");
      setFormPassword("");
      setFormRole("CITIZEN");
      setFormIndustryUnitId("");
      setFormOrganization("");
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (user: UserRecord) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !user.active }),
      });
      if (res.ok) {
        await fetchUsers();
      }
    } catch {
      setError("Failed to update user status.");
    }
  };

  const handleDeleteUser = async (user: UserRecord) => {
    if (!confirm(`Are you sure you want to delete user ${user.email}?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setSuccessMsg(`User ${user.email} deleted.`);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.organization && u.organization.toLowerCase().includes(search.toLowerCase()));
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="workspace-page">
      <p className="small muted" style={{ marginBottom: "8px" }}>
        <Link href="/admin">← Back to Admin Dashboard</Link>
      </p>

      <header className="workspace-header">
        <div>
          <p className="eyebrow">ADMINISTRATION / USERS</p>
          <h1>User & Access Management</h1>
          <p>
            Create accounts, manage system roles, restrict industrial unit access, and manage active platform users.
          </p>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => setShowCreateModal(!showCreateModal)}
        >
          {showCreateModal ? "Close Form" : "+ Create New User"}
        </button>
      </header>

      {error && <ErrorBanner message={error} />}
      {successMsg && (
        <div className="stale-banner" style={{ background: "#dcece4", color: "var(--teal)", borderColor: "var(--teal)" }}>
          ✓ {successMsg}
        </div>
      )}

      {/* Create User Form Section */}
      {showCreateModal && (
        <div className="card" style={{ marginBottom: "28px", borderLeft: "4px solid var(--teal)" }}>
          <h3 style={{ fontSize: "18px", marginBottom: "14px" }}>Register New User Account</h3>
          <form onSubmit={handleCreateUser} className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
            <div>
              <label className="small muted" style={{ display: "block", marginBottom: "4px" }}>Full Name</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--hairline)", borderRadius: "var(--radius-sm)", background: "var(--paper)", color: "var(--ink)" }}
              />
            </div>

            <div>
              <label className="small muted" style={{ display: "block", marginBottom: "4px" }}>Email Address</label>
              <input
                type="email"
                required
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="ramesh@smarttiruppur.local"
                style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--hairline)", borderRadius: "var(--radius-sm)", background: "var(--paper)", color: "var(--ink)" }}
              />
            </div>

            <div>
              <label className="small muted" style={{ display: "block", marginBottom: "4px" }}>Password</label>
              <input
                type="password"
                required
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--hairline)", borderRadius: "var(--radius-sm)", background: "var(--paper)", color: "var(--ink)" }}
              />
            </div>

            <div>
              <label className="small muted" style={{ display: "block", marginBottom: "4px" }}>Assign Role</label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as UserRecord["role"])}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--hairline)", borderRadius: "var(--radius-sm)", background: "var(--paper)", color: "var(--ink)" }}
              >
                <option value="ADMIN">ADMIN</option>
                <option value="REGULATOR">REGULATOR</option>
                <option value="INDUSTRY">INDUSTRY</option>
                <option value="GROUNDWATER_OFFICER">GROUNDWATER_OFFICER</option>
                <option value="CITIZEN">CITIZEN</option>
              </select>
            </div>

            {formRole === "INDUSTRY" && (
              <div>
                <label className="small muted" style={{ display: "block", marginBottom: "4px" }}>Assigned Industry Unit ID</label>
                <input
                  type="text"
                  required
                  value={formIndustryUnitId}
                  onChange={(e) => setFormIndustryUnitId(e.target.value)}
                  placeholder="e.g. unit_001"
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--hairline)", borderRadius: "var(--radius-sm)", background: "var(--paper)", color: "var(--ink)" }}
                />
              </div>
            )}

            <div>
              <label className="small muted" style={{ display: "block", marginBottom: "4px" }}>Organization / Agency</label>
              <input
                type="text"
                value={formOrganization}
                onChange={(e) => setFormOrganization(e.target.value)}
                placeholder="e.g. TNPCB / CETP Unit"
                style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--hairline)", borderRadius: "var(--radius-sm)", background: "var(--paper)", color: "var(--ink)" }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "6px" }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? "Saving user..." : "Create Account"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginBottom: "20px", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search by name, email, organization..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: "220px",
            padding: "8px 12px",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-sm)",
            background: "var(--paper-raised)",
            color: "var(--ink)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="small muted">Filter Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-sm)",
              background: "var(--paper-raised)",
              color: "var(--ink)",
            }}
          >
            <option value="ALL">All Roles ({users.length})</option>
            <option value="ADMIN">ADMIN</option>
            <option value="REGULATOR">REGULATOR</option>
            <option value="INDUSTRY">INDUSTRY</option>
            <option value="GROUNDWATER_OFFICER">GROUNDWATER_OFFICER</option>
            <option value="CITIZEN">CITIZEN</option>
          </select>
        </div>
      </div>

      {/* User Table */}
      {loading ? (
        <p className="muted small">Loading user list...</p>
      ) : filteredUsers.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "32px" }}>
          <p className="muted">No user accounts found matching your query.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>User / Email</th>
                <th>Role</th>
                <th>Industry Unit Scoping</th>
                <th>Organization</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                    <div className="mono small muted">{u.email}</div>
                  </td>
                  <td>
                    <span className={`badge ${u.role === "ADMIN" ? "badge-investigate" : "badge-normal"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    {u.industryUnitId ? (
                      <span className="mono">{u.industryUnitId}</span>
                    ) : (
                      <span className="muted small">—</span>
                    )}
                  </td>
                  <td className="small">{u.organization || "—"}</td>
                  <td>
                    <span style={{ color: u.active ? "var(--teal)" : "var(--madder)", fontWeight: 500 }}>
                      {u.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: "3px 8px", fontSize: "12px" }}
                        onClick={() => void handleToggleActive(u)}
                      >
                        {u.active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: "3px 8px", fontSize: "12px", color: "var(--madder)", borderColor: "var(--madder)" }}
                        onClick={() => void handleDeleteUser(u)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
