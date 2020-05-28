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

module.exports = class Docx {
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
    this.counter = 0;
    this.images = [];
  }

  async imageProcess(image) {
    const buffer = await image.read();
    const filename = `${++this.counter}.${mime.getExtension(
      image.contentType
    )}`;
    await fs.promises.writeFile(
      path.join(this.tempDirectory, filename),
      buffer
    );
    this.images = this.images.concat({
      url: filename,
      rel: [],
      encodingFormat: image.contentType
    });
    return {
      src: filename
    };
  }

  async processMarkup(html, resource) {
    const clean = await purify(
      html,
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
      toc: this.contents,
      book: this.book
    };
    result.contents = JSON.stringify(contents, null, 2);
    return result;
  }

  async process() {
    await fs.promises.mkdir(this.tempDirectory, { recursive: true });
    const imageProcess = image => {
      return this.imageProcess(image);
    };
    options.convertImage = mammoth.images.imgElement(imageProcess);
    const html = await mammoth.convertToHtml({ path: this.file }, options);
    this.book = {
      name: path.basename(this.file, ".docx"),
      resources: [
        {
          url: "index.html",
          rel: ["alternate"],
          encodingFormat: "text/html"
        }
      ].concat(this.images),
      readingOrder: [
        {
          url: "index.html",
          rel: [],
          encodingFormat: "text/html"
        }
      ]
    };
    const htmlFile = await this.processMarkup(
      wrap(html.value, this.book.name),
      this.book.resources[0]
    );

    for (const image of this.images) {
      const file = await toVfile.read(path.join(this.tempDirectory, image.url));
      await this.extract(file, image, {
        contentType: image.encodingFormat
      });
      file.data.resource = image;
    }
    await this.extract(htmlFile, this.book.resources[0], {
      contentType: "text/html"
    });
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

    await rimraf(this.tempDirectory);
    return this.book;
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
