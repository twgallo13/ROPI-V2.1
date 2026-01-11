/**
 * Product Images Endpoints
 * 
 * Image upload with signed URLs to products/{normalized_mpn}/images/{uuid}.{ext}
 * Records image refs on product doc for Launch Calendar display
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { requireAdmin, type AuthenticatedRequest } from '../middleware/auth';
import type { Request, Response } from 'express';
import { normalizeMpn } from '@ropi-aoss/sdk';
import { v4 as uuidv4 } from 'uuid';
import { Storage } from '@google-cloud/storage';

// Environment variable for the bucket name - support both config methods
const PRODUCT_IMAGES_BUCKET = functions.config()?.product?.images_bucket || process.env.PRODUCT_IMAGES_BUCKET;

if (!PRODUCT_IMAGES_BUCKET) {
  console.error('ERROR: PRODUCT_IMAGES_BUCKET environment variable not set');
}

// Initialize Google Cloud Storage
const storage = new Storage();

/**
 * POST /api/products/:mpn/images/sign
 * 
 * Returns v4 signed PUT URL for image upload
 * 
 * Request body:
 * - filename: string (required)
 * - contentType: string (required)
 * 
 * Response:
 * - uploadUrl: string - Signed URL for PUT upload
 * - gsPath: string - GCS path for the uploaded file
 * - expiresAt: string - ISO timestamp when URL expires
 * - imageId: string - UUID for the image
 */
export async function signImageUploadHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    const mpn = req.params.mpn;
    const { filename, contentType } = req.body;
    
    if (!mpn) {
      res.status(400).json({ 
        error: 'MISSING_MPN', 
        message: 'MPN is required' 
      });
      return;
    }

    if (!filename || typeof filename !== 'string') {
      res.status(400).json({ 
        error: 'MISSING_FILENAME', 
        message: 'filename is required and must be a string' 
      });
      return;
    }

    if (!contentType || typeof contentType !== 'string') {
      res.status(400).json({ 
        error: 'MISSING_CONTENT_TYPE', 
        message: 'contentType is required and must be a string' 
      });
      return;
    }

    // Validate content type is an image
    if (!contentType.startsWith('image/')) {
      res.status(400).json({ 
        error: 'INVALID_CONTENT_TYPE', 
        message: 'contentType must be an image type (image/*)' 
      });
      return;
    }

    if (!PRODUCT_IMAGES_BUCKET) {
      res.status(500).json({ 
        error: 'CONFIGURATION_ERROR', 
        message: 'Image upload not configured - missing bucket configuration' 
      });
      return;
    }

    try {
      // Normalize MPN for consistent path
      const normalizedMpn = normalizeMpn(mpn);
      
      if (!normalizedMpn) {
        res.status(400).json({ 
          error: 'INVALID_MPN', 
          message: 'MPN normalization failed' 
        });
        return;
      }

      // Generate UUID for image and extract file extension
      const imageId = uuidv4();
      const extension = filename.split('.').pop()?.toLowerCase() || 'jpg';
      
      // Build GCS path: products/{normalized_mpn}/images/{uuid}.{ext}
      const gsPath = `products/${normalizedMpn}/images/${imageId}.${extension}`;
      
      // Get bucket reference
      const bucket = storage.bucket(PRODUCT_IMAGES_BUCKET);
      const file = bucket.file(gsPath);

      // Generate v4 signed URL for PUT upload (expires in 15 minutes)
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 15);

      const [uploadUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: expires,
        contentType: contentType,
        extensionHeaders: {
          'x-goog-content-length-range': '0,10485760', // Max 10MB
        },
      });

      console.log(`✅ Generated signed upload URL for MPN: "${mpn}" -> "${gsPath}"`);

      res.status(200).json({
        uploadUrl,
        gsPath,
        imageId,
        expiresAt: expires.toISOString(),
      });
    } catch (error) {
      console.error('Error generating signed URL:', error);
      res.status(500).json({ 
        error: 'INTERNAL_ERROR', 
        message: 'Failed to generate signed upload URL' 
      });
    }
  });
}

/**
 * POST /api/products/:mpn/images
 * 
 * Register image metadata on product document after upload
 * 
 * Request body:
 * - gsPath: string (required) - GCS path of uploaded file
 * - filename: string (required) - Original filename
 * - contentType: string (required) - MIME type
 * - imageId: string (required) - UUID from sign endpoint
 * 
 * Response:
 * - image: object - Registered image metadata
 */
