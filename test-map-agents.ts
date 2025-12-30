/**
 * Test script for map agents
 * Run with: bun run test-map-agents.ts
 */

import { geojsonParser } from './lib/agents/map-workers/geojson-parser';
import { mapCommandGenerator } from './lib/agents/map-workers/map-command-generator';
import { validateGeoJSON, validateMapCommand } from './lib/agents/map-workers/validator';
import { mapControlOrchestrator } from './lib/agents/map-control-orchestrator';

async function testGeoJSONParser() {
  console.log('\n🧪 Testing GeoJSON Parser...');
  
  const testCases = [
    'Paris is located at 48.8566° N, 2.3522° E',
    'Show me New York City',
    'The weather is nice today',
  ];

  for (const testCase of testCases) {
    console.log(`\n  Input: "${testCase}"`);
    try {
      const result = await geojsonParser(testCase);
      console.log(`  ✅ Confidence: ${result.confidence}`);
      console.log(`  ✅ Has GeoJSON: ${!!result.geojson}`);
      console.log(`  ✅ Extracted locations: ${result.extractedLocations?.join(', ') || 'none'}`);
      if (result.warnings && result.warnings.length > 0) {
        console.log(`  ⚠️  Warnings: ${result.warnings.join(', ')}`);
      }
    } catch (error) {
      console.error(`  ❌ Error:`, error);
    }
  }
}

async function testMapCommandGenerator() {
  console.log('\n🧪 Testing Map Command Generator...');
  
  const testInput = {
    text: 'Show me Paris',
    geojson: {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [2.3522, 48.8566],
        },
        properties: {
          name: 'Paris',
        },
      }],
    },
  };

  try {
    const result = await mapCommandGenerator(testInput);
    console.log(`  ✅ Generated ${result.commands.length} commands`);
    result.commands.forEach((cmd, idx) => {
      console.log(`  ✅ Command ${idx + 1}: ${cmd.command}`);
      console.log(`     Params: ${JSON.stringify(cmd.params)}`);
    });
    if (result.reasoning) {
      console.log(`  ✅ Reasoning: ${result.reasoning}`);
    }
  } catch (error) {
    console.error(`  ❌ Error:`, error);
  }
}

async function testValidator() {
  console.log('\n🧪 Testing Validator...');
  
  // Test valid GeoJSON
  const validGeoJSON = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [2.3522, 48.8566],
      },
      properties: { name: 'Paris' },
    }],
  };

  console.log('  Testing valid GeoJSON...');
  const geoResult = validateGeoJSON(validGeoJSON);
  console.log(`  ${geoResult.valid ? '✅' : '❌'} Valid: ${geoResult.valid}`);
  if (geoResult.errors.length > 0) {
    console.log(`  ❌ Errors:`, geoResult.errors);
  }

  // Test valid command
  const validCommand = {
    command: 'flyTo',
    params: {
      center: [2.3522, 48.8566],
      zoom: 12,
    },
  };

  console.log('  Testing valid map command...');
  const cmdResult = validateMapCommand(validCommand);
  console.log(`  ${cmdResult.valid ? '✅' : '❌'} Valid: ${cmdResult.valid}`);
  if (cmdResult.errors.length > 0) {
    console.log(`  ❌ Errors:`, cmdResult.errors);
  }
}

async function testOrchestrator() {
  console.log('\n🧪 Testing Orchestrator...');
  
  const testCases = [
    'Show me the Eiffel Tower in Paris',
    'What is the distance from New York to Boston?',
    'Display Tokyo, London, and Paris on the map',
  ];

  for (const testCase of testCases) {
    console.log(`\n  Input: "${testCase}"`);
    try {
      const result = await mapControlOrchestrator(testCase, {
        maxIterations: 1,
        enableFeedbackLoop: false,
      });
      
      console.log(`  ✅ Has GeoJSON: ${!!result.geojson}`);
      console.log(`  ✅ Commands: ${result.map_commands?.length || 0}`);
      console.log(`  ✅ Confidence: ${result.metadata?.confidence || 0}`);
      console.log(`  ✅ Processing time: ${result.metadata?.processingTime || 0}ms`);
      
      if (result.map_commands && result.map_commands.length > 0) {
        result.map_commands.forEach((cmd, idx) => {
          console.log(`  ✅ Command ${idx + 1}: ${cmd.command}`);
        });
      }
    } catch (error) {
      console.error(`  ❌ Error:`, error);
    }
  }
}

async function runTests() {
  console.log('🚀 Starting Map Agents Tests\n');
  console.log('='.repeat(60));
  
  try {
    await testGeoJSONParser();
    await testMapCommandGenerator();
    await testValidator();
    await testOrchestrator();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
