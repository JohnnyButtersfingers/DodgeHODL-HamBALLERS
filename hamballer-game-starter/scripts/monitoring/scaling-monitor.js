#!/usr/bin/env node
/**
 * HamBaller Infrastructure Scaling Monitor
 * Real-time monitoring and alerting for auto-scaling events
 * Phase 10.1 Infrastructure Scaling Component
 */

const { exec } = require('child_process');
const fs = require('fs');
const util = require('util');
const execPromise = util.promisify(exec);

class ScalingMonitor {
  constructor() {
    this.metrics = {
      opsPerSecond: 0,
      currentReplicas: 0,
      targetReplicas: 0,
      cpuUtilization: 0,
      memoryUtilization: 0,
      errorRate: 0,
      activeConnections: 0,
      queueDepth: 0
    };
    
    this.scalingEvents = [];
    this.alerts = [];
    this.thresholds = {
      scaleUpOps: 1800,      // Scale up when ops/sec > 1800
      scaleDownOps: 500,     // Scale down when ops/sec < 500
      maxReplicas: 20,       // Maximum replicas
      minReplicas: 2,        // Minimum replicas
      cpuAlert: 85,          // Alert when CPU > 85%
      memoryAlert: 90,       // Alert when memory > 90%
      errorAlert: 1.0        // Alert when error rate > 1%
    };
    
    this.isMonitoring = false;
    this.startTime = new Date();
  }
  
  async startMonitoring() {
    if (this.isMonitoring) {
      console.log('⚠️  Monitor already running');
      return;
    }
    
    console.log('🔍 Starting HamBaller infrastructure scaling monitor...');
    console.log(`📊 Monitoring thresholds:`);
    console.log(`   Scale up: ${this.thresholds.scaleUpOps} ops/sec`);
    console.log(`   Scale down: ${this.thresholds.scaleDownOps} ops/sec`);
    console.log(`   Replica range: ${this.thresholds.minReplicas}-${this.thresholds.maxReplicas}`);
    console.log(`   CPU alert: ${this.thresholds.cpuAlert}%`);
    console.log('');
    
    this.isMonitoring = true;
    
    // Start monitoring intervals
    this.metricsInterval = setInterval(() => this.collectMetrics(), 10000);    // Every 10s
    this.analysisInterval = setInterval(() => this.analyzeMetrics(), 30000);   // Every 30s
    this.reportInterval = setInterval(() => this.generateReport(), 300000);    // Every 5m
    this.alertInterval = setInterval(() => this.checkAlerts(), 60000);         // Every 1m
    
    // Graceful shutdown handling
    process.on('SIGINT', () => this.stopMonitoring());
    process.on('SIGTERM', () => this.stopMonitoring());
    
    // Initial metrics collection
    await this.collectMetrics();
  }
  
  async stopMonitoring() {
    console.log('\n🛑 Stopping infrastructure monitor...');
    this.isMonitoring = false;
    
    clearInterval(this.metricsInterval);
    clearInterval(this.analysisInterval);
    clearInterval(this.reportInterval);
    clearInterval(this.alertInterval);
    
    // Generate final report
    await this.generateReport();
    console.log('✅ Monitor stopped. Final report generated.');
    process.exit(0);
  }
  
  async collectMetrics() {
    try {
      const timestamp = new Date();
      
      // Collect operations per second from API metrics
      this.metrics.opsPerSecond = await this.getOperationsPerSecond();
      
      // Get Kubernetes metrics for replicas
      const k8sMetrics = await this.getKubernetesMetrics();
      this.metrics.currentReplicas = k8sMetrics.currentReplicas;
      this.metrics.targetReplicas = k8sMetrics.targetReplicas;
      
      // Get system resource utilization
      this.metrics.cpuUtilization = await this.getCPUUtilization();
      this.metrics.memoryUtilization = await this.getMemoryUtilization();
      
      // Get application metrics
      this.metrics.errorRate = await this.getErrorRate();
      this.metrics.activeConnections = await this.getActiveConnections();
      this.metrics.queueDepth = await this.getQueueDepth();
      
      // Log current status
      console.log(`📊 [${timestamp.toLocaleTimeString()}] ` +
        `${this.metrics.opsPerSecond} ops/s | ` +
        `${this.metrics.currentReplicas}/${this.metrics.targetReplicas} replicas | ` +
        `CPU: ${this.metrics.cpuUtilization}% | ` +
        `Mem: ${this.metrics.memoryUtilization}% | ` +
        `Errors: ${this.metrics.errorRate}%`);
      
    } catch (error) {
      console.error('❌ Error collecting metrics:', error.message);
      this.recordAlert('metric_collection_error', error.message);
    }
  }
  
  async getOperationsPerSecond() {
    try {
      // Query Prometheus for HTTP request rate
      const { stdout } = await execPromise(
        `curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total[1m])" | jq -r '.data.result[0].value[1]'`
      );
      return Math.round(parseFloat(stdout.trim()) || 0);
    } catch (error) {
      // Fallback: estimate from application logs
      return this.estimateOpsFromLogs();
    }
  }
  
