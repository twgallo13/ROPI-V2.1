if (!process.env.SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("Missing SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS");
  process.exit(1);
}
console.log("Seed script placeholder. Implement import/seed logic from Notion AOSS docs.");
