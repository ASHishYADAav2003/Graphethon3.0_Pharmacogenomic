// pages/DoctorDashboard.jsx — Full-featured doctor panel
import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BlockchainBadge from '../components/BlockchainBadge';
import RAGChat from '../components/RAGChat';

// ── Risk helpers ──────────────────────────────────────────────
function RiskBadge({ risk }) {
  const map = { 'Safe': 'badge-safe', 'Adjust Dosage': 'badge-adjust', 'Toxic': 'badge-toxic', 'Ineffective': 'badge-ineffective' };
  return <span className={`badge ${map[risk] || 'badge-unknown'}`}>{risk || 'Unknown'}</span>;
}
function SeverityBadge({ severity }) {
  const map = { none: 'severity-none', low: 'severity-low', moderate: 'severity-moderate', high: 'severity-high', critical: 'severity-critical' };
  return <span className={`severity-dot ${map[severity] || 'severity-none'}`} style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%' }} title={severity} />;
}

// ── Doctor Overview ────────────────────────────────────────────
function DoctorOverview() {
  const { authFetch, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    authFetch('/doctor/stats').then(r => r.json()).then(setStats).catch(() => {});
    authFetch('/doctor/patients').then(r => r.json()).then(d => setPatients(d.slice(0, 5))).catch(() => {});
  }, []);

  const riskColors = { 'Safe': 'var(--risk-safe)', 'Adjust Dosage': 'var(--risk-adjust)', 'Toxic': 'var(--risk-toxic)', 'Ineffective': 'var(--risk-ineffective)', 'Unknown': 'var(--text-muted)' };

  return (
    <div className="animate-up">
      <div className="page-header">
        <h2 className="page-title">Welcome, {user?.full_name} 👋</h2>
        <p className="page-subtitle">{user?.specialization || 'Pharmacogenomics'} · PharmaGuard Clinical Platform</p>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card cyan"><div className="stat-icon cyan">👥</div><div><div className="stat-value">{stats.total_patients}</div><div className="stat-label">Total Patients</div></div></div>
          <div className="stat-card blue"><div className="stat-icon blue">📋</div><div><div className="stat-value">{stats.records_created}</div><div className="stat-label">Records Created</div></div></div>
          <div className="stat-card emerald"><div className="stat-icon emerald">💊</div><div><div className="stat-value">{stats.prescriptions_written}</div><div className="stat-label">Prescriptions</div></div></div>
          <div className="stat-card purple"><div className="stat-icon purple">🧬</div><div><div className="stat-value">{stats.vcf_analyses}</div><div className="stat-label">VCF Analyses</div></div></div>
        </div>
      )}

      <div className="grid-2" style={{ gap: '20px' }}>
        {/* Recent patients */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Patients</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/doctor/patients')}>View All →</button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {patients.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }} onClick={() => navigate(`/doctor/patient/${p.id}`)}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'white', flexShrink: 0 }}>
                  {p.full_name?.charAt(0) || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p.full_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.patient_code} · {p.record_count} records</div>
                </div>
                {p.latest_vitals && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
                    <div>♥ {p.latest_vitals.heart_rate} bpm</div>
                    <div>{p.latest_vitals.systolic_bp}/{p.latest_vitals.diastolic_bp} mmHg</div>
                  </div>
                )}
              </div>
            ))}
            {patients.length === 0 && <div className="empty-state">No patients found</div>}
          </div>
        </div>

        {/* Risk breakdown */}
        {stats?.risk_breakdown && Object.keys(stats.risk_breakdown).length > 0 && (
          <div className="card">
            <div className="card-header"><span className="card-title">Risk Profile Distribution</span></div>
            <div className="card-body">
              {Object.entries(stats.risk_breakdown).map(([risk, count]) => (
                <div key={risk} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: 13, color: riskColors[risk] || 'var(--text-secondary)' }}>{risk}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{count}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3 }}>
                    <div style={{ height: '100%', borderRadius: 3, width: `${(count / stats.vcf_analyses) * 100}%`, background: riskColors[risk] || 'var(--text-muted)', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Patient List ───────────────────────────────────────────────
function PatientList() {
  const { authFetch } = useAuth();
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const url = search ? `/doctor/patients?search=${encodeURIComponent(search)}` : '/doctor/patients';
      const r = await authFetch(url);
      setPatients(await r.json());
    } catch (e) {} finally { setLoading(false); }
  }, [search]);

  useEffect(() => { loadPatients(); }, [search]);

  return (
    <div className="animate-up">
      <div className="page-header flex justify-between items-center">
        <div><h2 className="page-title">Patient Management</h2><p className="page-subtitle">All registered patients · Click to view history</p></div>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="search-bar" style={{ flex: 1, maxWidth: 320 }}>
            <span className="search-icon">🔍</span>
            <input className="form-input search-bar-input" placeholder="Search by name or code..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{patients.length} patients</span>
        </div>
        <div className="table-container">
          <table>
            <thead><tr><th>Patient</th><th>Code</th><th>Blood Type</th><th>Latest Vitals</th><th>Records</th><th>Rx</th><th>Analyses</th><th></th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
              ) : patients.map(p => (
                <tr key={p.id} onClick={() => navigate(`/doctor/patient/${p.id}`)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: 'white', flexShrink: 0 }}>{p.full_name?.charAt(0)}</div>
                      <div><div style={{ fontWeight: 600, fontSize: 13 }}>{p.full_name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.gender} · {p.date_of_birth}</div></div>
                    </div>
                  </td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-cyan)' }}>{p.patient_code}</span></td>
                  <td><span className="badge badge-safe">{p.blood_type || '—'}</span></td>
                  <td>
                    {p.latest_vitals ? (
                      <div style={{ fontSize: 11 }}>
                        <div>♥ {p.latest_vitals.heart_rate} bpm</div>
                        <div>{p.latest_vitals.systolic_bp}/{p.latest_vitals.diastolic_bp} mmHg</div>
                        <div>SpO₂ {p.latest_vitals.oxygen_saturation}%</div>
                      </div>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No data</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>{p.record_count}</td>
                  <td style={{ textAlign: 'center' }}>{p.prescription_count}</td>
                  <td style={{ textAlign: 'center' }}>{p.vcf_analysis_count}</td>
                  <td><button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); navigate(`/doctor/patient/${p.id}`); }}>View →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && patients.length === 0 && <div className="empty-state"><div className="empty-icon">👥</div><div className="empty-title">No patients found</div></div>}
        </div>
      </div>
    </div>
  );
}

