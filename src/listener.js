import express from "express";
import basic from "express-basic-auth";
import {semantics} from "express-semantic-status";
import fullURL from "express-full-url";
import Email from "email-addresses";

export function requestListener({user, pass, userdb}) {
  const app = express();
  const unauthorizedResponse = "Unauthorized\n";

  app.use(basic({users: {[user]: pass}, unauthorizedResponse}))
  app.use(express.json());
  app.use(semantics());
  app.use(fullURL());

  app.post("/user", async (req, res) => {
    const {email, forwardURL, ...extra} = req.body;
    const uri = `/user/${email}`;
    const extras = Object.keys(extra).join(", ");
    const {address} = Email.parseOneAddress(email) || {};

    if (!req.is("json")) return res.sendUnsupportedMediaType();
    if (!email) return res.sendBadRequest("email required");
    if (!address) return res.sendBadRequest("invalid email");
    if (extras) return res.sendBadRequest(`invalid key(s): ${extras}`);
    if (forwardURL) try { new URL(forwardURL); } catch (err) {
      return res.sendBadRequest("invalid forward URL");
    }

    // TODO: make this safer with locked updates
    // TODO: for now, just use primitive eventual consistency
    if (await userdb.getItem(address)) {
      return res.sendConflict(`email already exists: ${address}`);
    }

    await userdb.setItem(address, {
      email: address, uri,
      forwardURL: forwardURL ? new URL(forwardURL) : undefined
    });

    res.sendSeeOther(new URL(uri, req.getFullURL()));
  });

  app.get("/user/:email", async (req, res) => {
    const {email} = req.params;
    const user = await userdb.getItem(email);

    if (user) res.json(user);
    else res.sendNotFound();
  });

  app.delete("/user/:email", async (req, res) => {
    const {email} = req.params;
    const uri = `/user/${email}`;
    const user = await userdb.getItem(uri);

    if (user) {
      await userdb.removeItem(uri);
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
