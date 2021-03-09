const os = require("os");
const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const purify = require("../dompurify");
const util = require("util");
const rimraf = util.promisify(require("rimraf"));
const vfile = require("vfile");
const processor = require("../unified/dom-processor");
const mime = require("mime");
const toVfile = require("to-vfile");
const crypto = require("crypto");
const mammothOptions = {
  styleMap: [
    "p[style-name='Title'] => h1:fresh",
    "p[style-name='Quote'] => blockquote:fresh",
    "r[style-name='Emphasis'] => em:fresh",
    "p[style-name='Intense Quote'] => blockquote:fresh",
    "p[style-name='Section Title'] => h2:fresh",
    "p[style-name='Subsection Title'] => h3:fresh"
  ]
};

module.exports = async function*(options) {
  const { filename } = options;
  const randomFileName = crypto.randomBytes(15).toString("hex");
  const tempRoot = path.join(os.tmpdir(), randomFileName, "/");
  const tempDirectory = path.join(
    tempRoot,
    path.basename(filename, ".docx"),
    "/"
  );
  let counter = 0;
  let images = [];
  await fs.promises.mkdir(tempDirectory, { recursive: true });
  mammothOptions.convertImage = mammoth.images.imgElement(imageProcess);
  const html = await mammoth.convertToHtml({ path: filename }, mammothOptions);

  const book = {
    name: path.basename(filename, ".docx"),
    resources: [
      {
        url: "index.html",
        rel: ["alternate"],
        encodingFormat: "text/html"
      }
    ].concat(images),
    readingOrder: [
      {
        url: "index.html",
        rel: [],
        encodingFormat: "text/html"
      }
    ]
  };

  const htmlFile = await processMarkup(
    wrap(html.value, book.name),
    book.resources[0],
    book
  );
  htmlFile.contentType = "text/html";
  htmlFile.path = htmlFile.data.resource.url;
  yield htmlFile;
  yield vfile({
    contents: JSON.stringify(htmlFile.toc),
    contentType: "application/json",
    path: "contents.json",
    data: { resource: Object.assign(htmlFile.toc, { url: "contents.json" }) }
  });

  for (const image of images) {
    const file = await toVfile.read(path.join(tempDirectory, image.url));
    file.data.resource = image;
    file.contentType = image.encodingFormat;
    file.path = image.url;
    yield file;
  }

  const bookFile = vfile({
    contents: JSON.stringify(book),
    contentType: "application/json",
    path: "index.json",
    data: { resource: Object.assign({ url: "index.json" }, book) }
  });
  yield bookFile;

  await rimraf(tempDirectory);

  yield book;

  async function imageProcess(image) {
    const buffer = await image.read();
    const filename = `${++counter}.${mime.getExtension(image.contentType)}`;
    await fs.promises.writeFile(path.join(tempDirectory, filename), buffer);
    images = images.concat({
      url: filename,
      rel: [],
      encodingFormat: image.contentType
    });
    return {
      src: filename
    };
  }
};
async function processMarkup(html, resource, book) {
  const clean = await purify(html, resource.url, resource.encodingFormat, true);
  const result = await processor.process(clean);
  result.data = Object.assign({}, result.data, {
    headings: result.contents.data.headings
  });
  const toc = {
    type: "Headings",
    heading: result.data.headings[0]
      ? result.data.headings[0].label
      : "Contents",
    children: result.data.headings,
    url: "contents.json"
  };
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
  result.toc = toc;
  return result;
}

function wrap(body, title) {
  return `<!doctype html>
  <html>
  <head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width,initial-scale=1.0'>
    <title>${title}</title>
  </head>
  <body id="body">
  ${body}
  </body>
  </html>
  `;
}