// ── Patient Detail ─────────────────────────────────────────────
function PatientDetail() {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const [history, setHistory] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showRxModal, setShowRxModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [dashboardCharts, setDashboardCharts] = useState(null);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    authFetch(`/doctor/patient/${id}/history`).then(r => r.json()).then(setHistory).catch(() => {});
  }, [id]);

  const loadDashboard = async () => {
    setLoadingCharts(true);
    try {
      const r = await authFetch(`/doctor/patient/${id}/dashboard`);
      const data = await r.json();
      setDashboardCharts(data.charts);
    } catch (e) {} finally { setLoadingCharts(false); }
  };

  useEffect(() => { if (activeTab === 'dashboard') loadDashboard(); }, [activeTab]);

  if (!history) return <div className="loading-screen"><div className="loading-spinner" /></div>;

  const p = history.patient;

  return (
    <div className="animate-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/doctor/patients')}>← Back</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: 'white' }}>{p.full_name?.charAt(0)}</div>
            <div>
              <h2 className="page-title">{p.full_name}</h2>
              <p className="page-subtitle">{p.patient_code} · {p.gender} · DOB: {p.date_of_birth} · Blood: {p.blood_type}</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowRxModal(true)}>💊 Add Rx</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowRecordModal(true)}>📋 Add Record</button>
        </div>
      </div>

      {/* Allergies / conditions banner */}
      {(p.allergies || p.chronic_conditions) && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {p.allergies && <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 'var(--radius-md)', padding: '8px 14px', fontSize: 12, color: 'var(--accent-rose)' }}>⚠️ Allergies: {p.allergies}</div>}
          {p.chronic_conditions && <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 'var(--radius-md)', padding: '8px 14px', fontSize: 12, color: 'var(--accent-amber)' }}>🏥 Conditions: {p.chronic_conditions}</div>}
        </div>
      )}

      {/* Tabs */}
      <div className="tab-nav">
        {[['overview', '📊 Overview'], ['records', '📋 Records'], ['prescriptions', '💊 Prescriptions'], ['vcf', '🧬 Genomic Analysis'], ['vitals', '💓 Vitals'], ['dashboard', '📈 R Dashboard'], ['rag', '🤖 AI Query']].map(([t, label]) => (
          <button key={t} className={`tab-btn ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>{label}</button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="animate-up">
          <div className="grid-2">
            <div className="card"><div className="card-header"><span className="card-title">Patient Info</span></div><div className="card-body">
              {[['Code', p.patient_code], ['DOB', p.date_of_birth], ['Gender', p.gender], ['Blood Type', p.blood_type], ['Insurance', p.insurance_id], ['Emergency', p.emergency_contact]].map(([k, v]) => v && (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div></div>
            <div className="card"><div className="card-header"><span className="card-title">Summary</span></div><div className="card-body">
              {[['Medical Records', history.medical_records.length], ['Prescriptions', history.prescriptions.length], ['VCF Analyses', history.vcf_analyses.length], ['Vitals Entries', history.vitals.length], ['Nurse Reports', history.nurse_reports.length]].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{v}</span>
                </div>
              ))}
            </div></div>
          </div>
          {/* Latest vitals */}
          {history.vitals.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-header"><span className="card-title">Latest Vitals</span><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{history.vitals[0].recorded_at?.slice(0, 16).replace('T', ' ')} · {history.vitals[0].nurse_name}</span></div>
              <div className="card-body">
                <div className="vitals-grid">
                  {[['♥', history.vitals[0].heart_rate, 'bpm', 'HR', 'var(--accent-rose)'], ['🩸', `${history.vitals[0].systolic_bp}/${history.vitals[0].diastolic_bp}`, 'mmHg', 'Blood Pressure', 'var(--accent-blue)'], ['🌡️', history.vitals[0].temperature, '°C', 'Temperature', 'var(--accent-amber)'], ['💨', history.vitals[0].oxygen_saturation, '%', 'SpO₂', 'var(--accent-emerald)'], ['💨', history.vitals[0].respiratory_rate, '/min', 'Resp. Rate', 'var(--accent-cyan)']].map(([icon, val, unit, label, color]) => (
                    <div key={label} className="vital-card">
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
                      <div className="vital-value" style={{ color }}>{val || '—'}</div>
                      <div className="vital-unit">{unit}</div>
                      <div className="vital-label">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Records tab */}
      {activeTab === 'records' && (
        <div className="animate-up">
          {history.medical_records.map(r => (
            <div key={r.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{r.title}</span>
                    <span className="badge badge-adjust">{r.record_type}</span>
                    {r.severity === 'critical' && <span className="badge badge-critical">Critical</span>}
                  </div>
                  {r.diagnosis && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Dx: {r.diagnosis} {r.icd_code && <span style={{ color: 'var(--text-muted)' }}>({r.icd_code})</span>}</div>}
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.description}</div>
                </div>
                <div style={{ textAlign: 'right', marginLeft: 12, flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.created_at?.slice(0, 10)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.doctor_name}</div>
                  <BlockchainBadge hash={r.blockchain_hash} />
                </div>
              </div>
            </div>
          ))}
          {history.medical_records.length === 0 && <div className="empty-state"><div className="empty-icon">📋</div><div className="empty-title">No records yet</div></div>}
        </div>
      )}

      {/* Prescriptions tab */}
      {activeTab === 'prescriptions' && (
        <div className="animate-up">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowRxModal(true)}>+ Add Prescription</button>
          </div>
          {history.prescriptions.map(rx => (
            <div key={rx.id} className={`prescription-card ${(rx.pgx_risk_label || '').toLowerCase().replace(' ', '_')}`} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{rx.drug_name}</span>
                    <RiskBadge risk={rx.pgx_risk_label} />
                    {rx.pgx_severity && <SeverityBadge severity={rx.pgx_severity} />}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>{rx.dosage} · {rx.frequency} · {rx.duration}</div>
                  {rx.instructions && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{rx.instructions}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                  <span className="badge badge-active" style={{ marginBottom: 6, display: 'block' }}>{rx.status}</span>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rx.created_at?.slice(0, 10)}</div>
                  <BlockchainBadge hash={rx.blockchain_hash} />
                </div>
              </div>
            </div>
          ))}
          {history.prescriptions.length === 0 && <div className="empty-state"><div className="empty-icon">💊</div><div className="empty-title">No prescriptions yet</div></div>}
        </div>
      )}

      {/* VCF analyses tab */}
      {activeTab === 'vcf' && (
        <div className="animate-up">
          <VCFAnalysisTab patientId={parseInt(id)} existingAnalyses={history.vcf_analyses} />
        </div>
      )}

      {/* Vitals tab */}
      {activeTab === 'vitals' && (
        <div className="animate-up">
          <div className="card">
            <div className="card-header"><span className="card-title">Vitals History</span></div>
            <div className="table-container">
              <table>
                <thead><tr><th>Date/Time</th><th>HR (bpm)</th><th>BP (mmHg)</th><th>Temp (°C)</th><th>SpO₂ (%)</th><th>Resp.</th><th>Nurse</th></tr></thead>
                <tbody>
                  {history.vitals.map(v => (
                    <tr key={v.id}>
                      <td style={{ fontSize: 12 }}>{v.recorded_at?.slice(0, 16).replace('T', ' ')}</td>
                      <td style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>{v.heart_rate}</td>
                      <td>{v.systolic_bp}/{v.diastolic_bp}</td>
                      <td>{v.temperature}</td>
                      <td style={{ color: v.oxygen_saturation < 95 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>{v.oxygen_saturation}</td>
                      <td>{v.respiratory_rate}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.nurse_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {history.vitals.length === 0 && <div className="empty-state"><div className="empty-icon">💓</div><div className="empty-title">No vitals recorded</div></div>}
            </div>
          </div>
        </div>
      )}

      {/* R Dashboard tab */}
      {activeTab === 'dashboard' && (
        <div className="animate-up">
          {loadingCharts ? (
            <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto 12px' }} /><p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Generating dashboard charts...</p></div>
          ) : dashboardCharts ? (
            <div>
              <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>Rendered via: {dashboardCharts.method}</div>
              {dashboardCharts.vitals && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="card-header"><span className="card-title">📈 Vitals Trend Analysis</span></div>
                  <div className="card-body" style={{ padding: 0 }}>
                    <img src={`data:image/png;base64,${dashboardCharts.vitals}`} alt="Vitals Chart" style={{ width: '100%', display: 'block' }} />
                  </div>
                </div>
              )}
              {dashboardCharts.risk && (
                <div className="card">
                  <div className="card-header"><span className="card-title">🧬 Risk Distribution Dashboard</span></div>
                  <div className="card-body" style={{ padding: 0 }}>
                    <img src={`data:image/png;base64,${dashboardCharts.risk}`} alt="Risk Chart" style={{ width: '100%', display: 'block' }} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state"><div className="empty-icon">📊</div><div className="empty-title">No dashboard data</div><div className="empty-desc">Charts will appear once the patient has vitals and analyses</div></div>
          )}
        </div>
      )}

      {/* RAG AI Query tab */}
      {activeTab === 'rag' && (
        <div className="animate-up">
          <div className="card">
            <div className="card-header">
              <span className="card-title">🤖 AI Clinical Assistant</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>RAG-powered queries on {p.full_name}'s data</span>
            </div>
            <RAGChat patientId={parseInt(id)} contextLabel={p.full_name} />
          </div>
        </div>
      )}

      {/* Add Prescription Modal */}
      {showRxModal && <AddPrescriptionModal patientId={id} onClose={() => setShowRxModal(false)} onSave={() => { setShowRxModal(false); authFetch(`/doctor/patient/${id}/history`).then(r => r.json()).then(setHistory); }} authFetch={authFetch} />}
      {/* Add Record Modal */}
      {showRecordModal && <AddRecordModal patientId={id} onClose={() => setShowRecordModal(false)} onSave={() => { setShowRecordModal(false); authFetch(`/doctor/patient/${id}/history`).then(r => r.json()).then(setHistory); }} authFetch={authFetch} />}
    </div>
  );
}

// ── VCF Analysis Tab ───────────────────────────────────────────
function VCFAnalysisTab({ patientId, existingAnalyses }) {
  const { authFetch, BASE_URL, token } = useAuth();
  const fileInputRef = React.useRef(null);
  const [vcfFile, setVcfFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scanStatus, setScanStatus] = useState(null);
  const [scanError, setScanError] = useState('');
  const [availableDrugs, setAvailableDrugs] = useState([]);
  const [unavailableDrugs, setUnavailableDrugs] = useState([]);
  const [selectedDrugs, setSelectedDrugs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    setVcfFile(file);
    setScanStatus('scanning');
    setScanError('');
    setAvailableDrugs([]);
    setUnavailableDrugs([]);
    setSelectedDrugs([]);
    setResults([]);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`${BASE_URL}/detect_drugs/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.ok) {
        const data = await res.json();
        // Backend returns [{drug,gene,variants_found}] — extract name strings
        setAvailableDrugs((data.available_drugs || []).map(d => typeof d === 'string' ? d : d.drug));
        setUnavailableDrugs((data.unavailable_drugs || []).map(d => typeof d === 'string' ? d : d.drug));
        setScanStatus('done');
      } else {
        setScanStatus('error');
        setScanError('Server could not process this VCF file.');
      }
    } catch (e) {
      setScanStatus('error');
      setScanError('Network error — check backend is running.');
    }
  };

  const removeFile = () => {
    setVcfFile(null);
    setScanStatus(null);
    setScanError('');
    setAvailableDrugs([]);
    setUnavailableDrugs([]);
    setSelectedDrugs([]);
    setResults([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleDrug = (drug) => {
    setSelectedDrugs(prev => prev.includes(drug) ? prev.filter(d => d !== drug) : [...prev, drug]);
  };

  const runAnalysis = async () => {
    if (!vcfFile || selectedDrugs.length === 0) return;
    setIsLoading(true);
    setError('');
    const newResults = [];
    for (const drug of selectedDrugs) {
      const fd = new FormData();
      fd.append('file', vcfFile);
      try {
        const r = await authFetch(`/doctor/patient/${patientId}/vcf-analysis?drug=${drug}`, { method: 'POST', body: fd });
        if (r.ok) newResults.push(await r.json());
        else newResults.push({ _drug: drug, error: 'Analysis failed' });
      } catch (e) { newResults.push({ _drug: drug, error: e.message }); }
    }
    setResults(newResults);
    setIsLoading(false);
  };

  const fmt = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div>
      <div className="grid-2" style={{ gap: 20 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">🧬 Upload & Analyze VCF</span></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Drop zone */}
            {!vcfFile && (
              <div
                style={{ border: `2px dashed ${isDragging ? 'var(--accent-cyan)' : 'var(--border-default)'}`, borderRadius: 'var(--radius-md)', padding: '32px 16px', textAlign: 'center', cursor: 'pointer', background: isDragging ? 'rgba(6,182,212,0.05)' : 'var(--bg-secondary)', transition: 'all 0.2s', userSelect: 'none' }}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              >
                <div style={{ fontSize: 32, marginBottom: 10, filter: 'drop-shadow(0 0 8px rgba(6,182,212,0.4))' }}>🧬</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Drop VCF file here or click to browse</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>.vcf or .vcf.gz supported</div>
              </div>
            )}
            {/* File card */}
            {vcfFile && (
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: 22 }}>📄</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vcfFile.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt(vcfFile.size)}</div>
                  </div>
                  <button onClick={removeFile} style={{ background: 'transparent', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, padding: '3px 8px' }}>✕</button>
                </div>
                {scanStatus === 'scanning' && (
                  <div style={{ padding: '10px 14px', background: 'rgba(6,182,212,0.05)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--accent-cyan)' }}>
                    <div className="spinner" /><span>Scanning VCF for pharmacogenes…</span>
                  </div>
                )}
                {scanStatus === 'done' && (
                  <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.06)', fontSize: 12, color: 'var(--accent-emerald)', fontWeight: 600 }}>
                    {availableDrugs.length} drugs available for analysis
                  </div>
                )}
                {scanStatus === 'error' && (
                  <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.06)', fontSize: 12, color: 'var(--accent-rose)', fontWeight: 600 }}>⚠️ {scanError}</div>
                )}
              </div>
            )}
            {/* Hidden file input — ref-based, no global id */}
            <input ref={fileInputRef} type="file" accept=".vcf,.gz" style={{ display: 'none' }}
              onChange={(e) => { if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]); }} />
            {/* Drug selection */}
            {availableDrugs.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>SELECT DRUGS ({selectedDrugs.length} selected)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {availableDrugs.map(drug => (
                    <button key={drug} onClick={() => toggleDrug(drug)} style={{ padding: '5px 12px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', background: selectedDrugs.includes(drug) ? 'rgba(6,182,212,0.15)' : 'var(--bg-elevated)', border: selectedDrugs.includes(drug) ? '1px solid var(--accent-cyan)' : '1px solid var(--border-default)', color: selectedDrugs.includes(drug) ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>{drug}</button>
                  ))}
                </div>
                {unavailableDrugs.length > 0 && <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>No data for: {unavailableDrugs.join(', ')}</div>}
              </div>
            )}
            {error && <div style={{ color: 'var(--accent-rose)', fontSize: 12 }}>⚠️ {error}</div>}
            <button className="btn btn-primary" onClick={runAnalysis} disabled={!vcfFile || selectedDrugs.length === 0 || isLoading || scanStatus === 'scanning'}>
              {isLoading ? <><div className="spinner" /> Analyzing...</> : `🧬 Analyze ${selectedDrugs.length} Drug${selectedDrugs.length !== 1 ? 's' : ''} & Save`}
            </button>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Analysis Results</span></div>
          <div className="card-body">
            {results.length > 0 ? results.map((r, i) => (
              <div key={i} style={{ marginBottom: 12, padding: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700 }}>{r.drug || r._drug}</span>
                  {r.risk_assessment && <RiskBadge risk={r.risk_assessment.risk_label} />}
                </div>
                {r.pharmacogenomic_profile?.[0] && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Gene: {r.pharmacogenomic_profile[0].primary_gene} · {r.pharmacogenomic_profile[0].diplotype} · Phenotype: {r.pharmacogenomic_profile[0].phenotype}</div>}
                {r.clinical_recommendation && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{r.clinical_recommendation.recommendation}</div>}
                {r.blockchain_hash && <div style={{ marginTop: 6 }}><BlockchainBadge hash={r.blockchain_hash} /></div>}
                {r.error && <div style={{ color: 'var(--accent-rose)', fontSize: 12 }}>Error: {r.error}</div>}
              </div>
            )) : <div className="empty-state"><div className="empty-icon">🧬</div><div className="empty-title">Run an analysis to see results</div></div>}
          </div>
        </div>
      </div>
      {existingAnalyses?.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header"><span className="card-title">Past Analyses ({existingAnalyses.length})</span></div>
          <div className="table-container">
            <table>
              <thead><tr><th>Drug</th><th>Risk</th><th>Severity</th><th>Gene</th><th>Diplotype</th><th>Phenotype</th><th>Recommendation</th><th>Date</th><th>Blockchain</th></tr></thead>
              <tbody>
                {existingAnalyses.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.drug}</td>
                    <td><RiskBadge risk={a.risk_label} /></td>
                    <td><SeverityBadge severity={a.severity} /> {a.severity}</td>
                    <td><span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{a.primary_gene}</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{a.diplotype}</td>
                    <td>{a.phenotype}</td>
                    <td style={{ maxWidth: 200, fontSize: 12 }}>{a.recommendation}</td>
                    <td style={{ fontSize: 11 }}>{a.created_at?.slice(0, 10)}</td>
                    <td><BlockchainBadge hash={a.blockchain_hash} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add Prescription Modal ─────────────────────────────────────
function AddPrescriptionModal({ patientId, onClose, onSave, authFetch }) {
  const [form, setForm] = useState({ drug_name: '', dosage: '', frequency: '', duration: '', instructions: '', pgx_risk_label: '', pgx_severity: '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await authFetch(`/doctor/patient/${patientId}/prescription`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      onSave();
    } catch (e) { alert('Error saving prescription'); } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">💊 Add Prescription</span><button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Drug Name *</label><input className="form-input" value={form.drug_name} onChange={e => setForm(f => ({ ...f, drug_name: e.target.value }))} placeholder="e.g. Warfarin" /></div>
            <div className="form-group"><label className="form-label">Dosage *</label><input className="form-input" value={form.dosage} onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))} placeholder="e.g. 5mg" /></div>
            <div className="form-group"><label className="form-label">Frequency *</label><input className="form-input" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} placeholder="e.g. Once daily" /></div>
            <div className="form-group"><label className="form-label">Duration</label><input className="form-input" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="e.g. 30 days" /></div>
            <div className="form-group"><label className="form-label">PGx Risk</label>
              <select className="form-select" value={form.pgx_risk_label} onChange={e => setForm(f => ({ ...f, pgx_risk_label: e.target.value }))}>
                <option value="">None</option><option>Safe</option><option>Adjust Dosage</option><option>Toxic</option><option>Ineffective</option><option>Unknown</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">PGx Severity</label>
              <select className="form-select" value={form.pgx_severity} onChange={e => setForm(f => ({ ...f, pgx_severity: e.target.value }))}>
                <option value="">None</option><option value="none">None</option><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option><option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="form-group"><label className="form-label">Instructions</label><textarea className="form-textarea" value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} placeholder="Patient instructions..." /></div>
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.drug_name}>{saving ? 'Saving...' : 'Save Prescription'}</button></div>
      </div>
    </div>
  );
}

