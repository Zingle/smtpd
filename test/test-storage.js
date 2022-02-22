import expect from "expect.js";
import sinon from "sinon";
import {Database} from "@zingle/sqlite";
import {Sqlite3Storage} from "@zingle/smtpd";


describe("Sqlite3Storage", () => {
  let db, storage;

  beforeEach(async () => {
    const filename = ":memory:";
    db = new Database(filename);
    storage = new Sqlite3Storage(db);
    await Sqlite3Storage.initialize(db);
  });

  afterEach(async () => {
    await db.close();
  });

  describe("constructor(db)", () => {
    it("should initialize properties", () => {
      expect(storage.db).to.be(db);
    });
  });

  describe(".setItem(keyName, keyValue)", () => {
    let user;

    beforeEach(() => {
      const email = "foo_user@example.com";
      const uri = `/user/${email}`;
      const forwardURL = "http://example.com/foo";

      user = {email, uri, forwardURL};

      db.run = sinon.spy(async () => {});
    });

    it("should write value to DB", async () => {
      await storage.setItem(user.email, user);
      expect(storage.db.run.calledOnce).to.be(true);
    });

    it("should error on non-string keyName", async () => {
      return new Promise(async (resolve, reject) => {
        try {
          await storage.setItem(43, user);
          reject(new Error("expected thrown error"));
        } catch (err) {
          resolve();
        }
      });
    });

    it("should error on non-object keyValue", async () => {
      return new Promise(async (resolve, reject) => {
        try {
          await storage.setItem(user.email, '{"bar":42}');
          reject(new Error("expected thrown error"));
        } catch (err) {
          resolve();
        }
      });
    });
  });

  describe(".getItem(keyName)", () => {
    let user;

    beforeEach(() => {
      const email = "foo_user@example.com";
      const uri = `/user/${email}`;
      const forwardURL = "http://example.com:4567/foo";
      user = {email, uri, forwardURL};
    });

    it("should read value from storage", async () => {
      await storage.setItem(user.email, user);

      const value = await storage.getItem(user.email);

      expect(value).to.be.an("object");
      expect(value.email).to.be(user.email);
      expect(value.uri).to.be(user.uri);
      expect(value.forwardURL).to.be(user.forwardURL);
    });

    it("should error on non-string keyName", async () => {
      return new Promise(async (resolve, reject) => {
        try {
          await storage.getItem(43);
          reject(new Error("expected thrown error"));
        } catch (err) {
          resolve();
        }
      });
    });

    it("should return null on missing value", async () => {
      const value = await storage.getItem(user.email);
      expect(value).to.be(undefined);
    });
  });

  describe(".removeItem(keyName)", () => {
    let user;

    beforeEach(() => {
      const email = "foo_user@example.com";
      const uri = `/user/${email}`;
      const forwardURL = "http://example.com:4567/foo";
      user = {email, uri, forwardURL};
    });

    it("should delete value from storage", async () => {
      await storage.setItem(user.email, user);
      await storage.removeItem(user.email);
      const value = await storage.getItem(user.email);
      expect(value).to.be(undefined);
    });

    it("should error on non-string keyName", async () => {
      return new Promise(async (resolve, reject) => {
        try {
          await storage.removeItem(43);
          reject(new Error("expected thrown error"));
        } catch (err) {
          resolve();
        }
      });
    });
  });
});
