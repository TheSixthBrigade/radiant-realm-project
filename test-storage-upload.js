// Test script to verify Supabase storage is working
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.log('Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStorageBucket() {
  console.log('🧪 Testing Supabase Storage...\n');

  try {
    // 1. Check if bucket exists
    console.log('1️⃣ Checking if website-assets bucket exists...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
      return false;
    }

    const bucketExists = buckets.some(b => b.name === 'website-assets');
    
    if (!bucketExists) {
      console.log('❌ Bucket "website-assets" does not exist');
      console.log('📝 Creating bucket...');
      
      const { error: createError } = await supabase.storage.createBucket('website-assets', {
        public: true,
        fileSizeLimit: 10485760 // 10MB
      });
      
      if (createError) {
        console.error('❌ Failed to create bucket:', createError);
        return false;
      }
      
      console.log('✅ Bucket created successfully');
    } else {
      console.log('✅ Bucket exists');
    }

    // 2. Test upload with a small test file
    console.log('\n2️⃣ Testing file upload...');
    
    // Create a small test image (1x1 pixel PNG)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const testImageBuffer = Buffer.from(testImageBase64, 'base64');
    const testFileName = `test-${Date.now()}.png`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('website-assets')
      .upload(testFileName, testImageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      console.log('\n💡 Possible issues:');
      console.log('   - Storage bucket policies not set correctly');
      console.log('   - User not authenticated');
      console.log('   - Storage quota exceeded');
      return false;
    }

    console.log('✅ Upload successful');
    console.log('   Path:', uploadData.path);

    // 3. Test getting public URL
    console.log('\n3️⃣ Testing public URL generation...');
    const { data: urlData } = supabase.storage
      .from('website-assets')
      .getPublicUrl(testFileName);

    if (urlData?.publicUrl) {
      console.log('✅ Public URL generated');
      console.log('   URL:', urlData.publicUrl);
    } else {
      console.log('❌ Failed to generate public URL');
      return false;
    }

    // 4. Clean up test file
    console.log('\n4️⃣ Cleaning up test file...');
    const { error: deleteError } = await supabase.storage
      .from('website-assets')
      .remove([testFileName]);

    if (deleteError) {
      console.log('⚠️  Could not delete test file:', deleteError);
    } else {
      console.log('✅ Test file deleted');
    }

    console.log('\n✅ All storage tests passed!');
    console.log('\n📝 Storage is ready to use.');
    return true;

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

// Run the test
testStorageBucket().then(success => {
  if (!success) {
    console.log('\n❌ Storage tests failed');
    console.log('\n🔧 To fix:');
    console.log('1. Run the migration: npx supabase db push');
    console.log('2. Or manually create the bucket in Supabase Dashboard');
    console.log('3. Make sure storage policies allow uploads');
    process.exit(1);
  }
  process.exit(0);
});
