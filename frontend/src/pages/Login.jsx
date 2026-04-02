// pages/Login.jsx — Premium multi-role login page
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ROLES = [
  { id: 'doctor', label: 'Doctor', icon: '👨‍⚕️', color: 'var(--doctor-color)' },
  { id: 'nurse', label: 'Nurse', icon: '👩‍⚕️', color: 'var(--nurse-color)' },
  { id: 'patient', label: 'Patient', icon: '🧬', color: 'var(--patient-color)' },
  { id: 'admin', label: 'Admin / DBA', icon: '🔧', color: 'var(--admin-color)' },
];

const DEMO_CREDS = {
  doctor:  { username: 'dr_smith',      password: 'doctor123' },
  nurse:   { username: 'nurse_jones',   password: 'nurse123' },
  patient: { username: 'patient_alice', password: 'patient123' },
  admin:   { username: 'admin',         password: 'admin123' },
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('doctor');
  const [mode, setMode] = useState('login'); // login | register
  const [form, setForm] = useState({ username: '', password: '', email: '', full_name: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setError('');
    const demo = DEMO_CREDS[role];
    setForm(prev => ({ ...prev, username: demo.username, password: demo.password }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(form.username, form.password);
      navigate(`/${user.role}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-orb orb1" />
      <div className="login-bg-orb orb2" />

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">🧬</div>
          <h1 className="login-title">PharmaGuard PGx</h1>
          <p className="login-subtitle">Multi-Role Clinical Platform</p>
        </div>

        {/* Role selector */}
        <div style={{ marginBottom: '20px' }}>
          <div className="form-label" style={{ marginBottom: '10px' }}>Select your role</div>
          <div className="role-selector">
            {ROLES.map(role => (
              <button
                key={role.id}
                className={`role-option ${selectedRole === role.id ? 'selected' : ''}`}
                onClick={() => handleRoleSelect(role.id)}
                type="button"
                style={selectedRole === role.id ? { borderColor: role.color, color: role.color, background: `${role.color}18` } : {}}
              >
                <span className="role-option-icon">{role.icon}</span>
                {role.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick fill notice */}
        <div style={{
          background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)',
          borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: '18px',
          fontSize: '12px', color: 'var(--text-secondary)'
        }}>
          💡 Demo credentials pre-filled for <strong style={{ color: 'var(--accent-cyan)' }}>{selectedRole}</strong>. Click Login to continue.
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="input-with-icon">
              <span className="input-icon">👤</span>
              <input
                className="form-input"
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="Enter username"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-with-icon">
              <span className="input-icon">🔒</span>
              <input
                className="form-input"
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '13px', color: 'var(--accent-rose)', marginBottom: '16px' }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            disabled={loading}
          >
            {loading ? <><div className="spinner" /> Signing in...</> : `Sign in as ${ROLES.find(r => r.id === selectedRole)?.label}`}
          </button>
        </form>

        {/* Demo accounts */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
          <div className="form-label" style={{ marginBottom: '10px', textAlign: 'center' }}>Quick Access — Demo Accounts</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {ROLES.map(role => (
              <button
                key={role.id}
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => handleRoleSelect(role.id)}
                style={{ justifyContent: 'center', fontSize: '11px' }}
              >
                {role.icon} {DEMO_CREDS[role.id].username}
              </button>
            ))}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '20px' }}>
          © 2026 Team_Garudaa · PharmaGuard v2.0
        </p>
      </div>
    </div>
  );
}
