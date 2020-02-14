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
const process = require("../unified");
const crypto = require("crypto");
const stream = require("stream");
const pipeline = util.promisify(stream.pipeline);

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

module.exports = epub;

/**
 *
 * @param {string} file
 * @param {(import("vfile").VFile) => Promise<string} extract
 */
async function epub(
  file,
  extract,
  { sanitize = true, cssPrefix = "#ink-engine" }
) {
  /**
   * @type {Object.<string, string>}
   */
  const urls = {};
  let container;
  // let errorInStream
  // function errorHandler (err) {
  //   console.log('error in stream')
  //   errorInStream = err
  // }

  await pipeline(
    fs.createReadStream(file),
    unzip.Parse().on("entry", async entry => {
      if (entry.path === "META-INF/container.xml") {
        const content = await entry.buffer();
        container = content.toString();
      } else {
        entry.autodrain();
      }
    })
  );
  // find OPF file from container
  const opfPath = container.match(/full-path="([^"]+)"/)[1];
  // Read OPF file from zip
  let book;
  let toc;
  await pipeline(
    fs.createReadStream(file),
    unzip.Parse().on("entry", async entry => {
      if (entry.path === opfPath) {
        const content = await entry.buffer();
        book = parseOPF(content.toString(), opfPath);
      } else {
        entry.autodrain();
      }
    })
  );
  // convert to publication
  // Use as reference when unzipping, deciding whether to sanitize or not.

  const bookFile = vfile({
    contents: JSON.stringify(book),
    path: "index.json"
  });
  urls["index.json"] = await extract(
    bookFile,
    Object.assign({ url: "index.json" }, book),
    {
      contentType: "application/json"
    }
  );
  let files = [];
  const randomFileName = crypto.randomBytes(15).toString("hex");
  const tempDirectory = path.join(
    os.tmpdir(),
    randomFileName,
    path.basename(file),
    "/"
  );
  // await fs.promises.mkdir(tempDirectory, { recursive: true });
  const extractor = unzip.Extract({ path: tempDirectory });
  fs.createReadStream(file).pipe(extractor);
  await extractor.promise();
  if (sanitize) {
    for (const resource of book.resources) {
      if (resource.rel.includes("contents") || resource.rel.includes("ncx")) {
        const file = await fs.promises.readFile(
          path.join(tempDirectory, resource.url),
          "utf8"
        );
        toc = parseToC(file, resource.url);
      }
      if (
        resource.encodingFormat.includes("html") ||
        resource.encodingFormat.includes("svg")
      ) {
        const file = await fs.promises.readFile(
          path.join(tempDirectory, resource.url),
          "utf8"
        );
        const clean = await purify(file, resource.url, resource.encodingFormat);
        const cleanedFile = vfile({
          contents: clean,
          path: path.join(tempDirectory, resource.url)
        });
        urls[resource.url] = await extract(cleanedFile, resource, {
          contentType: resource.encodingFormat
        });
        cleanedFile.data.resource = resource;
        files = files.concat(cleanedFile);
      } else if (resource.encodingFormat.includes("css")) {
        const file = await fs.promises.readFile(
          path.join(tempDirectory, resource.url),
          "utf8"
        );
        const clean = await processCSS(file, resource.url, cssPrefix);
        const cleanedFile = vfile({
          contents: clean,
          path: path.join(tempDirectory, resource.url)
        });
        urls[resource.url] = await extract(cleanedFile, resource, {
          contentType: resource.encodingFormat
        });
        cleanedFile.data.resource = resource;
        files = files.concat(cleanedFile);
      } else if (!JSTYPES.includes(resource.encodingFormat)) {
        const file = await toVfile.read(path.join(tempDirectory, resource.url));
        urls[resource.url] = await extract(file, resource, {
          contentType: resource.encodingFormat
        });
        file.data.resource = resource;
        files = files.concat(file);
      }
    }
  } else {
    for (const resource of book.resources) {
      if (resource.rel.includes("contents") || resource.rel.includes("ncx")) {
        const file = await fs.promises.readFile(
          path.join(tempDirectory, resource.url),
          "utf8"
        );
        toc = parseToC(file, resource.url);
      }
      const file = await toVfile.read(path.join(tempDirectory, resource.url));
      urls[resource.url] = await extract(file, resource, {
        contentType: resource.encodingFormat
      });
      file.data.resource = resource;
      files = files.concat(file);
    }
  }
  files = files
    .map(file => {
      file.data.book = book;
      file.data.toc = toc;
      return file;
    })
    .filter(file => file.data.resource.encodingFormat.includes("html"));
  // call processor and extract generated json
  const result = await process(
    { files, cwd: tempDirectory, output: tempDirectory },
    extract
  );
  book.resources = book.resources.map(updateURL);
  if (result.wordcount) {
    book.wordCount = result.wordcount;
  }
  await rimraf(tempDirectory);
  return book;
  function updateURL(resource) {
    resource.url = urls[resource.url];
    return resource;
  }
}
