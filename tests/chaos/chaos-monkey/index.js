/**
 * Chaos Monkey - Randomly injects failures into target services
 * Simulates real-world failure scenarios for resilience testing
 */

import Docker from 'dockerode';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const config = {
  enabled: process.env.CHAOS_ENABLED === 'true',
  targetServices: (process.env.TARGET_SERVICES || 'backend').split(','),
  failureIntervalMin: parseInt(process.env.FAILURE_INTERVAL_MIN || '60', 10) * 1000,
  failureIntervalMax: parseInt(process.env.FAILURE_INTERVAL_MAX || '300', 10) * 1000,
  failureDurationMin: parseInt(process.env.FAILURE_DURATION_MIN || '10', 10) * 1000,
  failureDurationMax: parseInt(process.env.FAILURE_DURATION_MAX || '60', 10) * 1000,
};

const failureTypes = [
  'kill',     // Kill the container (simulates crash)
  'pause',    // Pause the container (simulates freeze)
  'restart',  // Restart the container (simulates restart loop)
];

function log(message, data = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    service: 'chaos-monkey',
    message,
    ...data,
  }));
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function getTargetContainers() {
  try {
    const containers = await docker.listContainers({ all: false });
    return containers.filter(container => {
      const name = container.Names[0]?.replace('/', '');
      return config.targetServices.some(target => 
        name?.includes(target) && !name?.includes('chaos-monkey')
      );
    });
  } catch (error) {
    log('error_listing_containers', { error: error.message });
    return [];
  }
}

async function injectFailure(containerInfo) {
  const container = docker.getContainer(containerInfo.Id);
  const failureType = failureTypes[random(0, failureTypes.length - 1)];
  const duration = random(config.failureDurationMin, config.failureDurationMax);
  
  const containerName = containerInfo.Names[0]?.replace('/', '');
  
  try {
    log('chaos_injection_started', {
      container: containerName,
      failureType,
      durationMs: duration,
    });

    switch (failureType) {
      case 'kill':
        await container.kill();
        log('chaos_container_killed', { container: containerName });
        break;

      case 'pause':
        await container.pause();
        log('chaos_container_paused', { container: containerName });
        
        setTimeout(async () => {
          try {
            await container.unpause();
            log('chaos_container_unpaused', { container: containerName });
          } catch (error) {
            log('error_unpausing_container', { 
              container: containerName, 
              error: error.message 
            });
          }
        }, duration);
        break;

      case 'restart':
        await container.restart();
        log('chaos_container_restarted', { container: containerName });
        break;
    }

    log('chaos_injection_completed', {
      container: containerName,
      failureType,
    });
  } catch (error) {
    log('chaos_injection_failed', {
      container: containerName,
      failureType,
      error: error.message,
    });
  }
}

async function runChaosMonkey() {
  if (!config.enabled) {
    log('chaos_monkey_disabled');
    return;
  }

  log('chaos_monkey_started', {
    targetServices: config.targetServices,
    failureIntervalRange: [config.failureIntervalMin, config.failureIntervalMax],
    failureDurationRange: [config.failureDurationMin, config.failureDurationMax],
  });

  async function scheduleNextFailure() {
    const targets = await getTargetContainers();
    
    if (targets.length === 0) {
      log('no_targets_found', { targetServices: config.targetServices });
    } else {
      const target = targets[random(0, targets.length - 1)];
      await injectFailure(target);
    }

    const nextInterval = random(config.failureIntervalMin, config.failureIntervalMax);
    log('next_chaos_scheduled', { delayMs: nextInterval });
    
    setTimeout(scheduleNextFailure, nextInterval);
  }

  // Start with a small delay to allow services to initialize
  setTimeout(scheduleNextFailure, 10000);
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  log('chaos_monkey_shutting_down');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('chaos_monkey_shutting_down');
  process.exit(0);
});

// Start the chaos monkey
runChaosMonkey().catch(error => {
  log('chaos_monkey_fatal_error', { error: error.message });
  process.exit(1);
});
