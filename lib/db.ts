import { MongoClient, type Db } from "mongodb";
import { env } from "./env";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (db) return db;
  client = new MongoClient(env().MONGODB_URI);
  await client.connect();
  db = client.db("kalendly");
  return db;
}
