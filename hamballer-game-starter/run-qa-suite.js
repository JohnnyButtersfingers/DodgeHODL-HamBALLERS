#!/usr/bin/env node

/**
 * Comprehensive QA Suite Runner
 * 
 * Orchestrates all QA and testing components:
 * 1. End-to-End QA Testing
 * 2. Contract Verification 
 * 3. Thirdweb Integration
 * 4. ZK Analytics & Monitoring Setup
 */

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Import our testing modules
const E2ETestSuite = require('./e2e-qa-testing');
const ContractVerifier = require('./verify-contracts');
const ThirdwebIntegrator = require('./thirdweb-integration');
const { zkMonitor, zkLogger } = require('./zk-analytics-monitor');

// Configuration
const QA_SUITE_CONFIG = {
  modules: {
    e2eTesting: process.env.RUN_E2E_TESTS !== 'false',
    contractVerification: process.env.RUN_CONTRACT_VERIFICATION !== 'false',
    thirdwebIntegration: process.env.RUN_THIRDWEB_INTEGRATION !== 'false',
    zkAnalytics: process.env.RUN_ZK_ANALYTICS !== 'false'
  },
  reporting: {
    generateSummary: true,
    saveToFile: true,
    uploadToSupabase: process.env.UPLOAD_RESULTS === 'true'
  },
  environment: process.env.NODE_ENV || 'development'
};

