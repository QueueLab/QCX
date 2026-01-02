/**
 * Test script for geojsonEnricherV2
 * Run with: bun run test-enricher.ts
 */

import { geojsonEnricherV2 } from './lib/agents/geojson-enricher-v2';

async function testEnricher() {
  console.log('🧪 Testing GeoJSON Enricher V2\n');
  console.log('='.repeat(60));

  const testCases = [
    {
      name: 'Simple location query',
      input: 'Paris is the capital of France, located at coordinates 48.8566° N, 2.3522° E. It is known for the Eiffel Tower and the Louvre Museum.',
    },
    {
      name: 'Multiple locations',
      input: 'The three largest cities in Europe are London (51.5074° N, 0.1278° W), Paris (48.8566° N, 2.3522° E), and Berlin (52.5200° N, 13.4050° E).',
    },
    {
      name: 'No location data',
      input: 'The weather today is sunny with a high of 75°F. It is a great day to go outside and enjoy nature.',
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log('-'.repeat(60));
    console.log(`Input: ${testCase.input.substring(0, 100)}...`);
    
    try {
      const result = await geojsonEnricherV2(testCase.input);
      
      console.log('\n✅ Result:');
      console.log(`  - Has GeoJSON: ${!!result.geojson}`);
      console.log(`  - Feature count: ${result.geojson?.features?.length || 0}`);
      console.log(`  - Has commands: ${!!result.map_commands}`);
      console.log(`  - Command count: ${result.map_commands?.length || 0}`);
      
      if (result.geojson && result.geojson.features.length > 0) {
        console.log('\n  📍 Features:');
        result.geojson.features.forEach((feature, idx) => {
          console.log(`    ${idx + 1}. ${feature.geometry.type} - ${JSON.stringify(feature.properties)}`);
          console.log(`       Coordinates: ${JSON.stringify(feature.geometry.coordinates)}`);
        });
      }
      
      if (result.map_commands && result.map_commands.length > 0) {
        console.log('\n  🗺️  Commands:');
        result.map_commands.forEach((cmd, idx) => {
          console.log(`    ${idx + 1}. ${cmd.command}`);
          console.log(`       Params: ${JSON.stringify(cmd.params)}`);
        });
      }
      
      console.log('\n  📄 Full response:');
      console.log(JSON.stringify(result, null, 2));
      
    } catch (error) {
      console.error(`\n❌ Error: ${error}`);
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

// Run the test
testEnricher().then(() => {
  console.log('\n✅ All tests complete!');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
