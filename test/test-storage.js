import expect from "expect.js";
import sinon from "sinon";
import {Database} from "@zingle/sqlite";
import {Storage} from "@zingle/smtpd";

describe("Storage", () => {
  let db, storage;

  beforeEach(async () => {
    const filename = ":memory:";
    db = new Database(filename);
    storage = new Storage(db);
    await Storage.initialize(db);
  });

  afterEach(async () => {
    await db.close();
  });

  describe("constructor(db)", () => {
    it("should initialize properties", () => {
      expect(storage.db).to.be(db);
    });
  });

  describe(".addUser(user)", () => {
    let user;

    beforeEach(() => {
      const email = "foo_user@example.com";
      const uri = `/user/${email}`;
      const forwardURL = "http://example.com/foo";

      user = {email, uri, forwardURL};

      db.run = sinon.spy(async () => {});
    });

    it("should write value to DB", async () => {
      await storage.addUser(user);
      expect(storage.db.run.calledOnce).to.be(true);
    });
  });

  describe(".getUser(email)", () => {
    let user;

    beforeEach(() => {
      const email = "foo_user@example.com";
      const uri = `/user/${email}`;
      const forwardURL = "http://example.com:4567/foo";
      user = {email, uri, forwardURL};
    });

    it("should read value from storage", async () => {
      await storage.addUser(user);

      const value = await storage.getUser(user.email);

      expect(value).to.be.an("object");
      expect(value.email).to.be(user.email);
      expect(value.uri).to.be(user.uri);
      expect(value.forwardURL).to.be(user.forwardURL);
    });

    it("should return null on missing value", async () => {
      const value = await storage.getUser(user.email);
      expect(value).to.be(undefined);
    });
  });

  describe(".removeUser(email)", () => {
    let user;

    beforeEach(() => {
      const email = "foo_user@example.com";
      const uri = `/user/${email}`;
      const forwardURL = "http://example.com:4567/foo";
      user = {email, uri, forwardURL};
    });

    it("should delete value from storage", async () => {
      await storage.addUser(user);
      await storage.removeUser(user.email);
      const value = await storage.getUser(user.email);
      expect(value).to.be(undefined);
    });
  });
});