// ── Add Record Modal ───────────────────────────────────────────
function AddRecordModal({ patientId, onClose, onSave, authFetch }) {
  const [form, setForm] = useState({ record_type: 'diagnosis', title: '', description: '', diagnosis: '', icd_code: '', severity: 'moderate', notes: '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await authFetch(`/doctor/patient/${patientId}/record`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      onSave();
    } catch (e) { alert('Error saving record'); } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">📋 Add Medical Record</span><button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Type</label>
              <select className="form-select" value={form.record_type} onChange={e => setForm(f => ({ ...f, record_type: e.target.value }))}>
                <option value="diagnosis">Diagnosis</option><option value="lab">Lab Results</option><option value="imaging">Imaging</option><option value="surgery">Surgery</option><option value="urgent">Urgent Care</option><option value="follow_up">Follow-up</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">Severity</label>
              <select className="form-select" value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                <option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option><option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Record title" /></div>
          <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detailed description..." /></div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Diagnosis</label><input className="form-input" value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} placeholder="Clinical diagnosis" /></div>
            <div className="form-group"><label className="form-label">ICD Code</label><input className="form-input" value={form.icd_code} onChange={e => setForm(f => ({ ...f, icd_code: e.target.value }))} placeholder="e.g. I10" /></div>
          </div>
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.title}>{saving ? 'Saving...' : 'Save Record'}</button></div>
      </div>
    </div>
  );
}

