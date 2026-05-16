process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET || "test-access-secret";
process.env.REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "test-refresh-secret";
process.env.ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
process.env.REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || "7d";
