// App.jsx
import React, { useState, useEffect } from 'react';
import './App.css';
import VCFUploader from './components/VCFUploader';
import DrugSelector from './components/DrugSelector';
import ResultsDashboard from './components/ResultsDashboard';
import GenomicHeatmap from './components/GenomicHeatmap';
import RawDataInspector from './components/RawDataInspector';
import ThemeToggle from './components/ThemeToggle';
import { analyzePGx } from './services/api';

function App() {
  const [vcfFile, setVcfFile] = useState(null);
  const [selectedDrugs, setSelectedDrugs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showRawData, setShowRawData] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('analysis');
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  
  // VCF Detection state
  const [availableDrugs, setAvailableDrugs] = useState([]);
  const [unavailableDrugs, setUnavailableDrugs] = useState([]);

  // Load recent analyses from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentAnalyses');
    if (saved) {
      setRecentAnalyses(JSON.parse(saved));
    }
  }, []);

  const handleRunAnalysis = async (specificDrugs = null) => {
    // Determine which drugs to run. Support direct injection from heatmap
    const drugsToRun = Array.isArray(specificDrugs) ? specificDrugs : selectedDrugs;
    
    if (!vcfFile || drugsToRun.length === 0) {
      setError('Please upload a VCF file and select at least one drug');
      return;
    }

    if (Array.isArray(specificDrugs)) {
      setSelectedDrugs(drugsToRun);
    }

    setIsLoading(true);
    setError(null);
    if (!Array.isArray(specificDrugs)) {
      setAnalysisResult([]); // Clear on new full run
    }

    try {
      const result = await analyzePGx(vcfFile, drugsToRun, (partialResult) => {
        setAnalysisResult(prev => {
           const arr = prev ? [...prev] : [];
           const idx = arr.findIndex(r => r._drug === partialResult._drug);
           if (idx >= 0) arr[idx] = partialResult;
           else arr.push(partialResult);
           return arr;
        });
      });
      // End result guarantees `result` equals what the callback generated.
      setAnalysisResult(result);
      
      // Save to recent analyses
      const firstResult = Array.isArray(result) ? result[0] : result;
      const newAnalysis = {
        id: Date.now(),
        patientId: firstResult?.patient_id || 'Unknown',
        timestamp: new Date().toISOString(),
        drugCount: selectedDrugs.length,
        riskLevel: firstResult?.risk_label?.level
      };
      
      const updated = [newAnalysis, ...recentAnalyses.slice(0, 4)];
      setRecentAnalyses(updated);
      localStorage.setItem('recentAnalyses', JSON.stringify(updated));
      
    } catch (err) {
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearAnalysis = () => {
    setAnalysisResult(null);
    setShowRawData(false);
    setVcfFile(null);
    setSelectedDrugs([]);
    setAvailableDrugs([]);
    setUnavailableDrugs([]);
    setIsScanning(false);
  };

  const currentStep = !vcfFile ? 1 : isScanning ? 2 : (!analysisResult && !isLoading ? 3 : 4);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                <i className="fas fa-dna text-white text-sm"></i>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 transition-colors duration-300">PharmaGuard PGx</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Pharmacogenomic Analysis Platform</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm ml-4 border-l border-slate-200 dark:border-slate-700 pl-4">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-slate-600 dark:text-slate-400">System Online</span>
              </div>
              <div className="flex items-center pl-2">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar - Analyzer */}
          <div className="lg:w-96">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden sticky top-24 transition-colors duration-300">
              {/* Sidebar Header */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4">
                <h2 className="text-white font-semibold flex items-center">
                  <i className="fas fa-flask mr-2"></i>
                  Analysis Console
                </h2>
                <p className="text-xs text-slate-400 mt-1">Configure your pharmacogenomic analysis</p>
                
                {/* Step Indicator */}
                <div className="mt-4 flex flex-col space-y-2 relative">
                  <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-slate-700"></div>
                  
                  <div className={`flex items-center space-x-3 relative z-10 opacity-${currentStep >= 1 ? '100' : '50'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${currentStep >= 1 ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-400'}`}>1</div>
                    <span className={`text-xs ${currentStep === 1 ? 'text-white font-semibold' : 'text-slate-400'}`}>Upload VCF</span>
                  </div>
                  
                  <div className={`flex items-center space-x-3 relative z-10 opacity-${currentStep >= 2 ? '100' : '50'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${currentStep >= 2 ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-400'}`}>2</div>
                    <span className={`text-xs ${currentStep === 2 ? 'text-white font-semibold' : 'text-slate-400'}`}>Detect Genes</span>
                  </div>
                  
                  <div className={`flex items-center space-x-3 relative z-10 opacity-${currentStep >= 3 ? '100' : '50'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${currentStep >= 3 ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-400'}`}>3</div>
                    <span className={`text-xs ${currentStep === 3 ? 'text-white font-semibold' : 'text-slate-400'}`}>Select Drugs</span>
                  </div>
                  
                  <div className={`flex items-center space-x-3 relative z-10 opacity-${currentStep >= 4 ? '100' : '50'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${currentStep >= 4 ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-400'}`}>4</div>
                    <span className={`text-xs ${currentStep === 4 ? 'text-white font-semibold' : 'text-slate-400'}`}>View Results</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <VCFUploader 
                  onFileSelected={(file) => {
                    setVcfFile(file);
                    if (!file) clearAnalysis();
                    else setIsScanning(true);
                  }}
                  selectedFile={vcfFile}
                  onDrugsDetected={(avail, unavail) => {
                    setAvailableDrugs(avail);
                    setUnavailableDrugs(unavail);
                    setIsScanning(false);
                  }}
                />
                
                <DrugSelector 
                  availableDrugs={availableDrugs}
                  unavailableDrugs={unavailableDrugs}
                  onDrugsSelected={setSelectedDrugs}
                  disabled={!vcfFile}
                />
                
                {error && (
                  <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-lg">
                    <div className="flex">
                      <i className="fas fa-exclamation-circle text-rose-500 mr-3"></i>
                      <div>
                        <p className="text-sm text-rose-700 font-medium">Error</p>
                        <p className="text-xs text-rose-600 mt-1">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Analysis Controls */}
                <div className="space-y-3">
                  <button
                    onClick={() => handleRunAnalysis()}
                    disabled={isLoading || isScanning || !vcfFile || selectedDrugs.length === 0}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 
                             text-white py-3 px-4 rounded-xl font-medium
                             hover:from-cyan-600 hover:to-blue-700 
                             transition-all disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-slate-700 dark:disabled:to-slate-700 dark:disabled:text-slate-500
                             disabled:cursor-not-allowed disabled:hover:shadow-none
                             shadow-lg shadow-cyan-200 dark:shadow-none hover:shadow-xl
                             flex items-center justify-center space-x-2"
                  >
                    {isLoading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-play"></i>
                        <span>{selectedDrugs.length > 0 ? `Analyze ${selectedDrugs.length} Selected Drug${selectedDrugs.length > 1 ? 's' : ''} →` : 'Run Analysis'}</span>
                      </>
                    )}
                  </button>

                  {analysisResult && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowRawData(!showRawData)}
                        className="flex-1 border border-slate-200 bg-white text-slate-700 
                                 py-2 px-4 rounded-xl font-medium hover:bg-slate-50 
                                 transition-colors text-sm flex items-center justify-center space-x-2"
                      >
                        <i className={`fas fa-code ${showRawData ? 'text-cyan-500' : 'text-slate-400'}`}></i>
                        <span>{showRawData ? 'Hide JSON File' : 'View JSON File'}</span>
                      </button>
                      
                      <button
                        onClick={clearAnalysis}
                        className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                        title="New Analysis"
                      >
                        <i className="fas fa-plus text-slate-400"></i>
                      </button>
                    </div>
                  )}
                </div>

                {/* Recent Analyses */}
                {recentAnalyses.length > 0 && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700 transition-colors duration-300">
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                      Recent Analyses
                    </h3>
                    <div className="space-y-2">
                      {recentAnalyses.map(analysis => (
                        <button
                          key={analysis.id}
                          className="w-full p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${
                                analysis.riskLevel === 'Critical' ? 'bg-rose-500' :
                                analysis.riskLevel === 'High' ? 'bg-amber-500' :
                                'bg-emerald-500'
                              }`}></div>
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors duration-300">
                                {analysis.patientId}
                              </span>
                            </div>
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                              {new Date(analysis.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 transition-colors duration-300">
                            {analysis.drugCount} drugs • {analysis.riskLevel} risk
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            {/* Loading State */}
            {isLoading && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 transition-colors duration-300">
                <div className="flex flex-col items-center justify-center">
                  <div className="relative w-32 h-32 mb-6">
                    {/* DNA Helix Animation */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-24 h-24 border-4 border-slate-200 border-t-cyan-500 rounded-full animate-spin"></div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl">
                        <i className="fas fa-dna text-white text-2xl animate-pulse"></i>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2 transition-colors duration-300">Analyzing Genetic Data</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md transition-colors duration-300">
                    Processing VCF file and cross-referencing with pharmacogenomic databases. 
                    This may take a few moments...
                  </p>
                  
                  {/* Progress steps */}
                  <div className="mt-8 space-y-3 w-64">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                        <i className="fas fa-check text-emerald-600 text-xs"></i>
                      </div>
                      <span className="text-sm text-slate-600">VCF validation</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-cyan-100 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-cyan-600 rounded-full animate-ping"></div>
                      </div>
                      <span className="text-sm text-slate-600 font-medium">Variant calling</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                      </div>
                      <span className="text-sm text-slate-400">Clinical interpretation</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Raw Data View */}
            {!isLoading && showRawData && analysisResult && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <RawDataInspector data={analysisResult} />
              </div>
            )}

            {/* Results Dashboard */}
            {(!isLoading || (analysisResult && analysisResult.length > 0)) && !showRawData && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                <GenomicHeatmap 
                  results={analysisResult || []} 
                  inputDrugs={selectedDrugs}
                  isLoading={isLoading}
                  onAnalyze={async (drug) => {
                    // Start partial loading state without global blockage
                    setAnalysisResult(prev => {
                       const arr = prev ? [...prev] : [];
                       const idx = arr.findIndex(r => r._drug === drug);
                       const loadObj = { _drug: drug, isLoading: true };
                       if (idx >= 0) arr[idx] = loadObj;
                       else arr.push(loadObj);
                       return arr;
                    });
                    await analyzePGx(vcfFile, [drug], (partial) => {
                        setAnalysisResult(prev => {
                           const arr = prev ? [...prev] : [];
                           const idx = arr.findIndex(r => r._drug === partial._drug);
                           if (idx >= 0) arr[idx] = partial;
                           else arr.push(partial);
                           return arr;
                        });
                    });
                  }} 
                />
                {!isLoading && analysisResult && analysisResult.some(r => !r.error && !r.isLoading) && (
                   <ResultsDashboard data={analysisResult.filter(r => !r.error && !r.isLoading)} />
                )}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !analysisResult && !error && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 transition-colors duration-300">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-3xl flex items-center justify-center mb-6 transition-colors duration-300">
                    <i className="fas fa-dna text-4xl text-slate-400 dark:text-slate-300"></i>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2 transition-colors duration-300">
                    Welcome to PharmaGuard PGx
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8 transition-colors duration-300">
                    Upload a VCF file and select drugs of interest to begin pharmacogenomic analysis. 
                    Get instant insights into drug-gene interactions.
                  </p>
                  
                  {/* Feature grid */}
                  <div className="grid grid-cols-3 gap-4 max-w-2xl">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-cyan-50 dark:bg-cyan-900/30 rounded-xl flex items-center justify-center mx-auto mb-2 transition-colors duration-300">
                        <i className="fas fa-bolt text-cyan-600 dark:text-cyan-400"></i>
                      </div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors duration-300">Real-time analysis</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mx-auto mb-2 transition-colors duration-300">
                        <i className="fas fa-shield-alt text-purple-600 dark:text-purple-400"></i>
                      </div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors duration-300">HIPAA compliant</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mx-auto mb-2 transition-colors duration-300">
                        <i className="fas fa-robot text-emerald-600 dark:text-emerald-400"></i>
                      </div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors duration-300">AI-powered insights</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-8 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <div className="flex items-center space-x-4">
              <span>© 2026 Team_Garudaa. All rights reserved.</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <span>v1.0.0</span>
            </div>
            <div className="flex items-center space-x-4">
              <a href="https://rift2026.vercel.app/" target='_blank' className="hover:text-slate-700 transition-colors">RIFT 2026</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;