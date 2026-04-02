import React, { useState, useEffect } from 'react';

const DrugSelector = ({ availableDrugs, unavailableDrugs, onDrugsSelected, disabled }) => {
  const [selectedDrugs, setSelectedDrugs] = useState([]);

  // Auto-select all available drugs when they are loaded
  useEffect(() => {
    if (availableDrugs && availableDrugs.length > 0) {
      const allAvailable = availableDrugs.map(d => d.drug);
      setSelectedDrugs(allAvailable);
      onDrugsSelected(allAvailable);
    } else {
      setSelectedDrugs([]);
      onDrugsSelected([]);
    }
  }, [availableDrugs, onDrugsSelected]);

  const toggleDrug = (drugName) => {
    const newSelection = selectedDrugs.includes(drugName)
      ? selectedDrugs.filter(d => d !== drugName)
      : [...selectedDrugs, drugName];
      
    setSelectedDrugs(newSelection);
    onDrugsSelected(newSelection);
  };

  const selectAll = () => {
    const allAvailable = availableDrugs.map(d => d.drug);
    setSelectedDrugs(allAvailable);
    onDrugsSelected(allAvailable);
  };

  const deselectAll = () => {
    setSelectedDrugs([]);
    onDrugsSelected([]);
  };

  if (disabled) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center transition-colors duration-300">
        <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-600">
          <i className="fas fa-pills text-3xl"></i>
        </div>
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Drugs Available Yet</h4>
        <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto">
          📂 Upload a VCF file first to securely detect which pharmacogenes are present and see which drugs can be analyzed for this patient.
        </p>
      </div>
    );
  }

  // Handle case where VCF was uploaded but no pharmacogenes found at all
  if (availableDrugs.length === 0 && unavailableDrugs.length > 0) {
    return (
      <div className="bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-200 dark:border-rose-800/50 rounded-xl p-6 transition-colors duration-300">
        <div className="flex items-start space-x-3">
          <i className="fas fa-exclamation-triangle text-rose-500 mt-0.5"></i>
          <div>
            <h4 className="text-sm font-semibold text-rose-800 dark:text-rose-400">No Actionable Pharmacogenes Found</h4>
            <p className="text-xs text-rose-600 dark:text-rose-300/80 mt-1">
              ⚠️ No pharmacogenomic variants were detected in this VCF file. Please upload a pharmacogenomics-specific VCF or verify the file contents.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {availableDrugs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center">
              <i className="fas fa-check-circle text-emerald-500 mr-2"></i>
              Available for Analysis
            </h3>
            <div className="text-xs space-x-2">
              <button onClick={selectAll} className="text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-700">Select All</button>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <button onClick={deselectAll} className="text-slate-500 dark:text-slate-400 hover:underline">Deselect All</button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            {availableDrugs.map(item => {
              const checked = selectedDrugs.includes(item.drug);
              return (
                <div 
                  key={item.drug}
                  onClick={() => toggleDrug(item.drug)}
                  className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all duration-200
                    ${checked 
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 shadow-sm' 
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-200'}`}
                >
                  <div className="flex-shrink-0 mr-3">
                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors
                      ${checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                      {checked && <i className="fas fa-check text-[10px]"></i>}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-semibold ${checked ? 'text-emerald-800 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {item.drug}
                      </span>
                      {!item.has_actionable_variants && (
                        <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded font-medium" title="No actionable variants found for this gene.">
                          <i className="fas fa-exclamation-triangle mr-1"></i>
                          Warning
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                      {item.gene} · {item.variants_found} variant{item.variants_found !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {unavailableDrugs.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center">
            <i className="fas fa-times-circle text-slate-400 mr-2"></i>
            Not Available
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {unavailableDrugs.map(item => (
              <div 
                key={item.drug}
                className="flex items-center p-3 rounded-xl border border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-800/30 opacity-75 group relative"
                title={`Upload a VCF containing ${item.gene} variants to analyze ${item.drug}`}
              >
                <div className="flex-shrink-0 mr-3">
                  <div className="w-5 h-5 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center bg-slate-100 dark:bg-slate-700/50 text-slate-300">
                    <i className="fas fa-times text-[10px]"></i>
                  </div>
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-slate-400 dark:text-slate-500 line-through decoration-slate-300 dark:decoration-slate-600">
                    {item.drug}
                  </span>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {item.reason}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DrugSelector;
