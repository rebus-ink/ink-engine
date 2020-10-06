const fs = require("fs");
const unzip = require("unzipper");
const path = require("path");
const parseOPF = require("./opf.js");
const purify = require("../dompurify");
const util = require("util");
const rimraf = util.promisify(require("rimraf"));
const processCSS = require("../postcss");
const parseToC = require("./epub-nav");
const toVfile = require("to-vfile");
const vfile = require("vfile");
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

module.exports = async function*(options) {
  // Currently we always sanitize markup and CSS and skip JS files. This may change in the future
  const { cssPrefix = "#ink-engine", filename, tempRoot } = options;
  const tempDirectory = path.join(
    tempRoot,
    path.basename(filename, ".epub"),
    "/"
  );
  // First we extract all of the files because random access for zip files is hard to get right
  await extractFiles(tempDirectory, filename);

  // Next we get the OPF file and parse it because that file will guide all of our work below.
  const opfPath = await getOPFPath(tempDirectory);
  const opf = await getOPF(tempDirectory, opfPath);

  // Now we need the book file itself, which is the primary entry point for clients
  const book = parseOPF(opf.toString(), opfPath);
  const resources = book.resources;
  const bookFile = vfile({
    contents: JSON.stringify(book),
    contentType: "application/json",
    path: "index.json",
    data: { resource: Object.assign({ url: "index.json" }, book) }
  });
  yield bookFile;

  // Now we need to extract and convert the primary navigation file
  const toc = await getContents(tempDirectory, resources);
  yield {
    contents: JSON.stringify(toc),
    contentType: "application/json",
    path: "contents.json",
    data: { resource: Object.assign(toc, { url: "contents.json" }) }
  };

  // Here we get to the meat of the processor: the actual book files
  for (const resource of resources) {
    if (
      resource.encodingFormat.includes("html") ||
      resource.encodingFormat.includes("svg")
    ) {
      const json = await processMarkup(tempDirectory, resource, toc, book);
      yield json;
    } else if (resource.encodingFormat.includes("css")) {
      const cleanedFile = await processStylesheet(
        tempDirectory,
        resource,
        cssPrefix
      );
      yield cleanedFile;
    } else if (!JSTYPES.includes(resource.encodingFormat)) {
      const file = await toVfile.read(path.join(tempDirectory, resource.url));
      file.contentType = resource.encodingFormat;
      file.data.resource = resource;
      file.path = resource.url;
      yield file;
    }
  }

  // And we need to clean up after ourselves because if we don't, things get very cluttered very quickly.
  // Also essential for many cloud function hosts as not cleaning up after the function can slow things down.
  await rimraf(tempRoot);
  // Doing this to pass the test after refactor
  yield book;
};

function extractFiles(tempDirectory, filename) {
  const extractor = unzip.Extract({ path: tempDirectory });
  fs.createReadStream(filename).pipe(extractor);
  return extractor.promise();
}

async function getOPFPath(tempDirectory) {
  const meta = await getTextFile(tempDirectory, "META-INF/container.xml");
  const opfPath = meta.match(/full-path="([^"]+)"/)[1];
  return opfPath;
}
function getOPF(tempDirectory, opfPath) {
  return getTextFile(tempDirectory, opfPath);
}

function getTextFile(tempDirectory, fileName) {
  const file = path.join(tempDirectory, fileName);
  return fs.promises.readFile(file, "utf8");
}

async function getContents(tempDirectory, resources) {
  const contents = resources.find(
    resource =>
      resource.rel.includes("contents") || resource.rel.includes("ncx")
  );
  const file = await getTextFile(tempDirectory, contents.url);
  const toc = parseToC(file, contents.url);
  return toc;
}

// This is the core processor for each chapter of the epub

async function processMarkup(tempDirectory, resource, toc, book) {
  const file = await getTextFile(tempDirectory, resource.url);
  const clean = await purify(file, resource.url, resource.encodingFormat, true);
  const result = await processor.process(clean);
  resource = result.data.resource = Object.assign({}, resource, {
    url: resource.url + ".json",
    encodingFormat: "application/json"
  });
  const contents = {
    contents: result.contents,
    resource,
    toc: toc,
    book: book
  };
  result.contents = JSON.stringify(contents, null, 2);
  result.path = resource.url;
  result.contentType = "application/json";
  return result;
}

async function processStylesheet(tempDirectory, resource, cssPrefix) {
  const file = await getTextFile(tempDirectory, resource.url);
  const clean = await processCSS(file, resource.url, cssPrefix);
  const virtualFile = vfile({
    contents: clean,
    contentType: resource.encodingFormat,
    path: resource.url
  });
  virtualFile.data.resource = resource;
  return virtualFile;
}
