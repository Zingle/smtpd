import {promises as fs, createReadStream} from "fs";
import fetch from "node-fetch";

export default function forwarder({storage, expiry=120}) {
  return async function forward() {
    console.debug("checking for expired locks");
    await clearLocks({storage, expiry});

    console.debug("checking for files to forward");
    let forwarded = 0;

    for await (const {path, forward_url} of storage.unlockedFiles()) {
      console.debug(`locking ${path}`);

      if (await storage.lockFile(path)) {
        try {
          console.debug(`forwarding ${path} to ${forward_url}`);
          await forwardFile(path, forward_url);
          console.info(`removing forwarded file from ${path}`);
          await fs.unlink(path);
          await storage.removeFile(path);
          forwarded++;
        } finally {
          console.debug(`unlocking ${path}`);
          await storage.unlockFile(path);
          console.debug(`unlocked ${path}`);
        }
      } else {
        console.debug(`could not lock ${path}`);
      }
    }

    console.debug(`forwarded ${forwarded} files`);
  }
}

async function clearLocks({storage, expiry, now=new Date()}) {
  const ms = expiry * 60000;  // expiry mins in milliseconds
  const olderThan = new Date(now.getTime() - ms);

  for await (const {path, lockedAt} of storage.lockExpired(olderThan)) {
    console.info(`unlocking ${path}; lock expired`);
    if (await storage.unlockFile(path, lockedAt)) {
      console.debug(`unlocked ${path}`);
    } else {
      // this is probably OK; another node likely cleared it
      console.debug(`could not unlock ${path}`);
    }
  }
}

async function forwardFile(path, forwardURL) {
  return new Promise((resolve, reject) => {
    const method = "POST";
    const headers = {"Content-Type": "application/octet-stream"};
    const body = createReadStream(path);

    body.on("error", reject);
    body.on("open", async () => {
      const res = await fetch(forwardURL, {method, headers, body});

      if (res.ok) {
        resolve();
      } else {
        const status = `${res.status} ${res.statusText}`;
        reject(new Error(`unexpected ${status} from ${forwardURL}`));
      }
    });
  });
}
