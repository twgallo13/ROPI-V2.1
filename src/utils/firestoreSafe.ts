export const sanitizeFirestoreData = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(sanitizeFirestoreData);
  }
  if (data && typeof data === 'object') {
    // Firestore FieldValue for serverTimestamp has an internal marker; do a best-effort check
    if ((data as any)._methodName === 'serverTimestamp') {
      return Date.now();
    }
    const copy: any = {};
    for (const key in data) {
      const val = (data as any)[key];
      if (val && typeof val === 'object' && (val as any)._methodName === 'serverTimestamp') {
        copy[key] = Date.now();
      } else {
        copy[key] = sanitizeFirestoreData(val);
      }
    }
    return copy;
  }
  return data;
};