export async function registerImageHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    const mpn = req.params.mpn;
    const { gsPath, filename, contentType, imageId } = req.body;
    
    if (!mpn) {
      res.status(400).json({ 
        error: 'MISSING_MPN', 
        message: 'MPN is required' 
      });
      return;
    }

    if (!gsPath || !filename || !contentType || !imageId) {
      res.status(400).json({ 
        error: 'MISSING_FIELDS', 
        message: 'gsPath, filename, contentType, and imageId are required' 
      });
      return;
    }

    try {
      const normalizedMpn = normalizeMpn(mpn);
      
      if (!normalizedMpn) {
        res.status(400).json({ 
          error: 'INVALID_MPN', 
          message: 'MPN normalization failed' 
        });
        return;
      }

      const db = admin.firestore();
      const productRef = db.collection('products').doc(normalizedMpn);

      // Get actor from auth context
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.auth?.uid || 'system';
      const now = new Date().toISOString();

      // Image metadata object
      const imageData = {
        id: imageId,
        gsPath,
        filename,
        contentType,
        uploadedAt: now,
        uploadedBy: actor,
      };

      await db.runTransaction(async (transaction) => {
        const productDoc = await transaction.get(productRef);
        
        if (!productDoc.exists) {
          throw new Error(`Product not found for MPN: ${mpn}`);
        }

        const productData = productDoc.data()!;
        const existingImages = productData.launch?.images || [];

        // Add the new image to the launch.images array
        const updatedImages = [...existingImages, imageData];

        transaction.update(productRef, {
          'launch.images': updatedImages,
          updatedAt: now,
          updatedBy: actor,
        });
      });

      console.log(`✅ Registered image for MPN: "${mpn}" -> "${gsPath}"`);

      res.status(200).json({
        message: 'Image registered successfully',
        image: imageData,
      });
    } catch (error) {
      console.error('Error registering image:', error);
      
      if (error instanceof Error && error.message.includes('Product not found')) {
        res.status(404).json({ 
          error: 'PRODUCT_NOT_FOUND', 
          message: error.message 
        });
        return;
      }

      res.status(500).json({ 
        error: 'INTERNAL_ERROR', 
        message: 'Failed to register image' 
      });
    }
  });
}

/**
 * GET /api/products/:mpn/images/:imageId/url
 * 
 * Generate short-lived signed GET URL for image display (optional)
 * 
 * Response:
 * - url: string - Signed URL for viewing the image
 * - expiresAt: string - ISO timestamp when URL expires
 */
export async function getImageViewUrlHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    const { mpn, imageId } = req.params;
    
    if (!mpn || !imageId) {
      res.status(400).json({ 
        error: 'MISSING_PARAMS', 
        message: 'MPN and imageId are required' 
      });
      return;
    }

    if (!PRODUCT_IMAGES_BUCKET) {
      res.status(500).json({ 
        error: 'CONFIGURATION_ERROR', 
        message: 'Image viewing not configured - missing bucket configuration' 
      });
      return;
    }

    try {
      const normalizedMpn = normalizeMpn(mpn);
      
      if (!normalizedMpn) {
        res.status(400).json({ 
          error: 'INVALID_MPN', 
          message: 'MPN normalization failed' 
        });
        return;
      }

      // Find the image in the product document to get the file extension
      const db = admin.firestore();
      const productRef = db.collection('products').doc(normalizedMpn);
      const productDoc = await productRef.get();

      if (!productDoc.exists) {
        res.status(404).json({ 
          error: 'PRODUCT_NOT_FOUND', 
          message: `Product not found for MPN: ${mpn}` 
        });
        return;
      }

      const productData = productDoc.data()!;
      const images = productData.launch?.images || [];
      const image = images.find((img: any) => img.id === imageId);

      if (!image) {
        res.status(404).json({ 
          error: 'IMAGE_NOT_FOUND', 
          message: `Image not found: ${imageId}` 
        });
        return;
      }

      // Get bucket and file reference
      const bucket = storage.bucket(PRODUCT_IMAGES_BUCKET);
      const file = bucket.file(image.gsPath);

      // Generate v4 signed URL for GET (expires in 1 hour)
      const expires = new Date();
      expires.setHours(expires.getHours() + 1);

      const [viewUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: expires,
      });

      res.status(200).json({
        url: viewUrl,
        expiresAt: expires.toISOString(),
      });
    } catch (error) {
      console.error('Error generating signed view URL:', error);
      res.status(500).json({ 
        error: 'INTERNAL_ERROR', 
        message: 'Failed to generate signed view URL' 
      });
    }
  });
}