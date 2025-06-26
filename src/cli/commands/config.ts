import { ConfigManager } from '../../utils/config.js';
import { Logger } from '../../utils/logger.js';

interface ConfigOptions {
  init?: boolean;
  validate?: string;
}

export async function configCommand(options: ConfigOptions): Promise<void> {
  try {
    if (options.init) {
      await ConfigManager.createSampleConfig();
      console.log('\n📝 Sample configuration created: claude-screenshot.json');
      console.log('\nEdit the file to customize your screenshot testing setup:');
      console.log('  - Test scenarios');
      console.log('  - Performance thresholds');
      console.log('  - CI/CD integration settings');
      console.log('  - Default capture options');
      return;
    }

    if (options.validate) {
      const configFile = typeof options.validate === 'string' ? options.validate : undefined;
      
      try {
        const config = await ConfigManager.loadConfig(configFile);
        Logger.success('CONFIG', '✅ Configuration is valid');
        
        console.log('\n📋 Configuration Summary:');
        console.log('=' .repeat(40));
        console.log(`Output Directory: ${config.outputDir}`);
        console.log(`Baseline Directory: ${config.baselineDir}`);
        console.log(`Default Viewport: ${config.defaults?.viewport?.width}x${config.defaults?.viewport?.height}`);
        console.log(`Default Duration: ${config.defaults?.duration}ms`);
        console.log(`Default Interval: ${config.defaults?.interval}ms`);
        console.log(`Scenarios: ${config.scenarios?.length || 0}`);
        
        if (config.scenarios && config.scenarios.length > 0) {
          console.log('\n🎬 Scenarios:');
          config.scenarios.forEach(scenario => {
            console.log(`  📄 ${scenario.name}: ${scenario.url}`);
          });
        }
        
        if (config.performance) {
          console.log('\n⚡ Performance Thresholds:');
          console.log(`  Max Load Time: ${config.performance.maxLoadTime}ms`);
          console.log(`  Max DOM Ready: ${config.performance.maxDomContentLoaded}ms`);
          console.log(`  Max LCP: ${config.performance.maxLCP}ms`);
          console.log(`  Max CLS: ${config.performance.maxCLS}`);
        }
        
        console.log('=' .repeat(40));
        
      } catch (error) {
        Logger.error('CONFIG', `❌ Configuration validation failed: ${error}`);
        process.exit(1);
      }
      return;
    }

    // Default action - show current config
    try {
      const config = await ConfigManager.loadConfig();
      
      console.log('📋 Current Configuration:');
      console.log('=' .repeat(40));
      console.log(JSON.stringify(config, null, 2));
      console.log('=' .repeat(40));
      
      console.log('\n💡 Available commands:');
      console.log('  --init      Create sample configuration file');
      console.log('  --validate  Validate configuration file');
      
    } catch (error) {
      Logger.warn('CONFIG', 'No configuration file found');
      console.log('\n💡 Create a configuration file with:');
      console.log('  npx tsx src/cli/index.ts config --init');
    }

  } catch (error) {
    Logger.error('CONFIG', `Configuration command failed: ${error}`);
    process.exit(1);
  }
}