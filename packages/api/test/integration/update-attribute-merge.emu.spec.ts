// packages/api/test/integration/update-attribute-merge.emu.spec.ts
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import * as admin from 'firebase-admin';
import { createAttribute, updateAttribute, getAttribute } from '../../src/services/attributesService';
import { AttributeType } from '@ropi-aoss/sdk';
import { randomUUID } from 'crypto';

// Skip integration tests if emulator is not running
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST;
const describeIfEmulator = EMULATOR_HOST ? describe : describe.skip;

describeIfEmulator('Attribute update merge & validation', () => {
    beforeAll(() => {
      if (!admin.apps.length) {
        admin.initializeApp({
          projectId: 'demo-integration-test',
        });
      }
    });

    afterAll(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

  it('merges partial patch and applies schema defaults', async () => {
    const id = `test_attr_merge_${randomUUID().slice(0,8)}`;
    const actor = 'test-user';

    // Create a minimal attribute document with intentionally missing optional fields
    const initial: Partial<AttributeType> = {
      attribute_id: id,
      label: 'Initial Label',
      data_type: 'string',
      // intentionally omit status, required_for_export, etc.
    } as Partial<AttributeType>;

    // Use createAttribute service to create doc (it expects AttributeType)
    await createAttribute(initial as AttributeType, actor);

    // Now call updateAttribute with a partial patch (only label changed)
    const patch: Partial<AttributeType> = {
      label: 'Updated Label Only'
    };

    await updateAttribute(id, patch, actor);

    // Fetch final doc and assert defaults applied
    const final = await getAttribute(id);

    // AttributeSchema default for status is 'active'
    expect(final.status).toBeDefined();
    expect(final.status).toBe('active');

    // Defaults for booleans should be false
    expect(final.required_for_export).toBeDefined();
    expect(final.required_for_export).toBe(false);

    expect(final.import_required).toBeDefined();
    expect(final.import_required).toBe(false);

    expect(final.required_for_completion).toBeDefined();
    expect(final.required_for_completion).toBe(false);

    // Label should be updated
    expect(final.label).toBe('Updated Label Only');

    // Cleanup created doc
    const db = admin.firestore();
    await db.collection('settings').doc('attributes').collection('keys').doc(id).delete();
  }, 60_000);
});