  async estimateOpsFromLogs() {
    try {
      // Count API requests in last minute from application logs
      const { stdout } = await execPromise(
        `tail -n 1000 /var/log/hamballer/app.log | grep "$(date +%Y-%m-%d\\ %H:%M)" | grep "POST\\|GET" | wc -l`
      );
      return Math.round(parseInt(stdout.trim()) || 0);
    } catch (error) {
      return 0;
    }
  }
  
  async getKubernetesMetrics() {
    try {
      // Get current replica count
      const { stdout: currentStdout } = await execPromise(
        `kubectl get deployment hamballer-backend -o jsonpath='{.status.replicas}' 2>/dev/null`
      );
      
      // Get desired replica count from HPA
      const { stdout: targetStdout } = await execPromise(
        `kubectl get hpa hamballer-backend-hpa -o jsonpath='{.status.desiredReplicas}' 2>/dev/null`
      );
      
      return {
        currentReplicas: parseInt(currentStdout.trim()) || 2,
        targetReplicas: parseInt(targetStdout.trim()) || 2
      };
    } catch (error) {
      return { currentReplicas: 2, targetReplicas: 2 };
    }
  }
  
  async getCPUUtilization() {
    try {
      // Get CPU usage from system
      const { stdout } = await execPromise(
        `top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//'`
      );
      return Math.round(parseFloat(stdout.trim()) || 0);
    } catch (error) {
      return 0;
    }
  }
  
  async getMemoryUtilization() {
    try {
      // Get memory usage percentage
      const { stdout } = await execPromise(
        `free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}'`
      );
      return parseInt(stdout.trim()) || 0;
    } catch (error) {
      return 0;
    }
  }
  
  async getErrorRate() {
    try {
      // Calculate error rate from last minute of logs
      const { stdout: totalStdout } = await execPromise(
        `tail -n 1000 /var/log/hamballer/app.log | grep "$(date +%Y-%m-%d\\ %H:%M)" | wc -l`
      );
      
      const { stdout: errorStdout } = await execPromise(
        `tail -n 1000 /var/log/hamballer/app.log | grep "$(date +%Y-%m-%d\\ %H:%M)" | grep -E "ERROR|5[0-9][0-9]" | wc -l`
      );
      
      const total = parseInt(totalStdout.trim()) || 1;
      const errors = parseInt(errorStdout.trim()) || 0;
      
      return Math.round((errors / total) * 100 * 10) / 10; // Round to 1 decimal
    } catch (error) {
      return 0;
    }
  }
  
  async getActiveConnections() {
    try {
      // Get active database connections
      const { stdout } = await execPromise(
        `psql -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null`
      );
      return parseInt(stdout.trim()) || 0;
    } catch (error) {
      return 0;
    }
  }
  
  async getQueueDepth() {
    try {
      // Get badge retry queue depth from database
      const { stdout } = await execPromise(
        `psql -t -c "SELECT count(*) FROM badge_claims WHERE status = 'pending';" 2>/dev/null`
      );
      return parseInt(stdout.trim()) || 0;
    } catch (error) {
      return 0;
    }
  }
  
  async analyzeMetrics() {
    const { opsPerSecond, currentReplicas, cpuUtilization, memoryUtilization } = this.metrics;
    
    // Check scaling thresholds
    if (opsPerSecond > this.thresholds.scaleUpOps && currentReplicas < this.thresholds.maxReplicas) {
      await this.recordScalingEvent('scale_up_recommended', {
        reason: 'High traffic detected',
        currentOps: opsPerSecond,
        threshold: this.thresholds.scaleUpOps,
        currentReplicas,
        maxReplicas: this.thresholds.maxReplicas
      });
    }
    
    if (opsPerSecond < this.thresholds.scaleDownOps && currentReplicas > this.thresholds.minReplicas) {
      await this.recordScalingEvent('scale_down_recommended', {
        reason: 'Low traffic detected',
        currentOps: opsPerSecond,
        threshold: this.thresholds.scaleDownOps,
        currentReplicas,
        minReplicas: this.thresholds.minReplicas
      });
    }
    
    // Check resource alerts
    if (cpuUtilization > this.thresholds.cpuAlert) {
      this.recordAlert('high_cpu_usage', `CPU utilization at ${cpuUtilization}%`);
    }
    
    if (memoryUtilization > this.thresholds.memoryAlert) {
      this.recordAlert('high_memory_usage', `Memory utilization at ${memoryUtilization}%`);
    }
  }
  