class QASuiteRunner {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
    this.errors = [];
  }

  async runFullSuite() {
    console.log('🚀 Starting Comprehensive QA Suite...\n');
    console.log(`Environment: ${QA_SUITE_CONFIG.environment}`);
    console.log(`Modules to run: ${Object.entries(QA_SUITE_CONFIG.modules)
      .filter(([_, enabled]) => enabled)
      .map(([name, _]) => name)
      .join(', ')}\n`);

    try {
      // Pre-flight checks
      await this.performPreflightChecks();

      // Module execution
      if (QA_SUITE_CONFIG.modules.zkAnalytics) {
        await this.runZKAnalyticsSetup();
      }

      if (QA_SUITE_CONFIG.modules.contractVerification) {
        await this.runContractVerification();
      }

      if (QA_SUITE_CONFIG.modules.thirdwebIntegration) {
        await this.runThirdwebIntegration();
      }

      if (QA_SUITE_CONFIG.modules.e2eTesting) {
        await this.runE2ETesting();
      }

      // Generate final report
      await this.generateFinalReport();

      console.log('\n🎉 QA Suite completed successfully!');
      return this.results;

    } catch (error) {
      console.error('\n❌ QA Suite failed:', error.message);
      this.errors.push({
        module: 'main',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      await this.generateErrorReport();
      throw error;
    }
  }

  async performPreflightChecks() {
    console.log('🔍 Performing pre-flight checks...\n');

    const checks = [
      {
        name: 'Node.js Version',
        check: () => {
          const version = process.version;
          const major = parseInt(version.slice(1).split('.')[0]);
          return major >= 16;
        },
        message: 'Node.js 16+ required'
      },
      {
        name: 'Environment Variables',
        check: () => {
          const required = ['ABSTRACT_RPC_URL'];
          return required.every(env => process.env[env]);
        },
        message: 'Missing required environment variables'
      },
      {
        name: 'Project Structure',
        check: async () => {
          const paths = ['contracts', 'backend', 'frontend'];
          const checks = await Promise.all(
            paths.map(async p => {
              try {
                await fs.access(path.join(__dirname, p));
                return true;
              } catch {
                return false;
              }
            })
          );
          return checks.every(Boolean);
        },
        message: 'Missing required project directories'
      }
    ];

    for (const check of checks) {
      try {
        const result = await check.check();
        if (result) {
          console.log(`✅ ${check.name}`);
        } else {
          throw new Error(check.message);
        }
      } catch (error) {
        console.error(`❌ ${check.name}: ${error.message}`);
        throw error;
      }
    }

    console.log('\n✅ Pre-flight checks passed\n');
  }

  async runZKAnalyticsSetup() {
    console.log('🔍 Setting up ZK Analytics & Monitoring...\n');

    try {
      // Initialize ZK monitoring
      await zkMonitor.initialize();
      
      // Test logging functionality
      await zkLogger.logProofAttempt({
        playerAddress: '0x1234567890123456789012345678901234567890',
        claimedXP: 100,
        nullifier: 'test-nullifier-' + Date.now()
      });

      // Generate initial analytics report
      const analyticsReport = await zkLogger.generateReport('1h');
      
      this.results.push({
        module: 'ZK Analytics',
        status: 'completed',
        duration: this.getDuration(),
        data: {
          monitoringActive: true,
          reportGenerated: true,
          analyticsData: analyticsReport
        }
      });

      console.log('✅ ZK Analytics setup completed\n');

    } catch (error) {
      console.error(`❌ ZK Analytics setup failed: ${error.message}\n`);
      this.errors.push({
        module: 'ZK Analytics',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      this.results.push({
        module: 'ZK Analytics',
        status: 'failed',
        duration: this.getDuration(),
        error: error.message
      });
    }
  }

  async runContractVerification() {
    console.log('🔍 Running Contract Verification...\n');

    try {
      const verifier = new ContractVerifier();
      await verifier.verifyAllContracts();

      this.results.push({
        module: 'Contract Verification',
        status: 'completed',
        duration: this.getDuration(),
        data: {
          results: verifier.results,
          reportFile: 'verification-report.json'
        }
      });

      console.log('✅ Contract verification completed\n');

    } catch (error) {
      console.error(`❌ Contract verification failed: ${error.message}\n`);
      this.errors.push({
        module: 'Contract Verification',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      this.results.push({
        module: 'Contract Verification',
        status: 'failed',
        duration: this.getDuration(),
        error: error.message
      });
    }
  }

  async runThirdwebIntegration() {
    console.log('🔗 Running Thirdweb Integration...\n');

    try {
      const integrator = new ThirdwebIntegrator();
      await integrator.integrateContracts();

      this.results.push({
        module: 'Thirdweb Integration',
        status: 'completed',
        duration: this.getDuration(),
        data: {
          results: integrator.results,
          configFile: 'thirdweb-config.json',
          guideFile: 'THIRDWEB_INTEGRATION.md'
        }
      });

      console.log('✅ Thirdweb integration completed\n');

    } catch (error) {
      console.error(`❌ Thirdweb integration failed: ${error.message}\n`);
      this.errors.push({
        module: 'Thirdweb Integration',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      this.results.push({
        module: 'Thirdweb Integration',
        status: 'failed',
        duration: this.getDuration(),
        error: error.message
      });
    }
  }

  async runE2ETesting() {
    console.log('🧪 Running End-to-End Testing...\n');

    try {
      const testSuite = new E2ETestSuite();
      const testReport = await testSuite.runAllTests();

      // Log test results to ZK analytics
      if (QA_SUITE_CONFIG.modules.zkAnalytics) {
        await this.logTestResultsToZK(testReport);
      }

      this.results.push({
        module: 'E2E Testing',
        status: testReport.summary.failedTests === 0 ? 'completed' : 'completed_with_failures',
        duration: this.getDuration(),
        data: {
          summary: testReport.summary,
          results: testReport.results,
          reportFile: 'e2e-test-report.json'
        }
      });

      console.log('✅ E2E testing completed\n');

    } catch (error) {
      console.error(`❌ E2E testing failed: ${error.message}\n`);
      this.errors.push({
        module: 'E2E Testing',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      this.results.push({
        module: 'E2E Testing',
        status: 'failed',
        duration: this.getDuration(),
        error: error.message
      });
    }
  }

  async logTestResultsToZK(testReport) {
    try {
      // Log successful ZK proof tests
      const zkProofTests = testReport.results.filter(r => 
        r.test.includes('ZK Proof') || r.test.includes('Nullifier')
      );

      for (const test of zkProofTests) {
        if (test.passed) {
          await zkLogger.logProofSuccess({
            playerAddress: 'test-wallet',
            claimedXP: 100,
            nullifier: 'test-' + Date.now(),
            testContext: test.test
          });
        } else {
          await zkLogger.logProofFailure({
            playerAddress: 'test-wallet',
            claimedXP: 100,
            reason: test.data?.error || 'Test failure',
            testContext: test.test
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to log test results to ZK analytics:', error.message);
    }
  }

  async generateFinalReport() {
    console.log('📊 Generating final QA report...\n');

    const totalDuration = Date.now() - this.startTime;
    const completedModules = this.results.filter(r => r.status === 'completed' || r.status === 'completed_with_failures');
    const failedModules = this.results.filter(r => r.status === 'failed');

    const finalReport = {
      title: 'HamBaller.xyz QA Suite Report',
      generated: new Date().toISOString(),
      environment: QA_SUITE_CONFIG.environment,
      duration: {
        total: totalDuration,
        formatted: this.formatDuration(totalDuration)
      },
      summary: {
        totalModules: this.results.length,
        completed: completedModules.length,
        failed: failedModules.length,
        successRate: ((completedModules.length / this.results.length) * 100).toFixed(1)
      },
      modules: this.results,
      errors: this.errors,
      recommendations: this.generateRecommendations(),
      nextSteps: this.generateNextSteps()
    };

    // Save report
    if (QA_SUITE_CONFIG.reporting.saveToFile) {
      const reportPath = path.join(__dirname, `qa-suite-report-${Date.now()}.json`);
      await fs.writeFile(reportPath, JSON.stringify(finalReport, null, 2));
      console.log(`📄 Final report saved to: ${reportPath}`);
    }

    // Display summary
    this.displaySummary(finalReport);

    return finalReport;
  }

  async generateErrorReport() {
    const errorReport = {
      title: 'HamBaller.xyz QA Suite Error Report',
      generated: new Date().toISOString(),
      environment: QA_SUITE_CONFIG.environment,
      errors: this.errors,
      partialResults: this.results
    };

    const errorPath = path.join(__dirname, `qa-error-report-${Date.now()}.json`);
    await fs.writeFile(errorPath, JSON.stringify(errorReport, null, 2));
    console.log(`📄 Error report saved to: ${errorPath}`);
  }

  generateRecommendations() {
    const recommendations = [];

    // Check for failed modules
    const failedModules = this.results.filter(r => r.status === 'failed');
    if (failedModules.length > 0) {
      recommendations.push({
        type: 'failed_modules',
        severity: 'high',
        message: `${failedModules.length} module(s) failed. Review error logs and retry.`,
        modules: failedModules.map(m => m.module)
      });
    }

    // Check for E2E test failures
    const e2eResult = this.results.find(r => r.module === 'E2E Testing');
    if (e2eResult && e2eResult.status === 'completed_with_failures') {
      recommendations.push({
        type: 'test_failures',
        severity: 'medium',
        message: 'Some E2E tests failed. Review test results for specific issues.',
        action: 'Check e2e-test-report.json for detailed failure information'
      });
    }

    // Check for missing contract verification
    const verificationResult = this.results.find(r => r.module === 'Contract Verification');
    if (!verificationResult || verificationResult.status === 'failed') {
      recommendations.push({
        type: 'contract_verification',
        severity: 'medium',
        message: 'Contract verification not completed. Public access may be limited.',
        action: 'Ensure contract addresses and API keys are properly configured'
      });
    }

    return recommendations;
  }

  generateNextSteps() {
    const steps = [];

    // Based on successful modules
    const completedModules = this.results.filter(r => r.status === 'completed');
    
    if (completedModules.find(m => m.module === 'Contract Verification')) {
      steps.push('✅ Contracts verified - update frontend environment variables with verified addresses');
    }

    if (completedModules.find(m => m.module === 'Thirdweb Integration')) {
      steps.push('✅ Thirdweb integration ready - import contracts to dashboard using generated config');
    }

    if (completedModules.find(m => m.module === 'ZK Analytics')) {
      steps.push('✅ ZK Analytics active - monitor logs and alerts for security insights');
    }

    if (completedModules.find(m => m.module === 'E2E Testing')) {
      steps.push('✅ E2E tests completed - review results and fix any failing scenarios');
    }

    // General next steps
    steps.push('📋 Review all generated reports and documentation');
    steps.push('🚀 Deploy to production when all QA requirements are met');
    steps.push('📊 Set up monitoring and alerting for production environment');

    return steps;
  }

  displaySummary(report) {
    console.log('\n📊 QA SUITE SUMMARY');
    console.log('====================');
    console.log(`Environment: ${report.environment}`);
    console.log(`Duration: ${report.duration.formatted}`);
    console.log(`Success Rate: ${report.summary.successRate}%`);
    
    console.log('\nModule Results:');
    console.log('===============');
    
    for (const result of report.modules) {
      const status = this.getStatusIcon(result.status);
      console.log(`${status} ${result.module} (${this.formatDuration(result.duration)})`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }

    if (report.recommendations.length > 0) {
      console.log('\n🎯 Recommendations:');
      console.log('===================');
      
      for (const rec of report.recommendations) {
        const severity = rec.severity === 'high' ? '🔴' : rec.severity === 'medium' ? '🟡' : '🟢';
        console.log(`${severity} ${rec.message}`);
        if (rec.action) {
          console.log(`   Action: ${rec.action}`);
        }
      }
    }

    console.log('\n🎯 Next Steps:');
    console.log('==============');
    
    for (const step of report.nextSteps) {
      console.log(`• ${step}`);
    }
  }

  // Utility methods
  getDuration() {
    return Date.now() - this.startTime;
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  getStatusIcon(status) {
    const icons = {
      'completed': '✅',
      'completed_with_failures': '⚠️',
      'failed': '❌',
      'skipped': '⏭️'
    };
    return icons[status] || '❓';
  }
}

// CLI execution
if (require.main === module) {
  const runner = new QASuiteRunner();
  runner.runFullSuite()
    .then((results) => {
      console.log('\n🎉 QA Suite execution completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ QA Suite execution failed!');
      process.exit(1);
    });
}

module.exports = QASuiteRunner;