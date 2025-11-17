/**
 * Firestore onCreate worker that processes async describe jobs
 * Triggered when a new document is created in descriptionJobs collection
 */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Import the core describe logic from the HTTP route
 * We'll refactor describe.ts to export this logic
 */
import { processDescribeRequest } from './describe';

export const describeWorker = functions.firestore
  .document('descriptionJobs/{jobId}')
  .onCreate(async (snap, ctx) => {
    const jobId = ctx.params.jobId;
    const jobRef = snap.ref;
    const jobData = snap.data();
    console.log(`[describeWorker] starting job ${jobId}`);

    try {
      await jobRef.update({ 
        status: 'processing', 
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const t0 = Date.now();
      
      // Compose the payload the describe function expects
      const payload = {
        productId: jobData.productId,
        channel: jobData.channel || 'web', // default channel
        attributes: jobData.attributes || [],
        facts: jobData.facts || {},
        aiContext: jobData.aiContext || {},
        tone: jobData.tone || 'Clean',
        length: jobData.length || 'Medium',
        temperature: jobData.temperature,
        templateOverride: jobData.templateOverride,
      };

      // Call the core describe logic (same logic as HTTP endpoint)
      const result = await processDescribeRequest(payload);
      const t1 = Date.now();
      console.log(`[describeWorker] job ${jobId} done in ${t1 - t0}ms`);

      await jobRef.update({
        status: 'done',
        result,
        finishedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`[describeWorker] job ${jobId} failed`, error);
      await jobRef.update({
        status: 'error',
        error: error.message || String(err),
        finishedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });
