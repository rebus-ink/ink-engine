const os = require("os");
const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const purify = require("../dompurify");
const util = require("util");
const rimraf = util.promisify(require("rimraf"));
const vfile = require("vfile");
const process = require("../unified");
const mime = require("mime");
const toVfile = require("to-vfile");
const options = {
  styleMap: [
    "p[style-name='Title'] => h1:fresh",
    "p[style-name='Quote'] => blockquote:fresh",
    "r[style-name='Emphasis'] => em:fresh",
    "p[style-name='Intense Quote'] => blockquote:fresh",
    "p[style-name='Section Title'] => h2:fresh",
    "p[style-name='Subsection Title'] => h3:fresh"
  ]
};

module.exports = async function docx(filepath, extract, { sanitize = true }) {
  const tempDirectory = path.join(os.tmpdir(), path.basename(filepath), "/");
  await fs.promises.mkdir(tempDirectory, { recursive: true });
  let counter = 0;
  let images = [];
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
  options.convertImage = mammoth.images.imgElement(function(image) {
    return imageProcess(image);
  });
  const html = await mammoth.convertToHtml({ path: filepath }, options);
  const book = {
    name: path.basename(filepath, ".docx"),
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
  const urls = {};
  // convert to publication
  // Use as reference when unzipping, deciding whether to sanitize or not.

  const clean = await purify(wrap(html.value, book.name), "index.html");
  await fs.promises.mkdir(tempDirectory, { recursive: true });
  await fs.promises.writeFile(path.join(tempDirectory, "index.html"), clean);
  for (const image of images) {
    const file = await toVfile.read(path.join(tempDirectory, image.url));
    urls[image.url] = await extract(file, image, {
      contentType: image.encodingFormat
    });
    file.data.resource = image;
  }
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
  const htmlfile = vfile({
    contents: clean,
    path: path.join(tempDirectory, "index.html")
  });
  urls["index.html"] = await extract(htmlfile, book.resources[0], {
    contentType: "text/html"
  });
  htmlfile.data.book = book;
  htmlfile.data.toc = false;
  htmlfile.data.resource = {
    url: "index.html",
    rel: ["alternate"],
    encodingFormat: "text/html"
  };
  const files = [htmlfile];
  const { wordcount } = await process(
    { files, cwd: tempDirectory, output: tempDirectory },
    extract
  );
  book.resources = book.resources.map(updateURL);
  book.wordCount = wordcount;
  await rimraf(tempDirectory);
  return book;
  function updateURL(resource) {
    resource.url = urls[resource.url];
    return resource;
  }
};

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
