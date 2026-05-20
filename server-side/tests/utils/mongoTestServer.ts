import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer: MongoMemoryServer | null = null;

export const connectTestDatabase = async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      launchTimeout: 30000,
    },
  });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, {
    dbName: "psits-test",
  });
};

export const clearTestDatabase = async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({}))
  );
};

export const disconnectTestDatabase = async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
};