// ── VCF Standalone Page ────────────────────────────────────────
function VCFPage() {
  const { BASE_URL, token } = useAuth();
  const fileInputRef = React.useRef(null);
  const [vcfFile, setVcfFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scanStatus, setScanStatus] = useState(null); // null|'scanning'|'done'|'error'
  const [scanError, setScanError] = useState('');
  const [selectedDrugs, setSelectedDrugs] = useState([]);
  const [availableDrugs, setAvailableDrugs] = useState([]);
  const [unavailableDrugs, setUnavailableDrugs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [activeResultDrug, setActiveResultDrug] = useState(null);
  const [viewMode, setViewMode] = useState('patient');
  const [recentAnalyses] = useState([
    { name: 'PATIENT_001', sub: '3 drugs • risk', date: new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) },
    { name: 'PATIENT_001', sub: '2 drugs • risk', date: new Date(Date.now() - 86400000).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) },
  ]);

  const handleFile = async (file) => {
    if (!file) return;
    setVcfFile(file);
    setScanStatus('scanning');
    setScanError('');
    setAvailableDrugs([]);
    setUnavailableDrugs([]);
    setSelectedDrugs([]);
    setResults([]);
    setActiveResultDrug(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`${BASE_URL}/detect_drugs/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.ok) {
        const data = await res.json();
        // Backend returns [{drug,gene,variants_found}] — extract name strings
        setAvailableDrugs((data.available_drugs || []).map(d => typeof d === 'string' ? d : d.drug));
        setUnavailableDrugs((data.unavailable_drugs || []).map(d => typeof d === 'string' ? d : d.drug));
        setScanStatus('done');
      } else {
        setScanStatus('error');
        setScanError('Could not process this VCF file.');
      }
    } catch (e) {
      setScanStatus('error');
      setScanError('Network error — check backend is running.');
    }
  };

  const removeFile = () => {
    setVcfFile(null);
    setScanStatus(null);
    setScanError('');
    setAvailableDrugs([]);
    setUnavailableDrugs([]);
    setSelectedDrugs([]);
    setResults([]);
    setActiveResultDrug(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleDrug = (drug) => {
    setSelectedDrugs(prev => prev.includes(drug) ? prev.filter(d => d !== drug) : [...prev, drug]);
  };

  const fmt = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes/1024).toFixed(1)} KB`;
    return `${(bytes/1048576).toFixed(1)} MB`;
  };

  // Derive current step
  const currentStep = !vcfFile ? 1 : scanStatus === 'scanning' ? 1 : availableDrugs.length === 0 ? 2 : selectedDrugs.length === 0 ? 3 : results.length > 0 ? 4 : 3;

  const runAnalysis = async () => {
    if (!vcfFile || selectedDrugs.length === 0) return;
    setIsLoading(true);
    setError('');
    const newResults = [];
    for (const drug of selectedDrugs) {
      const fd = new FormData();
      fd.append('file', vcfFile);
      try {
        const r = await fetch(`${BASE_URL}/process_vcf/?drug=${drug}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (r.ok) newResults.push({ ...(await r.json()), _drug: drug });
        else newResults.push({ _drug: drug, error: 'Failed' });
      } catch (e) {
        newResults.push({ _drug: drug, error: e.message });
      }
    }
    setResults(newResults);
    setIsLoading(false);
    if (newResults.length > 0) setActiveResultDrug(newResults[0]._drug || newResults[0].drug);
  };

  const activeResult = results.find(r => (r._drug || r.drug) === activeResultDrug);
  const allGenes = ['CYP2D6', 'CYP2C19', 'CYP2C9', 'SLC01B1', 'TPMT', 'DPYD'];

  // Build risk matrix from results
  const riskMatrix = {};
  allGenes.forEach(gene => { riskMatrix[gene] = {}; });
  results.forEach(r => {
    const drug = r._drug || r.drug;
    const profiles = r.pharmacogenomic_profile || [];
    profiles.forEach(p => {
      if (riskMatrix[p.primary_gene]) {
        riskMatrix[p.primary_gene][drug] = r.risk_assessment?.risk_label || 'No PGx Data';
      }
    });
  });

  const getRiskClass = (label) => {
    if (!label || label === 'No PGx Data') return 'nopgx';
    if (label === 'Safe') return 'safe';
    if (label === 'Adjust Dosage') return 'adjust';
    if (label === 'Toxic') return 'toxic';
    return 'nopgx';
  };

  const getRiskIcon = (label) => {
    if (!label || label === 'No PGx Data') return '—';
    if (label === 'Safe') return '✓';
    if (label === 'Adjust Dosage') return '⚠';
    if (label === 'Toxic') return '✕';
    return '—';
  };

  // Detected variants — from all results combined
  const allVariants = results.flatMap(r =>
    (r.pharmacogenomic_profile || []).flatMap(p =>
      (p.variants || []).map(v => ({ gene: p.primary_gene, rsid: v }))
    )
  );

  return (
    <div className="animate-up" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      {/* ── Left Panel: Analysis Console ── */}
      <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Step indicator */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🔬 Analysis Console</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Configure your pharmacogenomic analysis</span>
          </div>
          <div className="card-body" style={{ paddingBottom: 8 }}>
            <div className="analysis-steps">
              {[
                [1, 'Upload VCF'],
                [2, 'Detect Genes'],
                [3, 'Select Drugs'],
                [4, 'View Results'],
              ].map(([n, label]) => (
                <div key={n} className={`analysis-step${currentStep === n ? ' active' : currentStep > n ? ' done' : ''}`}>
                  <div className="analysis-step-num">{currentStep > n ? '✓' : n}</div>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* VCF Upload + Drug Selection — inline, self-contained */}
        <div className="card">
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Drop zone */}
            {!vcfFile && (
              <div
                style={{ border: `2px dashed ${isDragging ? 'var(--accent-cyan)' : 'var(--border-default)'}`, borderRadius: 'var(--radius-md)', padding: '28px 16px', textAlign: 'center', cursor: 'pointer', background: isDragging ? 'rgba(6,182,212,0.05)' : 'var(--bg-secondary)', transition: 'all 0.2s', userSelect: 'none' }}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              >
                <div style={{ fontSize: 28, marginBottom: 8, filter: 'drop-shadow(0 0 8px rgba(6,182,212,0.4))' }}>🧬</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Drop VCF file here or click to browse</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>.vcf or .vcf.gz supported</div>
              </div>
            )}
            {/* File card */}
            {vcfFile && (
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: 20 }}>📄</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vcfFile.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt(vcfFile.size)}</div>
                  </div>
                  <button onClick={removeFile} style={{ background: 'transparent', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, padding: '2px 7px' }}>✕</button>
                </div>
                {scanStatus === 'scanning' && (
                  <div style={{ padding: '8px 12px', background: 'rgba(6,182,212,0.05)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--accent-cyan)' }}>
                    <div className="spinner" /><span>Scanning pharmacogenes…</span>
                  </div>
                )}
                {scanStatus === 'done' && (
                  <div style={{ padding: '8px 12px', background: 'rgba(16,185,129,0.06)', fontSize: 12, color: 'var(--accent-emerald)', fontWeight: 600 }}>✅ {availableDrugs.length} drugs detected</div>
                )}
                {scanStatus === 'error' && (
                  <div style={{ padding: '8px 12px', background: 'rgba(244,63,94,0.06)', fontSize: 12, color: 'var(--accent-rose)', fontWeight: 600 }}>⚠️ {scanError}</div>
                )}
              </div>
            )}
            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept=".vcf,.gz" style={{ display: 'none' }}
              onChange={(e) => { if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]); }} />
            {/* Drug pills */}
            {availableDrugs.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>SELECT DRUGS ({selectedDrugs.length} selected)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {availableDrugs.map(drug => (
                    <button key={drug} onClick={() => toggleDrug(drug)} style={{ padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', background: selectedDrugs.includes(drug) ? 'rgba(6,182,212,0.15)' : 'var(--bg-elevated)', border: selectedDrugs.includes(drug) ? '1px solid var(--accent-cyan)' : '1px solid var(--border-default)', color: selectedDrugs.includes(drug) ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>{drug}</button>
                  ))}
                </div>
                {unavailableDrugs.length > 0 && <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-muted)' }}>No data: {unavailableDrugs.join(', ')}</div>}
              </div>
            )}
            {error && <div style={{ color: 'var(--accent-rose)', fontSize: 12 }}>⚠️ {error}</div>}
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={runAnalysis}
              disabled={!vcfFile || selectedDrugs.length === 0 || isLoading || scanStatus === 'scanning'}>
              {isLoading ? <><div className="spinner" /> Analyzing...</> : `▶ Analyze ${selectedDrugs.length || 0} Drug${selectedDrugs.length !== 1 ? 's' : ''} →`}
            </button>
          </div>
        </div>

        {/* Recent Analyses */}
        <div className="card">
          <div className="card-header"><span className="card-title">Recent Analyses</span></div>
          <div className="card-body" style={{ padding: '8px 0' }}>
            <div className="recent-analyses-list">
              {recentAnalyses.map((a, i) => (
                <div key={i} className="recent-analysis-item">
                  <div className="recent-analysis-dot" />
                  <div style={{ flex: 1 }}>
                    <div className="recent-analysis-name">{a.name}</div>
                    <div className="recent-analysis-sub">{a.sub}</div>
                  </div>
                  <div className="recent-analysis-date">{a.date}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel: Results ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {results.length === 0 ? (
          <div className="card" style={{ flex: 1 }}>
            <div className="card-body">
              <div className="empty-state" style={{ padding: 80 }}>
                <div className="empty-icon" style={{ fontSize: 56, opacity: 0.4 }}>🧬</div>
                <div className="empty-title">Upload a VCF file to begin analysis</div>
                <div className="empty-desc">Select drugs and click Analyze to see your pharmacogenomic report</div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Drug tabs */}
            <div className="card">
              <div className="result-drug-tabs">
                {results.map(r => {
                  const drug = r._drug || r.drug;
                  return (
                    <button
                      key={drug}
                      className={`result-drug-tab${activeResultDrug === drug ? ' active' : ''}`}
                      onClick={() => { setActiveResultDrug(drug); setViewMode('patient'); }}
                    >
                      🧬 {drug}
                    </button>
                  );
                })}
                <button
                  className={`result-drug-tab${viewMode === 'matrix' ? ' active' : ''}`}
                  onClick={() => setViewMode('matrix')}
                >
                  ⊞ Risk Matrix
                </button>
              </div>

              {viewMode === 'matrix' ? (
                /* ── Gene × Drug Risk Matrix ── */
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span className="card-title">⊞ Gene × Drug Risk Matrix</span>
                    <button className="btn btn-ghost btn-sm">⬇ Export PNG</button>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="risk-matrix-table">
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left' }}>GENE</th>
                          {results.map(r => <th key={r._drug || r.drug}>{r._drug || r.drug}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {allGenes.map(gene => (
                          <tr key={gene}>
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', paddingLeft: 8 }}>
                              ⊠ {gene}
                            </td>
                            {results.map(r => {
                              const drug = r._drug || r.drug;
                              const label = riskMatrix[gene]?.[drug];
                              const cls = getRiskClass(label);
                              return (
                                <td key={drug}>
                                  <div className={`risk-matrix-cell ${cls}`}>
                                    <span className="cell-icon">{getRiskIcon(label)}</span>
                                    <span>{label || 'No PGx Data'}</span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop: 16, display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--accent-emerald)' }}>✓ Safe</span>
                    <span style={{ color: 'var(--accent-amber)' }}>⚠ Adjust Dosage</span>
                    <span style={{ color: 'var(--text-muted)' }}>— No PGx Data</span>
                  </div>
                </div>
              ) : activeResult ? (
                /* ── Patient Result View ── */
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Patient Record */}
                  <div className="card" style={{ background: 'var(--bg-elevated)' }}>
                    <div className="card-body">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📋</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Patient Record</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                            {activeResult.patient_id || activeResult.filename?.replace('.vcf', '') || 'PATIENT_001'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>🕐 {new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}</span>
                          <span className="badge badge-safe">✓ Verified</span>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Variants</div>
                          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
                            {activeResult.pharmacogenomic_profile?.reduce((s, p) => s + (p.variants?.length || 0), 0) || allVariants.length || '—'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Genes Analyzed</div>
                          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
                            {activeResult.pharmacogenomic_profile?.length || 1}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Risk + Recommendation */}
                  <div className="grid-2" style={{ gap: 12 }}>
                    <div className="card" style={{
                      background: activeResult.risk_assessment?.risk_label === 'Safe'
                        ? 'rgba(16,185,129,0.08)' : activeResult.risk_assessment?.risk_label === 'Adjust Dosage'
                        ? 'rgba(245,158,11,0.08)' : 'var(--bg-elevated)',
                      border: '1px solid ' + (activeResult.risk_assessment?.risk_label === 'Safe'
                        ? 'rgba(16,185,129,0.3)' : activeResult.risk_assessment?.risk_label === 'Adjust Dosage'
                        ? 'rgba(245,158,11,0.3)' : 'var(--border-subtle)'),
                      padding: 16,
                    }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>RISK ASSESSMENT</div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: activeResult.risk_assessment?.risk_label === 'Safe' ? 'var(--accent-emerald)' : activeResult.risk_assessment?.risk_label === 'Adjust Dosage' ? 'var(--accent-amber)' : 'var(--text-primary)' }}>
                        {activeResult.risk_assessment?.risk_label || 'Unknown'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Overall Risk Level</div>
                    </div>
                    <div className="card" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)', padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>💊</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Clinical Recommendation</div>
                          <span style={{ fontSize: 10, color: 'var(--accent-amber)', fontWeight: 600 }}>Priority</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{activeResult.clinical_recommendation?.recommendation || 'Standard dosing.'}</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>🖨 Print Report</button>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>📋 Copy JSON</button>
                      </div>
                    </div>
                  </div>

                  {/* Pharmacogenomic Profile */}
                  {activeResult.pharmacogenomic_profile?.map((p, pi) => (
                    <div key={pi} className="card" style={{ background: 'var(--bg-elevated)' }}>
                      <div className="card-header">
                        <span className="card-title">⊠ Pharmacogenomic Profile</span>
                      </div>
                      <div className="card-body">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>{p.primary_gene}</div>
                          <span className="badge badge-safe" style={{ fontSize: 12 }}>🟢 {p.phenotype}</span>
                          <div style={{ display: 'flex', gap: 16, marginLeft: 'auto', fontSize: 13 }}>
                            <div><span style={{ color: 'var(--text-muted)' }}>Diplotype: </span><span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{p.diplotype}</span></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>Phenotype: </span><span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>{p.phenotype}</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Detected Variants */}
                  {allVariants.length > 0 && (
                    <div className="card">
                      <div className="card-header">
                        <span className="card-title">⊞ Detected Variants</span>
                      </div>
                      <div style={{ padding: '0 4px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>GENE</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>⊞ RSID</span>
                        </div>
                        <div className="variants-list">
                          {allVariants.slice(0, 9).map((v, i) => (
                            <div key={i} className="variant-row">
                              <div className="variant-gene">
                                <span className="variant-gene-icon">⊠</span>
                                {v.gene}
                              </div>
                              <div className="variant-rsid">{v.rsid}</div>
                              <button className="variant-expand">∨</button>
                            </div>
                          ))}
                        </div>
                        <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                          Showing {Math.min(allVariants.length, 9)} variants
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI Clinical Analysis */}
                  <div className="ai-analysis-card">
                    <div className="ai-analysis-header">
                      <div className="ai-avatar">🤖</div>
                      <div>
                        <div className="ai-analysis-title">AI Clinical Analysis</div>
                        <div className="ai-analysis-subtitle">Generated by PharmaGuard AI</div>
                      </div>
                    </div>
                    <div className="ai-analysis-text">
                      {activeResult.pharmacogenomic_profile?.[0]
                        ? `${activeResult.pharmacogenomic_profile[0].primary_gene} ${activeResult.pharmacogenomic_profile[0].diplotype || ''} results in ${activeResult.pharmacogenomic_profile[0].phenotype || 'NM'} phenotype affecting ${activeResultDrug}.`
                        : `Analysis complete for ${activeResultDrug}. ${activeResult.clinical_recommendation?.recommendation || 'Review clinical recommendations above.'}`
                      }
                    </div>
                    <div className="ai-analysis-badges">
                      <span className="ai-badge evidence">👤 Evidence-based</span>
                      <span className="ai-badge updated">🟡 Updated daily</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── RAG Page ───────────────────────────────────────────────────
function RAGPage() {
  return (
    <div className="animate-up">
      <div className="page-header"><h2 className="page-title">🤖 AI Clinical Assistant</h2><p className="page-subtitle">RAG-powered queries across all patient data</p></div>
      <div className="card">
        <div className="card-header"><span className="card-title">Ask a Clinical Question</span></div>
        <RAGChat contextLabel="all patients" />
      </div>
    </div>
  );
}

// ── Doctor Dashboard (R charts for all patients) ───────────────
function DoctorDashboardR() {
  return (
    <div className="animate-up">
      <div className="page-header"><h2 className="page-title">📊 R Analytics Dashboard</h2><p className="page-subtitle">Open an individual patient to view their R-generated charts</p></div>
      <div className="empty-state" style={{ padding: 60 }}>
        <div className="empty-icon">📊</div>
        <div className="empty-title">Select a patient</div>
        <div className="empty-desc">Navigate to a patient's detail page and open the R Dashboard tab to view generated analytics.</div>
      </div>
    </div>
  );
}

// ── Main Router ────────────────────────────────────────────────
export default function DoctorDashboard() {
  return (
    <Routes>
      <Route path="/" element={<DoctorOverview />} />
      <Route path="/patients" element={<PatientList />} />
      <Route path="/patient/:id" element={<PatientDetail />} />
      <Route path="/vcf" element={<VCFPage />} />
      <Route path="/rag" element={<RAGPage />} />
      <Route path="/dashboard" element={<DoctorDashboardR />} />
    </Routes>
  );
}
