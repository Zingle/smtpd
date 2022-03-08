import {promises as fs} from "fs";
import {join} from "path";
import {randomBytes} from "crypto";
import concat from "concat-stream";
import mkdirp from "mkdirp";
import {simpleParser} from "mailparser";
import express from "express";
import basic from "express-basic-auth";
import {semantics} from "express-semantic-status";
import fullURL from "express-full-url";
import Email from "email-addresses";

export function dataListener({dir, storage}) {
  const inbox = join(dir, "inbox");

  return function onData(stream, session, done) {
    const {id} = session;

    stream.on("error", err => {
      console.warn(`[${id}] error receiving mail`);
      console.error(err);
      done(err);
    });

    stream.pipe(concat(async (buffer) => {
      let message;

      try {
        message = await simpleParser(String(buffer));
      } catch (err) {
        console.warn(`[${id}] error parsing mail`);
        console.error(process.env.DEBUG ? err : err.message);
        return done(err);
      }

      try {
        const email = message.to.value[0].address;
        const {attachments} = message;

        console.debug(`[${id}] parsed mail for ${email}`);

        const user = await storage.getUser(email);
        const {forward_url} = user;
        const mid = randomBytes(16).toString("hex");

        await mkdirp(inbox);

        for (let i=1,length=attachments.length; i<=length; i++) {
          const {content} = attachments[i-1];
          const path = join(inbox, `${mid}.${i}`);

          console.debug(`[${id}] saving attachment for ${email} to ${path}`);

          await fs.writeFile(path, content);
          await storage.addFile(path, forward_url);

          console.info(`[${id}] saved attachment for ${email} to ${path}`);
        }

        console.debug(`[${id}] received mail for ${email}`);
        done();
      } catch (err) {
        console.warn(`[${id}] error processing mail`);
        console.error(process.env.DEBUG ? err : err.message);
        done(err);
      }
    }));
  }
}

export function receiptListener({storage}) {
  return async function onRcptTo(address, session, done) {
    const {id} = session;
    const {address: email} = address;

    console.debug(`[${id}] delivery arrived for ${email}`);

    if (await storage.getUser(email)) {
      console.info(`[${id}] accepting delivery for ${email}`);
      done();
    } else {
      console.info(`[${id}] rejecting delivery for ${email}`);
      done(new Error("recipient rejected"));
    }
  };
}

export function requestListener({user, pass, storage}) {
  const app = express();
  const unauthorizedResponse = "Unauthorized\n";

  app.use(basic({users: {[user]: pass}, unauthorizedResponse}))
  app.use(express.json());
  app.use(semantics());
  app.use(fullURL());

  app.post("/user", async (req, res) => {
    const {email, forward_url, ...extra} = req.body;
    const uri = `/user/${email}`;
    const extras = Object.keys(extra).join(", ");
    const {address} = Email.parseOneAddress(email) || {};

    if (!req.is("json")) return res.sendUnsupportedMediaType();
    if (!email) return res.sendBadRequest("email required");
    if (!address) return res.sendBadRequest("invalid email");
    if (extras) return res.sendBadRequest(`invalid key(s): ${extras}`);

    try { new URL(forward_url); } catch (err) {
      return res.sendBadRequest("invalid forward URL");
    }

    // TODO: make this safer with locked updates
    // TODO: for now, just use primitive eventual consistency
    if (await storage.getUser(address)) {
      return res.sendConflict(`email already exists: ${address}`);
    }

    await storage.addUser({
      email: address, uri,
      forward_url: new URL(forward_url)
    });

    res.sendSeeOther(new URL(uri, req.getFullURL()));
  });

  app.get("/user/:email", async (req, res) => {
    const {email} = req.params;
    const user = await storage.getUser(email);

    if (user) res.json(user);
    else res.sendNotFound();
  });

  app.delete("/user/:email", async (req, res) => {
    const {email} = req.params;
    const uri = `/user/${email}`;
    const user = await storage.getUser(uri);

    if (user) {
      await storage.removeUser(uri);
      res.sendAccepted();
    } else {
      console.log(res);
      res.sendNotFound();
    }
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.sendInternalServerError();
  });

  return app;
}
