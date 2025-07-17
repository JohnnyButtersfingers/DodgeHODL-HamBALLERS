import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useContracts } from '../hooks/useContracts';
import { zkLogger } from '../services/zkAnalyticsService';

const QASummaryModal = ({ isOpen, onClose }) => {
  const { address } = useWallet();
  const { getPlayerStats, getPlayerBadges } = useContracts();
  
  const [qaSummary, setQaSummary] = useState(null);
  const [testWallets, setTestWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    if (isOpen) {
      fetchQASummary();
      fetchTestWalletStates();
    }
  }, [isOpen]);

  const fetchQASummary = async () => {
    setLoading(true);
    try {
      // Try to fetch the latest QA report
      const response = await fetch('/qa-suite-report-latest.json').catch(() => null);
      if (response?.ok) {
        const summary = await response.json();
        setQaSummary(summary);
        
        // Load individual module results
        if (summary.modules) {
          const moduleResults = {};
          for (const module of summary.modules) {
            try {
              const moduleResponse = await fetch(`/qa-reports/${module.name}-report.json`);
              if (moduleResponse.ok) {
                moduleResults[module.name] = await moduleResponse.json();
              }
            } catch (error) {
              console.warn(`Failed to load module ${module.name}:`, error);
            }
          }
          setTestResults(moduleResults);
        }
      } else {
        // Generate a mock summary for development
        setQaSummary(generateMockQASummary());
      }
    } catch (error) {
      console.error('Error fetching QA summary:', error);
      setQaSummary(generateMockQASummary());
    } finally {
      setLoading(false);
    }
  };

  const fetchTestWalletStates = async () => {
    const wallets = [
      { 
        name: 'Test Wallet 1', 
        address: process.env.REACT_APP_TEST_WALLET_1,
        key: process.env.REACT_APP_TEST_WALLET_1_PRIVATE_KEY?.slice(0, 10) + '...'
      },
      { 
        name: 'Test Wallet 2', 
        address: process.env.REACT_APP_TEST_WALLET_2,
        key: process.env.REACT_APP_TEST_WALLET_2_PRIVATE_KEY?.slice(0, 10) + '...'
      },
      { 
        name: 'Test Wallet 3', 
        address: process.env.REACT_APP_TEST_WALLET_3,
        key: process.env.REACT_APP_TEST_WALLET_3_PRIVATE_KEY?.slice(0, 10) + '...'
      },
      { 
        name: 'Connected Wallet', 
        address: address,
        key: 'Connected via browser'
      }
    ].filter(wallet => wallet.address);

    // Fetch state for each wallet
    const walletStates = await Promise.all(
      wallets.map(async (wallet) => {
        try {
          const [stats, badges] = await Promise.all([
            getPlayerStats(wallet.address),
            getPlayerBadges(wallet.address)
          ]);

          return {
            ...wallet,
            stats: {
              currentXp: stats?.currentXp || 0,
              level: stats?.level || 1,
              totalRuns: stats?.totalRuns || 0,
              totalDbp: stats?.totalDbpEarned || 0
            },
            badges: badges || [],
            status: 'ready'
          };
        } catch (error) {
          return {
            ...wallet,
            stats: null,
            badges: [],
            status: 'error',
            error: error.message
          };
        }
      })
    );

    setTestWallets(walletStates);
  };

  const runTestModule = async (moduleName) => {
    console.log(`Running test module: ${moduleName}`);
    // In a real implementation, this would trigger the specific test module
    alert(`Test module "${moduleName}" would be executed here`);
  };

  const generateMockQASummary = () => {
    return {
      title: 'QA Suite Summary (Mock)',
      generated: new Date().toISOString(),
      version: '1.0.0',
      environment: 'testnet',
      summary: {
        total: 5,
        passed: 4,
        failed: 1,
        skipped: 0,
        successRate: 80,
        duration: '2m 15s'
      },
      modules: [
        {
          name: 'e2e-qa-testing',
          title: 'End-to-End QA Testing',
          status: 'passed',
          tests: 12,
          passed: 12,
          failed: 0,
          duration: '45s',
          file: './qa/e2e-qa-testing.js'
        },
        {
          name: 'contract-verification',
          title: 'Contract Verification',
          status: 'passed',
          tests: 4,
          passed: 4,
          failed: 0,
          duration: '30s',
          file: './qa/verify-contracts.js'
        },
        {
          name: 'thirdweb-integration',
          title: 'Thirdweb Integration',
          status: 'passed',
          tests: 3,
          passed: 3,
          failed: 0,
          duration: '20s',
          file: './qa/thirdweb-integration.js'
        },
        {
          name: 'zk-analytics-monitor',
          title: 'ZK Analytics & Monitoring',
          status: 'passed',
          tests: 8,
          passed: 8,
          failed: 0,
          duration: '25s',
          file: './qa/zk-analytics-monitor.js'
        },
        {
          name: 'mobile-optimization',
          title: 'Mobile Optimization',
          status: 'failed',
          tests: 6,
          passed: 4,
          failed: 2,
          duration: '15s',
          file: './qa/mobile-optimization.js',
          failedTests: ['Badge modal overflow', 'XP popup positioning']
        }
      ],
      recommendations: [
        'Fix mobile badge modal overflow issue',
        'Adjust XP popup positioning on small screens',
        'Consider adding more comprehensive ZK proof error handling',
        'Implement additional contract error recovery mechanisms'
      ]
    };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'skipped': return 'text-yellow-400';
      case 'running': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'skipped': return '⏭️';
      case 'running': return '🔄';
      default: return '❓';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white">🔧 QA Summary & Developer Tools</h2>
            <p className="text-gray-400 mt-1">Test status, wallet states, and development utilities</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-white">Loading QA data...</span>
            </div>
          ) : (
            <div className="space-y-8">
              {/* QA Summary Overview */}
              {qaSummary && (
                <div className="bg-gray-700 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">📊 Latest QA Run</h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">{qaSummary.summary?.total || 0}</div>
                      <div className="text-gray-400 text-sm">Total Tests</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{qaSummary.summary?.passed || 0}</div>
                      <div className="text-gray-400 text-sm">Passed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-400">{qaSummary.summary?.failed || 0}</div>
                      <div className="text-gray-400 text-sm">Failed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">{qaSummary.summary?.successRate || 0}%</div>
                      <div className="text-gray-400 text-sm">Success Rate</div>
                    </div>
                  </div>

                  <div className="text-gray-400 text-sm mb-4">
                    Generated: {new Date(qaSummary.generated).toLocaleString()} | 
                    Duration: {qaSummary.summary?.duration || 'Unknown'}
                  </div>
                </div>
              )}

              {/* Test Modules */}
              {qaSummary?.modules && (
                <div className="bg-gray-700 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">🧪 Test Modules</h3>
                  
                  <div className="space-y-3">
                    {qaSummary.modules.map((module, index) => (
                      <div
                        key={index}
                        className="bg-gray-800 rounded-lg p-4 hover:bg-gray-600 transition-colors cursor-pointer"
                        onClick={() => setSelectedModule(selectedModule === index ? null : index)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">{getStatusIcon(module.status)}</span>
                            <div>
                              <div className={`font-medium ${getStatusColor(module.status)}`}>
                                {module.title}
                              </div>
                              <div className="text-gray-400 text-sm">
                                {module.passed}/{module.tests} tests passed • {module.duration}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                runTestModule(module.name);
                              }}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                            >
                              Run
                            </button>
                            <span className="text-gray-400 text-sm">
                              {selectedModule === index ? '▼' : '▶'}
                            </span>
                          </div>
                        </div>

                        {/* Expanded Module Details */}
                        {selectedModule === index && (
                          <div className="mt-4 pt-4 border-t border-gray-600">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-400">File:</span>
                                <span className="ml-2 text-white font-mono">{module.file}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Status:</span>
                                <span className={`ml-2 ${getStatusColor(module.status)}`}>
                                  {module.status.toUpperCase()}
                                </span>
                              </div>
                            </div>
                            
                            {module.failedTests && module.failedTests.length > 0 && (
                              <div className="mt-3">
                                <div className="text-gray-400 text-sm mb-2">Failed Tests:</div>
                                <ul className="list-disc list-inside text-red-400 text-sm space-y-1">
                                  {module.failedTests.map((test, i) => (
                                    <li key={i}>{test}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {testResults[module.name] && (
                              <div className="mt-3">
                                <div className="text-gray-400 text-sm mb-2">Detailed Results:</div>
                                <pre className="bg-gray-900 rounded p-3 text-xs text-gray-300 overflow-x-auto">
                                  {JSON.stringify(testResults[module.name], null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Test Wallets State */}
              <div className="bg-gray-700 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">👛 Test Wallet States</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {testWallets.map((wallet, index) => (
                    <div key={index} className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-white font-medium">{wallet.name}</h4>
                        <span className={`px-2 py-1 rounded text-xs ${
                          wallet.status === 'ready' ? 'bg-green-800 text-green-300' :
                          wallet.status === 'error' ? 'bg-red-800 text-red-300' :
                          'bg-gray-600 text-gray-300'
                        }`}>
                          {wallet.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-400 font-mono mb-3">
                        {wallet.address ? `${wallet.address.slice(0, 8)}...${wallet.address.slice(-6)}` : 'Not configured'}
                      </div>
                      
                      {wallet.stats ? (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">XP:</span>
                            <span className="text-purple-400">{wallet.stats.currentXp}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Level:</span>
                            <span className="text-yellow-400">{wallet.stats.level}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Runs:</span>
                            <span className="text-blue-400">{wallet.stats.totalRuns}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Badges:</span>
                            <span className="text-green-400">{wallet.badges.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">DBP:</span>
                            <span className="text-green-400">{parseFloat(wallet.stats.totalDbp || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-red-400 text-sm">
                          {wallet.error || 'Unable to load wallet data'}
                        </div>
                      )}
                      
                      <div className="mt-3 text-xs text-gray-500">
                        Key: {wallet.key}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {qaSummary?.recommendations && (
                <div className="bg-gray-700 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">💡 Recommendations</h3>
                  
                  <ul className="space-y-2">
                    {qaSummary.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-yellow-400 mt-1">•</span>
                        <span className="text-gray-300 text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 bg-gray-900">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div>QA Developer Tools - HamBaller.xyz</div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchQASummary}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
              >
                Refresh
              </button>
              <button
                onClick={() => window.open('/qa-suite-report-latest.json', '_blank')}
                className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded"
              >
                Raw JSON
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QASummaryModal;