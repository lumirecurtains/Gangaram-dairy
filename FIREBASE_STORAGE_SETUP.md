# Firebase Storage Setup Guide — DEBT-001

**Official Image Hosting Strategy for Version 2**

This document provides complete setup instructions for enabling Firebase Storage in the Gangaram Dairy platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Current Status](#current-status)
3. [Setup Instructions](#setup-instructions)
4. [Security Rules Deployment](#security-rules-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Testing Verification](#testing-verification)
7. [Troubleshooting](#troubleshooting)
8. [Storage Architecture](#storage-architecture)

---

## Overview

### What is Firebase Storage?

Firebase Storage is a scalable, secure cloud storage service for user-generated content. It integrates seamlessly with Firebase Authentication and Firestore.

### Why Firebase Storage?

- **Unified Firebase Ecosystem** - Uses same authentication as Firestore
- **Secure by Default** - Rules-based access control
- **Automatic Scaling** - Handles petabytes of data
- **Global CDN** - Fast image delivery worldwide
- **Cost-Effective** - Pay per GB stored + network egress

### What Gets Stored?

| Asset Type | Path | Max Size | Access |
|------------|------|----------|--------|
| Product Images | `products/{merchantId}/{itemId}/` | 2MB | Public read |
| Merchant Certificates | `merchant-certificates/{merchantId}/` | 5MB | Authenticated only |
| Delivery Proofs | `delivery-proofs/{orderId}/` | 5MB | Authenticated only |
| Profile Images | `profile-images/{userId}/` | 2MB | Public read |
| Marketing Assets | `marketing/{merchantId}/` | 5MB | Public read |

---

## Current Status

### ✅ Code Implementation Complete

The application is **fully prepared** for Firebase Storage activation:

- Storage utilities implemented (`src/lib/storage/`)
- Security rules prepared (`firebase/storage.rules.ts`)
- Error handling for Storage-disabled scenarios
- Existing uploaders compatible with new architecture

### ⏳ Firebase Console Setup Required

Storage is **not yet enabled** in Firebase Console. Follow the steps below to activate.

---

## Setup Instructions

### Step 1: Enable Firebase Storage

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `Gangaram Dairy`
3. Navigate to **Build** → **Storage**
4. Click **Get Started**
5. Choose **Production Mode** (we provide custom rules)
6. Click **Done**

### Step 2: Configure Storage Location

1. In Storage settings, verify **Cloud Storage bucket** location
2. Recommended: `asia-south1` (Mumbai) for Indian users
3. Note: Location cannot be changed after creation

### Step 3: Verify Storage Bucket

After enabling, note your bucket name:
```
gs://gangaram-xxxxx.appspot.com
```

Update environment variable if needed:
```bash
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=gs://gangaram-xxxxx.appspot.com
```

---

## Security Rules Deployment

### Step 1: Copy Rules

1. Go to **Build** → **Storage** → **Rules**
2. Delete existing default rules
3. Copy content from `firebase/storage.rules.ts`

### Step 2: Paste Rules

Paste the complete rules from `firebase/storage.rules.ts`:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // ... (copy entire file contents)
  }
}
```

### Step 3: Publish Rules

1. Click **Publish**
2. Wait for confirmation message
3. Verify rules are active

### Step 4: Test Rules

Use Firebase Console **Storage → Files** to test:

- ✅ Upload a test image to `test-folder/`
- ✅ Verify access control works
- ✅ Delete test file

---

## Environment Configuration

### Required Environment Variables

Verify these exist in `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Verify Configuration

Run this command to check all variables are set:

```bash
echo "Checking Firebase config..."
grep -E "^NEXT_PUBLIC_FIREBASE_" .env.local | wc -l
# Should return: 6
```

---

## Testing Verification

### Test 1: Product Image Upload

1. Login as merchant
2. Navigate to Kitchen → Menu Management
3. Upload a product image
4. Verify:
   - ✅ Upload succeeds
   - ✅ Image displays correctly
   - ✅ Firestore stores URL only (not blob)

### Test 2: Certificate Upload

1. Start merchant onboarding
2. Upload FSSAI certificate
3. Upload GST certificate
4. Verify:
   - ✅ Both uploads succeed
   - ✅ Admin can view certificates
   - ✅ URLs stored in Firestore

### Test 3: Delivery Proof

1. Complete an order as rider
2. Upload delivery proof photo
3. Verify:
   - ✅ Photo uploads successfully
   - ✅ Order status updates
   - ✅ Proof URL persisted in Firestore

### Test 4: Error Handling (Storage Disabled)

To verify graceful error handling:

1. Temporarily disable Storage in Firebase Console
2. Attempt any file upload
3. Verify:
   - ✅ User sees meaningful error message
   - ✅ Application doesn't crash
   - ✅ No incomplete Firestore records created
   - ✅ Retry option available

---

## Troubleshooting

### Issue: Upload Fails with "403 Forbidden"

**Cause:** Security rules blocking upload

**Solution:**
1. Verify user is authenticated
2. Check storage bucket path is correct
3. Review security rules for path mismatches
4. Ensure file size is within limits

### Issue: "Storage Not Enabled" Error

**Cause:** Firebase Storage not activated

**Solution:**
1. Go to Firebase Console → Storage
2. Enable Storage if disabled
3. Wait 2-3 minutes for propagation
4. Refresh application

### Issue: Images Not Displaying

**Cause:** CORS or permission issues

**Solution:**
1. Check download URL is publicly accessible
2. Verify `products/` and `profile-images/` allow public read
3. Check browser console for CORS errors
4. Clear browser cache

### Issue: Upload Timeout

**Cause:** Large file or slow network

**Solution:**
1. Verify file size is within limits
2. Check network connection
3. Implement progress indicator (future enhancement)
4. Consider CDN for large file delivery

---

## Storage Architecture

### Folder Structure

```
gangaram-storage/
├── products/
│   └── {merchantId}/
│       └── {itemId}/
│           └── {uuid}.{jpg|png|webp}
│
├── merchant-certificates/
│   └── {merchantId}/
│       ├── fssai/
│       │   └── {uuid}.{jpg|png|pdf}
│       └── gst/
│           └── {uuid}.{jpg|png|pdf}
│
├── delivery-proofs/
│   └── {orderId}/
│       └── {uuid}.{jpg|png}
│
├── profile-images/
│   └── {userId}/
│       └── {uuid}.{jpg|png}
│
└── marketing/
    └── {merchantId}/
        ├── banners/
        │   └── {uuid}.{jpg|png|gif}
        ├── campaigns/
        │   └── {uuid}.{jpg|png}
        └── featured/
            └── {uuid}.{jpg|png}
```

### Naming Convention

- **Never use user-provided filenames** (security risk)
- **Always use UUID** for uniqueness
- **Optional timestamp** for versioning
- Example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg`

### Firestore Storage Pattern

```typescript
// ✅ CORRECT - Store URL only
{
  imageUrl: "https://firebasestorage.googleapis.com/v0/b/..."
}

// ❌ WRONG - Never store blob/base64 in Firestore
{
  imageData: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

---

## Cost Estimates

### Firebase Storage Pricing (as of 2024)

| Tier | Price |
|------|-------|
| Storage | $0.026/GB/month |
| Downloads (CDN) | $0.12/GB |
| Uploads | Free |
| Operations | First 50K free, then $0.05/10K |

### Estimated Monthly Cost

For a typical restaurant platform:

- **100 merchants** × 50 products × 200KB = 1GB product images
- **1000 orders/month** × 500KB delivery proofs = 500MB
- **Total storage:** ~2GB = **$0.05/month**
- **Downloads:** 100GB/month = **$12/month**
- **Estimated total:** **~$15-20/month**

---

## Migration Path (Future)

### If Migrating from Legacy Storage

1. **Phase 1:** Upload new images to Firebase Storage
2. **Phase 2:** Backfill existing images (batch script)
3. **Phase 3:** Update Firestore URLs
4. **Phase 4:** Decommission old storage
5. **Phase 5:** Verify all images accessible

*Note: Not applicable for current deployment (new project)*

---

## Security Best Practices

### Do's

- ✅ Use UUID for all filenames
- ✅ Validate file type AND extension
- ✅ Enforce file size limits
- ✅ Require authentication for uploads
- ✅ Use custom metadata for audit trail
- ✅ Regular security rule reviews

### Don'ts

- ❌ Never trust user-provided filenames
- ❌ Never store files without validation
- ❌ Never allow unlimited file sizes
- ❌ Never skip authentication checks
- ❌ Never expose service account keys

---

## Support

For issues or questions:

1. Check Firebase Console logs
2. Review browser console errors
3. Test with Firebase Emulator Suite
4. Consult Firebase documentation: https://firebase.google.com/docs/storage

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Status:** Ready for Production Deployment
