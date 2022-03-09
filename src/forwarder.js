import fetch from "node-fetch";

const MINS = 60 * 1000;   // convert minutes to milliseconds

export default function forwarder({dir, storage, expiry=120}) {
  return async function forward() {
    const olderThan = new Date(Date.now() - expiry*MINS);

    for await (const file of storage.staleFiles(olderThan)) {
      const {name, forward_url, touched_at} = file;

      if (await storage.touchFile(name, touched_at)) {
        try {
          console.debug(`forwarding ${name} to ${forward_url}`);

          const uri = `/file/${secret.signMessage(name)}`;
          const method = "POST";
          const headers = {"Content-Type": "text/uri-list"};
          const body = uri + "\r\n";
          const res = await fetch(forward_url, {method, headers, body});

          if (res.ok) {
            console.debug(`sent link for ${uri} to ${forward_url}`);
            forwarded++;
          } else {
            throw new Error(`could not send link to ${forward_url}`);
          }
        } catch (err) {
          console.error(err);
        }
      }
    }

    console.debug(`forwarded ${forwarded} files`);
  }
}
