// pages/NurseDashboard.jsx — Real-time nurse panel with WebSocket vitals
import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function RiskBadge({ risk }) {
  const map = { 'Safe': 'badge-safe', 'Adjust Dosage': 'badge-adjust', 'Toxic': 'badge-toxic', 'Ineffective': 'badge-ineffective' };
  return <span className={`badge ${map[risk] || 'badge-unknown'}`}>{risk || '—'}</span>;
}

// ── Nurse Overview ────────────────────────────────────────────
function NurseOverview() {
  const { authFetch, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    authFetch('/nurse/stats').then(r => r.json()).then(setStats).catch(() => {});
    authFetch('/nurse/patients').then(r => r.json()).then(d => setPatients(d.slice(0, 6))).catch(() => {});
  }, []);

  return (
    <div className="animate-up">
      <div className="page-header">
        <h2 className="page-title">Welcome, {user?.full_name} 👩‍⚕️</h2>
        <p className="page-subtitle">{user?.department || 'Nursing'} · Care Management Panel</p>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card emerald"><div className="stat-icon emerald">👥</div><div><div className="stat-value">{stats.total_patients}</div><div className="stat-label">Active Patients</div></div></div>
          <div className="stat-card cyan"><div className="stat-icon cyan">💓</div><div><div className="stat-value">{stats.total_vitals_logged}</div><div className="stat-label">Vitals Logged</div></div></div>
          <div className="stat-card blue"><div className="stat-icon blue">📋</div><div><div className="stat-value">{stats.total_reports_submitted}</div><div className="stat-label">Reports Submitted</div></div></div>
          <div className="stat-card amber"><div className="stat-icon amber">📡</div><div><div className="stat-value">{stats.active_connections}</div><div className="stat-label">Live Connections</div></div></div>
        </div>
      )}

      <div className="section">
        <div className="section-header">
          <span className="section-title">👥 Patient Ward</span>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/nurse/patients')}>View All</button>
        </div>
        <div className="grid-auto">
          {patients.map(p => (
            <div key={p.id} className="patient-card" onClick={() => navigate('/nurse/vitals')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-emerald), var(--accent-cyan))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: 'white', flexShrink: 0 }}>
                  {p.full_name?.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.full_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.gender} · {p.blood_type}</div>
                </div>
              </div>
              {p.latest_vitals ? (
                <div className="vitals-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                  <div className="vital-card" style={{ padding: '8px 6px' }}>
                    <div className="vital-value" style={{ fontSize: 16, color: 'var(--accent-rose)' }}>{p.latest_vitals.heart_rate}</div>
                    <div className="vital-label" style={{ fontSize: 10 }}>HR bpm</div>
                  </div>
                  <div className="vital-card" style={{ padding: '8px 6px' }}>
                    <div className="vital-value" style={{ fontSize: 14, color: 'var(--accent-blue)' }}>{p.latest_vitals.systolic_bp}/{p.latest_vitals.diastolic_bp}</div>
                    <div className="vital-label" style={{ fontSize: 10 }}>BP mmHg</div>
                  </div>
                  <div className="vital-card" style={{ padding: '8px 6px' }}>
                    <div className="vital-value" style={{ fontSize: 16, color: p.latest_vitals.oxygen_saturation < 95 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>{p.latest_vitals.oxygen_saturation}%</div>
                    <div className="vital-label" style={{ fontSize: 10 }}>SpO₂</div>
                  </div>
                </div>
              ) : <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>No vitals yet</div>}
              {p.allergies && <div style={{ marginTop: 8, fontSize: 11, color: 'var(--accent-rose)', background: 'rgba(244,63,94,0.08)', borderRadius: 4, padding: '3px 8px' }}>⚠️ {p.allergies}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Vitals Logger ─────────────────────────────────────────────
function VitalsLogger() {
  const { authFetch } = useAuth();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [form, setForm] = useState({ heart_rate: '', systolic_bp: '', diastolic_bp: '', temperature: '', oxygen_saturation: '', respiratory_rate: '', weight: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [liveVitals, setLiveVitals] = useState([]);
  const wsRef = useRef(null);
  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const { token } = useAuth();

  useEffect(() => {
    authFetch('/nurse/patients').then(r => r.json()).then(setPatients).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedPatient) return;
    // Connect WebSocket for live updates
    const wsUrl = BASE_URL.replace('http', 'ws');
    const ws = new WebSocket(`${wsUrl}/nurse/realtime/${selectedPatient.id}?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.event === 'vitals_update') {
        setLiveVitals(prev => [data.vitals, ...prev.slice(0, 9)]);
      }
    };

    return () => ws.close();
  }, [selectedPatient]);

  const handleSave = async () => {
    if (!selectedPatient) { setError('Please select a patient'); return; }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : (k !== 'notes' ? parseFloat(v) : v)]));
      const r = await authFetch(`/nurse/patient/${selectedPatient.id}/vitals`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (r.ok) {
        setSuccess('✅ Vitals logged successfully! Broadcast to all monitoring views.');
        setForm({ heart_rate: '', systolic_bp: '', diastolic_bp: '', temperature: '', oxygen_saturation: '', respiratory_rate: '', weight: '', notes: '' });
      } else {
        const err = await r.json();
        setError(err.detail || 'Failed to log vitals');
      }
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="animate-up">
      <div className="page-header">
        <h2 className="page-title">💓 Log Patient Vitals</h2>
        <p className="page-subtitle">Real-time vitals entry with WebSocket broadcast</p>
      </div>

      <div className="grid-2" style={{ gap: 20 }}>
        {/* Form */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><span className="card-title">Patient Selection</span></div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                {patients.map(p => (
                  <div key={p.id} className={`patient-card ${selectedPatient?.id === p.id ? 'selected' : ''}`} style={{ padding: '10px 12px' }} onClick={() => setSelectedPatient(p)}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.full_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.gender} · Blood: {p.blood_type}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {selectedPatient && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Vitals for {selectedPatient.full_name}</span>
                <div className="live-indicator"><div className="live-dot" /> LIVE</div>
              </div>
              <div className="card-body">
                {selectedPatient.allergies && <div style={{ padding: '8px 12px', background: 'rgba(244,63,94,0.08)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--accent-rose)', marginBottom: 16 }}>⚠️ Allergies: {selectedPatient.allergies}</div>}
                <div className="grid-2" style={{ gap: 12 }}>
                  {[['heart_rate', '♥ Heart Rate', 'bpm'], ['systolic_bp', '↑ Systolic BP', 'mmHg'], ['diastolic_bp', '↓ Diastolic BP', 'mmHg'], ['temperature', '🌡️ Temperature', '°C'], ['oxygen_saturation', '💨 SpO₂', '%'], ['respiratory_rate', '🌬️ Resp. Rate', '/min'], ['weight', '⚖️ Weight', 'kg']].map(([key, label, unit]) => (
                    <div key={key} className="form-group">
                      <label className="form-label">{label} <span style={{ color: 'var(--text-muted)' }}>({unit})</span></label>
                      <input className="form-input" type="number" step="0.1" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={unit} />
                    </div>
                  ))}
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observations, interventions, patient response..." style={{ minHeight: 60 }} />
                </div>
                {success && <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--accent-emerald)', marginBottom: 12 }}>{success}</div>}
                {error && <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--accent-rose)', marginBottom: 12 }}>⚠️ {error}</div>}
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSave} disabled={saving}>
                  {saving ? <><div className="spinner" /> Saving & Broadcasting...</> : '💓 Log Vitals & Broadcast'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live feed */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Live Vitals Feed</span>
            <div className="live-indicator"><div className="live-dot" /> LIVE</div>
          </div>
          <div style={{ padding: 16 }}>
            {liveVitals.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📡</div>
                <div className="empty-title">Awaiting real-time data</div>
                <div className="empty-desc">Log vitals to see them appear here instantly via WebSocket</div>
              </div>
            ) : liveVitals.map((v, i) => (
              <div key={i} style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', marginBottom: 8, borderLeft: '3px solid var(--accent-emerald)' }} className="animate-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-emerald)' }}>✓ Just recorded</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.recorded_at?.slice(11, 19)}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {[['♥', v.heart_rate, 'bpm', 'var(--accent-rose)'], ['🩸', v.systolic_bp && v.diastolic_bp ? `${v.systolic_bp}/${v.diastolic_bp}` : '—', 'mmHg', 'var(--accent-blue)'], ['💨', v.oxygen_saturation, '%', 'var(--accent-emerald)']].map(([icon, val, unit, color]) => (
                    <div key={label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color }}>{val || '—'}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{icon} {unit}</div>
                    </div>
                  ))}
                </div>
                {v.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{v.notes}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reports Submitter ─────────────────────────────────────────
function ReportsPage() {
  const { authFetch } = useAuth();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [form, setForm] = useState({ shift: 'Morning', report_type: 'Routine', summary: '', observations: '', interventions: '', patient_response: '', pain_scale: '', mobility: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [pastReports, setPastReports] = useState([]);

  useEffect(() => {
    authFetch('/nurse/patients').then(r => r.json()).then(setPatients).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      authFetch(`/nurse/patient/${selectedPatient.id}/reports`).then(r => r.json()).then(setPastReports).catch(() => {});
    }
  }, [selectedPatient]);

  const handleSave = async () => {
    if (!selectedPatient) return;
    setSaving(true);
    try {
      await authFetch(`/nurse/patient/${selectedPatient.id}/report`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, pain_scale: form.pain_scale ? parseInt(form.pain_scale) : null })
      });
      setSuccess('Report submitted successfully!');
      authFetch(`/nurse/patient/${selectedPatient.id}/reports`).then(r => r.json()).then(setPastReports);
      setForm({ shift: 'Morning', report_type: 'Routine', summary: '', observations: '', interventions: '', patient_response: '', pain_scale: '', mobility: '' });
    } catch (e) {} finally { setSaving(false); }
  };

  return (
    <div className="animate-up">
      <div className="page-header"><h2 className="page-title">📋 Nursing Reports</h2><p className="page-subtitle">Submit shift reports and patient observations</p></div>
      <div className="grid-2" style={{ gap: 20 }}>
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><span className="card-title">Select Patient</span></div>
            <div className="card-body">
              <select className="form-select" value={selectedPatient?.id || ''} onChange={e => setSelectedPatient(patients.find(p => p.id === parseInt(e.target.value)) || null)}>
                <option value="">— Select Patient —</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
          </div>
          {selectedPatient && (
            <div className="card">
              <div className="card-header"><span className="card-title">New Report for {selectedPatient.full_name}</span></div>
              <div className="card-body">
                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="form-group"><label className="form-label">Shift</label>
                    <select className="form-select" value={form.shift} onChange={e => setForm(f => ({ ...f, shift: e.target.value }))}>
                      {['Morning', 'Afternoon', 'Night'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Report Type</label>
                    <select className="form-select" value={form.report_type} onChange={e => setForm(f => ({ ...f, report_type: e.target.value }))}>
                      {['Routine', 'Urgent', 'Medication Administration', 'Fall Risk', 'Discharge Planning'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Pain Scale (0-10)</label>
                    <input className="form-input" type="number" min={0} max={10} value={form.pain_scale} onChange={e => setForm(f => ({ ...f, pain_scale: e.target.value }))} placeholder="0-10" />
                  </div>
                  <div className="form-group"><label className="form-label">Mobility</label>
                    <select className="form-select" value={form.mobility} onChange={e => setForm(f => ({ ...f, mobility: e.target.value }))}>
                      <option value="">—</option>
                      {['Independent', 'Ambulatory with assistance', 'Wheelchair', 'Bed-bound', 'Restrained'].map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Summary *</label><textarea className="form-textarea" value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="Shift summary..." /></div>
                <div className="form-group"><label className="form-label">Observations</label><textarea className="form-textarea" value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))} placeholder="Clinical observations..." /></div>
                <div className="form-group"><label className="form-label">Interventions</label><textarea className="form-textarea" value={form.interventions} onChange={e => setForm(f => ({ ...f, interventions: e.target.value }))} placeholder="Actions taken..." /></div>
                <div className="form-group"><label className="form-label">Patient Response</label><input className="form-input" value={form.patient_response} onChange={e => setForm(f => ({ ...f, patient_response: e.target.value }))} placeholder="How patient responded..." /></div>
                {success && <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--accent-emerald)', marginBottom: 12 }}>✅ {success}</div>}
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSave} disabled={saving || !form.summary}>{saving ? 'Submitting...' : '📋 Submit Report'}</button>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Past Reports {selectedPatient ? `(${selectedPatient.full_name})` : ''}</span></div>
          <div style={{ padding: 16 }}>
            {pastReports.length === 0 ? <div className="empty-state"><div className="empty-icon">📋</div><div className="empty-title">No reports yet</div></div> :
              pastReports.map(r => (
                <div key={r.id} style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', marginBottom: 8, borderLeft: '3px solid var(--accent-emerald)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{r.shift} Shift — {r.report_type}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.created_at?.slice(0, 10)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{r.summary}</div>
                  {r.pain_scale != null && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pain: {r.pain_scale}/10 · {r.nurse_name}</div>}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Full patient list for nurse
function NursePatientList() {
  const { authFetch } = useAuth();
  const [patients, setPatients] = useState([]);
  useEffect(() => { authFetch('/nurse/patients').then(r => r.json()).then(setPatients).catch(() => {}); }, []);
  return (
    <div className="animate-up">
      <div className="page-header"><h2 className="page-title">Ward Patients</h2></div>
      <div className="grid-auto">
        {patients.map(p => (
          <div key={p.id} className="patient-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div className="patient-avatar">{p.full_name?.charAt(0)}</div>
              <div><div style={{ fontWeight: 600, fontSize: 13 }}>{p.full_name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.gender} · {p.blood_type}</div></div>
            </div>
            {p.allergies && <div style={{ fontSize: 11, color: 'var(--accent-rose)', marginBottom: 6 }}>⚠️ {p.allergies}</div>}
            {p.chronic_conditions && <div style={{ fontSize: 11, color: 'var(--accent-amber)', marginBottom: 8 }}>🏥 {p.chronic_conditions}</div>}
            {p.latest_vitals ? (
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                Last: ♥{p.latest_vitals.heart_rate} · BP {p.latest_vitals.systolic_bp}/{p.latest_vitals.diastolic_bp} · SpO₂ {p.latest_vitals.oxygen_saturation}%
              </div>
            ) : <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No vitals recorded</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NurseDashboard() {
  return (
    <Routes>
      <Route path="/" element={<NurseOverview />} />
      <Route path="/patients" element={<NursePatientList />} />
      <Route path="/vitals" element={<VitalsLogger />} />
      <Route path="/reports" element={<ReportsPage />} />
    </Routes>
  );
}
