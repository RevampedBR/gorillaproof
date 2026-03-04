// Add annotation_shape column to comments table
// Run with: node scripts/add_annotation_shape.mjs

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://kdakstzqxcubhyfvevrb.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWtzdHpxeGN1Ymh5ZnZldnJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY4MTQwMCwiZXhwIjoyMDg3MjU3NDAwfQ.X7klYqGWW0b_dN3LBjrRFpoDmcA-c2qjUeX0imY9iCM'
);

async function main() {
    // Step 1: Check if the column already exists
    console.log('Checking if annotation_shape column exists...');
    const { data: checkData, error: checkError } = await supabase
        .from('comments')
        .select('id')
        .limit(1);

    console.log('Comments query result:', checkError ? `Error: ${checkError.message}` : `OK (${checkData?.length ?? 0} rows)`);

    // Step 2: Try to query with annotation_shape to see if it exists
    const { data: testData, error: testError } = await supabase
        .from('comments')
        .select('id, annotation_shape')
        .limit(1);

    if (testError && testError.message.includes('annotation_shape')) {
        console.log('❌ Column annotation_shape does NOT exist. Need to add it.');
        console.log('');
        console.log('Since PostgREST cannot run DDL, you need to add this column manually.');
        console.log('Go to Supabase SQL Editor and run:');
        console.log('');
        console.log('ALTER TABLE comments ADD COLUMN IF NOT EXISTS annotation_shape JSONB DEFAULT NULL;');
        console.log('');
    } else if (testError) {
        console.log('Other error:', testError.message);
    } else {
        console.log('✅ Column annotation_shape already exists!');
        console.log('Sample data:', JSON.stringify(testData));
    }

    // Step 3: Also check last_viewed_at on proofs
    const { error: lvError } = await supabase
        .from('proofs')
        .select('id, last_viewed_at')
        .limit(1);

    if (lvError && lvError.message.includes('last_viewed_at')) {
        console.log('');
        console.log('⚠️  Column proofs.last_viewed_at also missing. Run:');
        console.log('ALTER TABLE proofs ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ DEFAULT NULL;');
    }
}

main();
