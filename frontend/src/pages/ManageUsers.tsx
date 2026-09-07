import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Users, 
  UserPlus, 
  Search, 
  ShieldCheck, 
  Building2, 
  HardHat, 
  FileCheck, 
  CheckCircle2, 
  Copy, 
  Check, 
  X, 
  Loader2, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'mine_official' | 'corporate' | 'regulator';
  assigned_mine_id: number | null;
  created_at: string;
  mines?: {
    id: number;
    name: string;
    subsidiary: string;
  } | null;
}

interface MineRecord {
  id: number;
  name: string;
  subsidiary: string;
}

interface ProvisionedCreds {
  name: string;
  email: string;
  password: string;
  role: string;
  mineName?: string;
}

export default function ManageUsers() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [mines, setMines] = useState<MineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Demo@2026');
  const [role, setRole] = useState<'mine_official' | 'corporate' | 'regulator'>('mine_official');
  const [assignedMineId, setAssignedMineId] = useState<number | ''>('');
  const [showPassword, setShowPassword] = useState(false);

  // Success modal state
  const [provisionedCreds, setProvisionedCreds] = useState<ProvisionedCreds | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchUsersAndMines();
  }, []);

  const fetchUsersAndMines = async () => {
    setLoading(true);
    try {
      // Fetch mines first
      const { data: minesData } = await supabase
        .from('mines')
        .select('id, name, subsidiary')
        .order('name');
      
      const mineList = minesData || [];
      setMines(mineList);
      if (mineList.length > 0 && !assignedMineId) {
        setAssignedMineId(mineList[0].id);
      }

      // Fetch users with mine information
      const { data: usersData, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          role,
          assigned_mine_id,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Join mine details
      const enrichedUsers: UserRecord[] = (usersData || []).map(u => {
        const mine = mineList.find(m => m.id === u.assigned_mine_id) || null;
        return {
          ...u,
          mines: mine
        };
      });

      setUsers(enrichedUsers);
    } catch (err: any) {
      console.error('Error loading users or mines:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (role === 'mine_official' && !assignedMineId) {
      setFormError('Please select an assigned mine for the Mine Official role.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        p_name: name.trim(),
        p_email: email.trim().toLowerCase(),
        p_password: password,
        p_role: role,
        p_assigned_mine_id: role === 'mine_official' ? Number(assignedMineId) : null
      };

      const { error } = await supabase.rpc('admin_create_user', payload);

      if (error) {
        throw error;
      }

      const assignedMineName = mines.find(m => m.id === Number(assignedMineId))?.name;

      // Save provisioned credentials for confirmation modal
      setProvisionedCreds({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        role: role,
        mineName: role === 'mine_official' ? assignedMineName : undefined
      });

      // Reset form
      setName('');
      setEmail('');
      setPassword('Demo@2026');
      setRole('mine_official');
      setIsAddModalOpen(false);

      // Refresh list
      await fetchUsersAndMines();
    } catch (err: any) {
      console.error('Failed to create user:', err);
      setFormError(err.message || 'Failed to provision user. Check authorization or email uniqueness.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!provisionedCreds) return;
    const text = `CoalGuard Enterprise Credentials
Name: ${provisionedCreds.name}
Email: ${provisionedCreds.email}
Password: ${provisionedCreds.password}
Role: ${provisionedCreds.role}
${provisionedCreds.mineName ? `Assigned Mine: ${provisionedCreds.mineName}` : 'Jurisdiction: Corporate / Regulatory HQ'}
Login Portal: ${window.location.origin}/login`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Filtered users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.mines?.name && user.mines.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (userRole: string) => {
    switch (userRole) {
      case 'corporate':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Building2 className="w-3.5 h-3.5" /> Corporate Admin
          </span>
        );
      case 'mine_official':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <HardHat className="w-3.5 h-3.5" /> Mine Official
          </span>
        );
      case 'regulator':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <FileCheck className="w-3.5 h-3.5" /> DGMS Regulator
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/30">
            {userRole}
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Corporate HQ Administration
            </span>
            <span className="text-xs text-slate-400 font-mono">• DGMS Access Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-wide" style={{ color: 'var(--cg-text-primary)' }}>
            Enterprise User Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Provision statutory clearance, assign mine jurisdictions, and govern system roles.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm transition-all shadow-lg shadow-amber-500/20 cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Provision New User
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase text-slate-400">Total Users</p>
            <p className="text-xl font-bold text-[var(--cg-text-primary)]">{users.length}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <HardHat className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase text-slate-400">Mine Officials</p>
            <p className="text-xl font-bold text-[var(--cg-text-primary)]">
              {users.filter(u => u.role === 'mine_official').length}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase text-slate-400">Corporate HQ</p>
            <p className="text-xl font-bold text-[var(--cg-text-primary)]">
              {users.filter(u => u.role === 'corporate').length}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase text-slate-400">Regulators</p>
            <p className="text-xl font-bold text-[var(--cg-text-primary)]">
              {users.filter(u => u.role === 'regulator').length}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or mine..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-high)] text-[var(--cg-text-primary)] focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 whitespace-nowrap">Filter Role:</span>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-high)] text-[var(--cg-text-primary)] focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Enterprise Roles</option>
            <option value="mine_official">Mine Official</option>
            <option value="corporate">Corporate Admin</option>
            <option value="regulator">DGMS Regulator</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
            <p className="text-xs font-mono uppercase tracking-wider">Loading enterprise roster...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40 text-slate-500" />
            <p className="text-sm font-semibold">No users match the criteria</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting the search or role filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--cg-border)] text-[10px] font-mono uppercase tracking-wider text-slate-400 bg-[var(--cg-surface-high)]">
                  <th className="py-3.5 px-4 font-semibold">User Identity</th>
                  <th className="py-3.5 px-4 font-semibold">Enterprise Role</th>
                  <th className="py-3.5 px-4 font-semibold">Assigned Jurisdiction / Mine</th>
                  <th className="py-3.5 px-4 font-semibold">Clearance Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Provisioned Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--cg-border)] text-xs">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-[var(--cg-surface-high)]/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs shrink-0">
                          {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <p className="font-semibold text-[var(--cg-text-primary)]">{user.name}</p>
                          <p className="text-[11px] font-mono text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="py-3.5 px-4">
                      {user.role === 'mine_official' ? (
                        user.mines ? (
                          <div>
                            <p className="font-semibold text-emerald-400">{user.mines.name}</p>
                            <p className="text-[10px] font-mono text-slate-400">
                              Subsidiary: {user.mines.subsidiary} (ID: {user.mines.id})
                            </p>
                          </div>
                        ) : (
                          <span className="text-amber-400 font-mono text-[11px]">
                            Mine ID: {user.assigned_mine_id || 'Pending assignment'}
                          </span>
                        )
                      ) : user.role === 'corporate' ? (
                        <div className="text-slate-400 font-mono text-[11px]">
                          National Headquarters (All Subsidiaries)
                        </div>
                      ) : (
                        <div className="text-slate-400 font-mono text-[11px]">
                          DGMS Statutory Regulatory Directorate
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 text-emerald-400 text-[11px] font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active Clearance
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-400">
                      {new Date(user.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add User Form */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-6 sm:p-8 shadow-2xl space-y-6">
            
            <div className="flex items-start justify-between border-b border-[var(--cg-border)] pb-4">
              <div>
                <h3 className="text-xl font-bold font-serif text-[var(--cg-text-primary)]">
                  Provision Enterprise User
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Directly provision an authenticated account with statutory role clearance.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[var(--cg-surface-high)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Er. Sunil K. Tiwary"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-high)] text-[var(--cg-text-primary)] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Official Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. s.tiwary@coalguard.demo"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-high)] text-[var(--cg-text-primary)] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Enterprise Role
                </label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-high)] text-[var(--cg-text-primary)] focus:outline-none focus:border-amber-500"
                >
                  <option value="mine_official">Mine Official (Field Inspector / Mine Manager)</option>
                  <option value="corporate">Corporate HQ (Executive & Admin Oversight)</option>
                  <option value="regulator">DGMS Regulator (Statutory Auditor)</option>
                </select>
              </div>

              {/* Mine dropdown - ONLY required and displayed for mine_official */}
              {role === 'mine_official' && (
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
                    Assigned Mine Jurisdiction <span className="text-red-400">*</span>
                  </label>
                  <select
                    required
                    value={assignedMineId}
                    onChange={e => setAssignedMineId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-high)] text-[var(--cg-text-primary)] focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Select Monitored Mine --</option>
                    {mines.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.subsidiary}) — ID #{m.id}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400">
                    Restricts telemetry feeds and inspection authority to this specific colliery.
                  </p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Temporary Initial Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-high)] text-[var(--cg-text-primary)] focus:outline-none focus:border-amber-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Default: <span className="font-mono text-amber-400">Demo@2026</span> (User can update password upon authentication).
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--cg-border)]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-[var(--cg-surface-high)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Provisioning Account...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Provision User Account
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Success Confirmation with Credentials */}
      {provisionedCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-emerald-500/30 bg-[var(--cg-surface)] p-6 sm:p-8 shadow-2xl space-y-5">
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-serif text-[var(--cg-text-primary)]">
                  Account Successfully Provisioned
                </h3>
                <p className="text-xs text-emerald-400 font-mono">
                  Clearance Granted & Synchronized with GoTrue
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              The user has been registered in the database and authentication system. Share the following credentials securely:
            </p>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Name:</span>
                <span className="text-slate-200 font-semibold">{provisionedCreds.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Email:</span>
                <span className="text-amber-400 font-semibold">{provisionedCreds.email}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Initial Password:</span>
                <span className="text-emerald-400 font-semibold">{provisionedCreds.password}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Role:</span>
                <span className="text-slate-200 uppercase">{provisionedCreds.role}</span>
              </div>
              {provisionedCreds.mineName && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Mine:</span>
                  <span className="text-slate-200">{provisionedCreds.mineName}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleCopyCredentials}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold text-xs transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Credentials Copied!' : 'Copy Credentials'}
              </button>

              <button
                onClick={() => setProvisionedCreds(null)}
                className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
