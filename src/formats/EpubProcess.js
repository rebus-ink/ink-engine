const fs = require("fs");
const unzip = require("unzipper");
const path = require("path");
const os = require("os");
const parseOPF = require("./opf.js");
const purify = require("../dompurify");
const util = require("util");
const rimraf = util.promisify(require("rimraf"));
const processCSS = require("../postcss");
const parseToC = require("./epub-nav");
const toVfile = require("to-vfile");
const vfile = require("vfile");
const crypto = require("crypto");
const processor = require("../unified/dom-processor");

const JSTYPES = [
  "text/javascript",
  "text/ecmascript",
  "text/javascript1.0",
  "text/javascript1.1",
  "text/javascript1.2",
  "text/javascript1.3",
  "text/javascript1.4",
  "text/javascript1.5",
  "text/jscript",
  "text/livescript",
  "text/x-javascript",
  "text/x-ecmascript",
  "application/x-javascript",
  "application/x-ecmascript",
  "application/javascript",
  "application/ecmascript"
];

module.exports = class Epub {
  constructor(file, options) {
    this.file = file;
    const { sanitize = true, cssPrefix = "#ink-engine", extract } = options;
    this.extract = extract;
    this.sanitize = sanitize;
    this.cssPrefix = cssPrefix;
    const randomFileName = crypto.randomBytes(15).toString("hex");
    this.tempDirectory = path.join(
      os.tmpdir(),
      randomFileName,
      path.basename(file),
      "/"
    );
  }

  getTextFile(fileName) {
    const file = path.join(this.tempDirectory, fileName);
    return fs.promises.readFile(file, "utf8");
  }

  async extractFiles() {
    const extractor = unzip.Extract({ path: this.tempDirectory });
    fs.createReadStream(this.file).pipe(extractor);
    return extractor.promise();
  }

  async getOpf() {
    const meta = await this.getTextFile("META-INF/container.xml");
    this.opfPath = meta.match(/full-path="([^"]+)"/)[1];
    this.opf = await this.getTextFile(this.opfPath);
    this.book = parseOPF(this.opf.toString(), this.opfPath);
    this.resources = this.book.resources;
  }

  async getContents() {
    const contents = this.resources.find(
      resource =>
        resource.rel.includes("contents") || resource.rel.includes("ncx")
    );
    const file = await this.getTextFile(contents.url);
    this.toc = parseToC(file, contents.url);
    this.extract(
      { contents: JSON.stringify(this.toc) },
      Object.assign(this.toc, { url: "contents.json" }),
      { contentType: "application/json" }
    );
  }

  async processMarkup(resource) {
    const file = await this.getTextFile(resource.url);
    const clean = await purify(
      file,
      resource.url,
      resource.encodingFormat,
      true
    );
    const result = await processor.process(clean);
    resource = result.data.resource = Object.assign({}, resource, {
      url: resource.url + ".json",
      encodingFormat: "application/json"
    });
    const contents = {
      contents: result.contents,
      resource,
      toc: this.toc,
      book: this.book
    };
    result.contents = JSON.stringify(contents, null, 2);
    return result;
  }

  async processStylesheet(resource) {
    const file = await this.getTextFile(resource.url);
    const clean = await processCSS(file, resource.url, this.cssPrefix);
    const virtualFile = vfile({
      contents: clean,
      path: path.join(this.tempDirectory, resource.url)
    });
    virtualFile.data.resource = resource;
    return virtualFile;
  }

  async process() {
    await this.extractFiles();
    await this.getOpf();
    const bookFile = vfile({
      contents: JSON.stringify(this.book),
      path: "index.json"
    });
    await this.extract(
      bookFile,
      Object.assign({ url: "index.json" }, this.book),
      {
        contentType: "application/json"
      }
    );
    await this.getContents();
    for (const resource of this.resources) {
      if (
        resource.encodingFormat.includes("html") ||
        resource.encodingFormat.includes("svg")
      ) {
        const json = await this.processMarkup(resource);
        await this.extract(json, json.data.resource);
      } else if (resource.encodingFormat.includes("css")) {
        const cleanedFile = await this.processStylesheet(resource);
        await this.extract(cleanedFile, resource, {
          contentType: resource.encodingFormat
        });
      } else if (!JSTYPES.includes(resource.encodingFormat)) {
        const file = await toVfile.read(
          path.join(this.tempDirectory, resource.url)
        );
        file.data.resource = resource;
        await this.extract(file, resource, {
          contentType: resource.encodingFormat
        });
      }
    }
    await rimraf(this.tempDirectory);
    return this.book;
  }
};
