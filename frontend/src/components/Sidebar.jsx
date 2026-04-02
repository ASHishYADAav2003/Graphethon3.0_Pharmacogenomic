// components/Sidebar.jsx — Role-aware navigation sidebar
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NAV_ITEMS = {
  doctor: [
    { section: 'Clinical', items: [
      { path: '/doctor', icon: '🏠', label: 'Overview' },
      { path: '/doctor/patients', icon: '👥', label: 'My Patients' },
      { path: '/doctor/vcf', icon: '🧬', label: 'VCF Analysis' },
      { path: '/doctor/rag', icon: '🤖', label: 'AI Assistant' },
    ]},
    { section: 'Analytics', items: [
      { path: '/doctor/dashboard', icon: '📊', label: 'R Dashboard' },
    ]},
  ],
  nurse: [
    { section: 'Care', items: [
      { path: '/nurse', icon: '🏠', label: 'Overview' },
      { path: '/nurse/patients', icon: '👥', label: 'Patients' },
      { path: '/nurse/vitals', icon: '💓', label: 'Log Vitals' },
      { path: '/nurse/reports', icon: '📋', label: 'Submit Report' },
    ]},
  ],
  patient: [
    { section: 'My Health', items: [
      { path: '/patient', icon: '🏠', label: 'My Overview' },
      { path: '/patient/records', icon: '📋', label: 'My Records' },
      { path: '/patient/prescriptions', icon: '💊', label: 'Prescriptions' },
      { path: '/patient/genomics', icon: '🧬', label: 'Genomic Reports' },
      { path: '/patient/timeline', icon: '⏱️', label: 'History Timeline' },
    ]},
  ],
  admin: [
    { section: 'Administration', items: [
      { path: '/admin', icon: '🏠', label: 'Dashboard' },
      { path: '/admin/users', icon: '👤', label: 'User Management' },
      { path: '/admin/patients', icon: '🏥', label: 'Patient Records' },
      { path: '/admin/blockchain', icon: '🔗', label: 'Blockchain Audit' },
    ]},
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const navItems = NAV_ITEMS[user.role] || [];
  const initials = user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🧬</div>
        <div className="sidebar-logo-text">
          <h1>PharmaGuard</h1>
          <p>PGx Platform v2</p>
        </div>
      </div>

      {/* Role badge */}
      <div className={`sidebar-role-badge ${user.role}`}>
        {user.role === 'doctor' && '👨‍⚕️ '}
        {user.role === 'nurse' && '👩‍⚕️ '}
        {user.role === 'patient' && '🧬 '}
        {user.role === 'admin' && '🔧 '}
        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(section => (
          <div key={section.section}>
            <div className="sidebar-section-title">{section.section}</div>
            {section.items.map(item => {
              const isActive = location.pathname === item.path ||
                (item.path !== '/doctor' && item.path !== '/nurse' && item.path !== '/patient' && item.path !== '/admin' && location.pathname.startsWith(item.path));
              return (
                <div
                  key={item.path}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                  onClick={() => navigate(item.path)}
                >
                  <span className="sidebar-item-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className={`sidebar-avatar ${user.role}`}>{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.full_name}</div>
            <div className="sidebar-user-role">{user.specialization || user.department || user.role}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">🚪</button>
        </div>
      </div>
    </aside>
  );
}
