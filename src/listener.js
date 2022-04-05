import {promises as fs} from "fs";
import {join} from "path";
import {randomBytes} from "crypto";
import concat from "concat-stream";
import {simpleParser} from "mailparser";
import express from "express";
import {semantics} from "express-semantic-status";
import fullURL from "express-full-url";
import Email from "email-addresses";
import {s3} from "@zingle/smtpd";

export function dataListener({userdb}) {
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

        const user = await userdb.getUser(email);
        const {drop_url} = user;
        const msgid = randomBytes(4).toString("hex");

        for (let i=1,length=attachments.length; i<=length; i++) {
          const name = msgid + randomBytes(4).toString("hex");
          const {content} = attachments[i-1];
          const url = new URL(name, drop_url);

          console.debug(`[${id}] saving attachment for ${email} to ${url}`);

          await s3.putObject(url, content);

          console.info(`[${id}] saved attachment for ${email} to ${url}`);
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

export function receiptListener({userdb}) {
  return async function onRcptTo(address, session, done) {
    const {id} = session;
    const {address: email} = address;

    console.debug(`[${id}] delivery arrived for ${email}`);

    if (await userdb.getUser(email)) {
      console.info(`[${id}] accepting delivery for ${email}`);
      done();
    } else {
      console.info(`[${id}] rejecting delivery for ${email}`);
      done(new Error("recipient rejected"));
    }
  };
}

export function requestListener({dir, userdb, secret}) {
  const app = express();
  const unauthorizedResponse = "Unauthorized\n";

  app.use(semantics());
  app.use(jwt({secret}));
  app.use(express.json());
  app.use(fullURL());

  app.post("/token", authorize(), async (req, res) => {
    const token = secret.issueToken();
    res.set("Content-Type", "application/jwt");
    res.send(token);
  });

  app.get("/token", authorize(), async (req, res) => {
    if (req.jwt) res.json(req.jwt);
    else res.sendUnauthorized();
  });

  app.post("/user", authorize(), async (req, res) => {
    const {email, drop_url, ...extra} = req.body;
    const uri = `/user/${email}`;
    const extras = Object.keys(extra).join(", ");
    const {address} = Email.parseOneAddress(email) || {};

    if (!req.is("json")) return res.sendUnsupportedMediaType();
    if (!email) return res.sendBadRequest("email required");
    if (!drop_url) return res.sendBadRequest("drop_url required");
    if (!address) return res.sendBadRequest("invalid email");
    if (extras) return res.sendBadRequest(`invalid key(s): ${extras}`);
    if (!drop_url.startsWith("s3:")) return res.sendBadRequest("invalid drop URL");
    if (drop_url.slice(-1) !== "/") return res.sendBadRequest("invalid drop URL");

    try { new URL(drop_url); } catch (err) {
      return res.sendBadRequest("invalid drop URL");
    }

    // TODO: make this safer with locked updates
    // TODO: for now, just use primitive eventual consistency
    if (await userdb.getUser(address)) {
      return res.sendConflict(`email already exists: ${address}`);
    }

    await userdb.addUser({
      email: address, uri,
      drop_url: new URL(drop_url)
    });

    res.sendSeeOther(new URL(uri, req.getFullURL()));
  });

  app.get("/user/:email", authorize(), fetchUser(), etag(), async (req, res) => {
    if (req.user) {
      res.set("ETag", req.etag);
      res.json(req.user);
    } else {
      res.sendNotFound();
    }
  });

  app.delete("/user/:email", authorize(), fetchUser(), etag(), async (req, res) => {
    if (req.user) {
      await userdb.removeUser(req.user.email);
      res.sendNoContent();
    } else {
      req.sendNotFound();
    }
  });

  app.put("/user/:email", authorize(), fetchUser(), etag(), async (req, res) => {
    if (req.user) {
      const etag = await userdb.updateUser(req.user, req.etag);

      if (etag) {
        res.set("ETag", etag);
        res.sendNoContent();
      } else {
        res.sendConflict();
      }
    } else {
      req.sendNotFound();
    }
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.sendInternalServerError();
  });

  return app;

  function jwt({secret}) {
    return function jwt(req, res, next) {
      req.jwt = false;

      const auth = req.get("Authorization") || "";
      const [scheme, creds] = (auth||"").split(" ");

      if (scheme.toLowerCase() === "bearer") {
        const token = secret.verifyToken(creds);
        req.jwt = token;
      }

      next();
    };
  }

  function authorize() {
    return function authorize(req, res, next) {
      if (req.jwt) return next();
      if (req.socket.remoteAddress === "127.0.0.1") return next();
      if (req.socket.remoteAddress === "::1") return next();

      // not authorized
      res.sendUnauthorized();
    };
  }

  function etag() {
    return function etag(req, res, next) {
      const {method, etag} = req;
      const GET = method === "GET" || method === "HEAD";
      const PUT = method === "PUT";
      const DELETE = method === "DELETE";

      if (GET && etag && etag === req.get("If-None-Match")) {
        res.sendNotModified();
      } else if (PUT && etag && req.get("If-None-Match") === "*") {
        res.sendPreconditionFailed();
      } else if (PUT && req.get("If-Match") && etag !== req.get("If-Match")) {
        res.sendPreconditionFailed();
      } else if (PUT && !req.get("If-Match") && req.get("If-None-Match") !== "*") {
        res.sendPreconditionRequired();
      } else if (DELETE && req.get("If-Match") && etag !== req.get("If-Match")) {
        res.sendPreconditionFailed();
      } else if (DELETE && !req.get("If-Match")) {
        res.sendPreconditionRequired();
      } else {
        next();
      }
    };
  }

  function fetchUser() {
    return async function fetchUser(req, res, next) {
      req.user = req.etag = false;

      const {email} = req.params;
      const {rev, ...user} = await userdb.getUser(email);

      if (user) {
        req.user = user;
        req.etag = rev;
      }

      next();
    };
  }
}
