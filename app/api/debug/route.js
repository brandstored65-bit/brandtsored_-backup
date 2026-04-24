import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import { NextResponse } from 'next/server';

export async function GET() {
  const results = {};

  try {
    // Test 1: Environment variables
    results.env = {
      MONGODB_URI: process.env.MONGODB_URI ? '✓ Set' : '✗ Missing',
      FIREBASE_SERVICE_ACCOUNT_KEY: process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? '✓ Set' : '✗ Missing',
      GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT ? '✓ Set' : '✗ Missing',
      GCLOUD_PROJECT: process.env.GCLOUD_PROJECT ? '✓ Set' : '✗ Missing',
    };

    // Test 2: Database connection
    try {
      await connectDB();
      results.db = { status: '✓ Connected' };
    } catch (dbErr) {
      results.db = { status: '✗ Failed', error: dbErr.message };
    }

    // Test 3: Product model
    try {
      const count = await Product.countDocuments({});
      results.productModel = { status: '✓ Working', count };
    } catch (modelErr) {
      results.productModel = { status: '✗ Failed', error: modelErr.message };
    }

    // Test 4: Firebase admin
    try {
      const { auth } = await import('@/lib/firebase-admin');
      results.firebase = { status: '✓ Initialized' };
    } catch (fbErr) {
      results.firebase = { status: '✗ Failed', error: fbErr.message };
    }

    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json({
      error: e.message,
      stack: e.stack
    }, { status: 500 });
  }
}