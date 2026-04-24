import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[DEBUG] Starting database test...');

    // Test 1: Database connection
    await connectDB();
    console.log('[DEBUG] ✓ Database connected');

    // Test 2: Check environment variables
    const envCheck = {
      MONGODB_URI: process.env.MONGODB_URI ? '✓ Set' : '✗ Missing',
      FIREBASE_SERVICE_ACCOUNT_KEY: process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? '✓ Set' : '✗ Missing',
      GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT ? '✓ Set' : '✗ Missing',
      GCLOUD_PROJECT: process.env.GCLOUD_PROJECT ? '✓ Set' : '✗ Missing',
    };

    console.log('[DEBUG] Environment check:', envCheck);

    // Test 3: Simple product count
    const productCount = await Product.countDocuments({});
    console.log('[DEBUG] ✓ Product count:', productCount);

    // Test 4: Check if Product model works
    const sampleProduct = await Product.findOne({}).select('_id name').lean();
    console.log('[DEBUG] ✓ Sample product:', sampleProduct ? 'Found' : 'None');

    return NextResponse.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      productCount,
      hasSampleProduct: !!sampleProduct,
      mongodbUri: process.env.MONGODB_URI ? '✓ Set' : '✗ Missing'
    });
  } catch (error) {
    console.error('[DEBUG] ✗ Error:', error.message);
    console.error('[DEBUG] Stack:', error.stack);

    return NextResponse.json({
      status: 'ERROR',
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}