  async recordScalingEvent(type, data) {
    const event = {
      timestamp: new Date(),
      type,
      metrics: { ...this.metrics },
      data,
      id: this.generateEventId()
    };
    
    this.scalingEvents.push(event);
    
    console.log(`📈 SCALING EVENT: ${type.toUpperCase()}`);
    console.log(`   Reason: ${data.reason}`);
    console.log(`   Current: ${data.currentOps} ops/s, ${data.currentReplicas} replicas`);
    console.log(`   Recommendation: ${type.includes('up') ? 'Scale up' : 'Scale down'}`);
    console.log('');
    
    // Keep only last 50 events
    if (this.scalingEvents.length > 50) {
      this.scalingEvents = this.scalingEvents.slice(-50);
    }
  }
  
  recordAlert(type, message) {
    const alert = {
      timestamp: new Date(),
      type,
      message,
      metrics: { ...this.metrics },
      id: this.generateEventId()
    };
    
    this.alerts.push(alert);
    
    console.log(`🚨 ALERT: ${type.toUpperCase()}`);
    console.log(`   Message: ${message}`);
    console.log(`   Time: ${alert.timestamp.toLocaleString()}`);
    console.log('');
    
    // Keep only last 20 alerts
    if (this.alerts.length > 20) {
      this.alerts = this.alerts.slice(-20);
    }
  }
  
  async checkAlerts() {
    // Send notifications for critical alerts
    const recentCriticalAlerts = this.alerts.filter(alert => 
      Date.now() - alert.timestamp.getTime() < 300000 && // Last 5 minutes
      ['high_cpu_usage', 'high_memory_usage', 'metric_collection_error'].includes(alert.type)
    );
    
    if (recentCriticalAlerts.length > 0) {
      await this.sendNotifications(recentCriticalAlerts);
    }
  }
  
  async sendNotifications(alerts) {
    // In production, this would send to Slack, PagerDuty, etc.
    console.log(`📧 Sending ${alerts.length} critical alert notifications...`);
    
    for (const alert of alerts) {
      console.log(`   - ${alert.type}: ${alert.message}`);
    }
  }
  
  generateEventId() {
    return Math.random().toString(36).substr(2, 9);
  }
  
  async generateReport() {
    const uptime = Date.now() - this.startTime.getTime();
    const uptimeHours = Math.round(uptime / (1000 * 60 * 60) * 10) / 10;
    
    const report = {
      generatedAt: new Date(),
      monitorUptime: {
        milliseconds: uptime,
        hours: uptimeHours
      },
      currentMetrics: this.metrics,
      scalingEvents: this.scalingEvents.slice(-10), // Last 10 events
      alerts: this.alerts.slice(-10), // Last 10 alerts
      summary: {
        totalScalingEvents: this.scalingEvents.length,
        totalAlerts: this.alerts.length,
        averageOpsPerSecond: this.calculateAverageOps(),
        currentStatus: this.getCurrentStatus()
      },
      recommendations: this.generateRecommendations()
    };
    
    // Write to file
    const reportFile = `scaling-monitor-report-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`📝 Scaling report generated: ${reportFile}`);
    console.log(`📊 Summary: ${report.summary.totalScalingEvents} scaling events, ${report.summary.totalAlerts} alerts`);
    console.log(`⏱️  Monitor uptime: ${uptimeHours} hours`);
    console.log('');
    
    return report;
  }
  
  calculateAverageOps() {
    // This would typically come from historical data
    return Math.round(this.metrics.opsPerSecond);
  }
  
  getCurrentStatus() {
    const { opsPerSecond, currentReplicas, cpuUtilization, errorRate } = this.metrics;
    
    if (errorRate > 1.0) return 'critical';
    if (cpuUtilization > 85 || opsPerSecond > 2000) return 'warning';
    if (currentReplicas > 10) return 'high_load';
    return 'healthy';
  }
  
  generateRecommendations() {
    const recommendations = [];
    const { opsPerSecond, currentReplicas, cpuUtilization, errorRate } = this.metrics;
    
    if (opsPerSecond > this.thresholds.scaleUpOps) {
      recommendations.push({
        type: 'scaling',
        priority: 'high',
        message: `Consider scaling up: ${opsPerSecond} ops/s exceeds threshold of ${this.thresholds.scaleUpOps}`
      });
    }
    
    if (cpuUtilization > this.thresholds.cpuAlert) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: `High CPU usage detected: ${cpuUtilization}%. Consider optimizing or scaling.`
      });
    }
    
    if (errorRate > 0.5) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: `Error rate elevated: ${errorRate}%. Investigate application issues.`
      });
    }
    
    if (currentReplicas < 3 && opsPerSecond > 1000) {
      recommendations.push({
        type: 'redundancy',
        priority: 'medium',
        message: `Consider minimum 3 replicas for high traffic to ensure redundancy.`
      });
    }
    
    return recommendations;
  }
}

// Main execution
if (require.main === module) {
  const monitor = new ScalingMonitor();
  
  monitor.startMonitoring().catch(error => {
    console.error('❌ Failed to start monitor:', error);
    process.exit(1);
  });
}

module.exports = ScalingMonitor;