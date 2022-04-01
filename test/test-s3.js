import expect from "expect.js";
import sinon from "sinon";
import {s3} from "@zingle/smtpd";

const url = new URL("s3://my-bucket/my-key");
const bucket = "my-bucket";
const key = "/my-key";
const content = "foo";

describe("s3.putObject(s3url, content)", () => {
  let sdk;

  beforeEach(() => {
    sdk = {
      putObject: sinon.spy(() => ({promise: async() => {}})),
      getObject: sinon.spy(() => ({promise: async() => {}})),
      listObjects: sinon.spy(({NextToken}) => ({promise: async() => {
        if (NextToken) return {Contents: ["foo"], NextToken: undefined};
        else return {Contents: ["bar"], NextToken: true};
      }}))
    };

    s3.options.sdk = sdk;
  });

  afterEach(() => {
    delete s3.options.sdk;
  });

  it("should call API with bucket and key", async () => {
    await s3.putObject(url, content);
    expect(sdk.putObject.calledOnce).to.be(true);
    expect(sdk.putObject.getCall(0).firstArg).to.be.an("object");
    expect(sdk.putObject.getCall(0).firstArg.Bucket).to.be(bucket);
    expect(sdk.putObject.getCall(0).firstArg.Key).to.be(key);
  });
});

describe("s3.deleteObject(s3url)", () => {
  let sdk;

  beforeEach(() => {
    sdk = {
      deleteObject: sinon.spy(() => ({promise: async() => {}}))
    };

    s3.options.sdk = sdk;
  });

  afterEach(() => {
    delete s3.options.sdk;
  });

  it("should call API with bucket and key", async () => {
    await s3.deleteObject(url);
    expect(sdk.deleteObject.calledOnce).to.be(true);
    expect(sdk.deleteObject.getCall(0).firstArg).to.be.an("object");
    expect(sdk.deleteObject.getCall(0).firstArg.Bucket).to.be(bucket);
    expect(sdk.deleteObject.getCall(0).firstArg.Key).to.be(key);
  });
});

describe("s3.listObjects(s3url)", () => {
  let sdk;

  beforeEach(() => {
    sdk = {
      listObjects: sinon.spy(({NextToken}) => ({promise: async() => {
        if (NextToken) return {Contents: ["foo"], NextToken: undefined};
        else return {Contents: ["bar"], NextToken: true};
      }}))
    };

    s3.options.sdk = sdk;
  });

  afterEach(() => {
    delete s3.options.sdk;
  });

  it("should call API with bucket and prefix", async () => {
    for await (const item of s3.listObjects(url)) ;
    expect(sdk.listObjects.called).to.be(true);
    expect(sdk.listObjects.getCall(0).firstArg).to.be.an("object");
    expect(sdk.listObjects.getCall(0).firstArg.Bucket).to.be(bucket);
    expect(sdk.listObjects.getCall(0).firstArg.Prefix).to.be(key);
  });

  it("should iterate over all results", async () => {
    const items = [];
    for await (const item of s3.listObjects(url)) items.push(item);
    expect(sdk.listObjects.calledTwice).to.be(true);
    expect(JSON.stringify(items)).to.be('["bar","foo"]');
  });
});
