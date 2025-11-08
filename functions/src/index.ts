import * as functions from 'firebase-functions';
import importer from './routes/import';
import describe from './routes/describe';
import exporter from './routes/exporter';

export const apiImport = functions.https.onRequest(importer);
export const apiDescribe = functions.https.onRequest(describe);
export const apiExporter = functions.https.onRequest(exporter);
