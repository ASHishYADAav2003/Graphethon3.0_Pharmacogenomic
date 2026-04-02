// components/VCFUploader.jsx — VCF file picker with auto-detection
import React, { useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function VCFUploader({ onFileSelected, selectedFile, onDrugsDetected }) {
  const { authFetch, BASE_URL, token } = useAuth();
  const dropRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) { onFileSelected(null); return; }
    onFileSelected(file);
    
    // Auto-detect available drugs
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`${BASE_URL}/detect_drugs/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      if (res.ok) {
        const data = await res.json();
        onDrugsDetected(data.available_drugs || [], data.unavailable_drugs || []);
      } else {
        onDrugsDetected([], []);
      }
    } catch (e) {
      onDrugsDetected([], []);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.vcf') || file.name.endsWith('.gz'))) {
      handleFile(file);
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  return (
    <div>
      <label className="form-label">VCF File</label>
      <div
        ref={dropRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          border: '2px dashed',
          borderColor: selectedFile ? 'var(--accent-emerald)' : 'var(--border-default)',
          borderRadius: 'var(--radius-md)',
          padding: '24px 16px',
          textAlign: 'center',
          cursor: 'pointer',
          background: selectedFile ? 'rgba(16,185,129,0.05)' : 'var(--bg-secondary)',
          transition: 'all 0.2s'
        }}
        onClick={() => document.getElementById('vcf-file-input').click()}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>{selectedFile ? '✅' : '🧬'}</div>
        <div style={{ fontSize: 13, color: selectedFile ? 'var(--accent-emerald)' : 'var(--text-secondary)', fontWeight: selectedFile ? 600 : 400 }}>
          {selectedFile ? selectedFile.name : 'Drop VCF file here or click to browse'}
        </div>
        {!selectedFile && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>.vcf or .vcf.gz supported</div>}
      </div>
      <input
        id="vcf-file-input"
        type="file"
        accept=".vcf,.gz"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files[0])}
      />
      {selectedFile && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 6 }}
          onClick={() => { onFileSelected(null); document.getElementById('vcf-file-input').value = ''; }}
        >
          ✕ Remove file
        </button>
      )}
    </div>
  );
}