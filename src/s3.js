import SDK from "aws-sdk/clients/s3.js";
import {join} from "path";

// setup defaults as prototype of active options
// so defaults can be recovered by deleting modifications
const defaultOptions = {sdk: new SDK()};
export const options = Object.create(defaultOptions);

export function parseURL(url) {
  url = new URL(url);

  if (url.protocol !== "s3:") {
    throw new Error("unsupported URL scheme");
  }

  const Bucket = url.host;
  const Key = url.pathname;

  return {Bucket, Key};
}

export async function deleteObject(s3url) {
  const {Bucket, Key} = parseURL(s3url);
  return await options.sdk.deleteObject({Bucket, Key}).promise();
}

export async function* listObjects(s3url, delimiter="/") {
  const {Bucket, Key: Prefix} = parseURL(s3url);
  const Delimiter = delimiter;
  const params = {Bucket, Prefix, Delimiter};

  let next = undefined;

  do {
    const NextToken = next;
    const res = await options.sdk.listObjects({...params, NextToken}).promise();

    yield* res.Contents;

    next = res.NextToken || undefined;
  } while (next);
}

export async function putObject(s3url, content) {
  const {Bucket, Key} = parseURL(s3url);
  const Body = content;
  return await options.sdk.putObject({Bucket, Key, Body}).promise();
}
