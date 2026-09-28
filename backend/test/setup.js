// Variables minimales pour charger l'application sans base de données
process.env.NODE_ENV       = 'test';
process.env.JWT_SECRET     = process.env.JWT_SECRET_TEST || 'secret-de-test-suffisamment-long-0123456789';
process.env.LICENSE_SECRET = 'licence-de-test-suffisamment-longue-0123456789';
process.env.DB_PASSWORD    = process.env.DB_PASSWORD || 'test';
process.env.WA_ENABLED     = 'false';
process.env.WA_VERIFY_TOKEN = 'verify-test';
process.env.WA_APP_SECRET  = 'app-secret-test';
