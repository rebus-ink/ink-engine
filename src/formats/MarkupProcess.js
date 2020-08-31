const os = require("os");
const fs = require("fs");
const path = require("path");
const purify = require("../dompurify");
const util = require("util");
const rimraf = util.promisify(require("rimraf"));
const vfile = require("vfile");
const processor = require("../unified/dom-processor");
// const toVfile = require("to-vfile");
const crypto = require("crypto");

module.exports = class Markup {
  constructor(file, options) {
    this.file = file;
    const {
      sanitize = true,
      cssPrefix = "#ink-engine",
      extract,
      fragment = false,
      name = path.basename(this.file, ".html")
    } = options;
    this.extract = extract;
    this.sanitize = sanitize;
    this.cssPrefix = cssPrefix;
    this.fragment = fragment;
    this.name = name;
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
  // // At some point we'd like to extract Base64 embedded images and download referenced images
  // async imageProcess(image) {
  //   const buffer = await image.read();
  //   const filename = `${++this.counter}.${mime.getExtension(
  //     image.contentType
  //   )}`;
  //   await fs.promises.writeFile(
  //     path.join(this.tempDirectory, filename),
  //     buffer
  //   );
  //   this.images = this.images.concat({
  //     url: filename,
  //     rel: [],
  //     encodingFormat: image.contentType
  //   });
  //   return {
  //     src: filename
  //   };
  // }

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
      toc: this.toc,
      book: this.book
    };
    result.contents = JSON.stringify(contents, null, 2);
    return result;
  }

  async process() {
    await fs.promises.mkdir(this.tempDirectory, { recursive: true });
    const text = await fs.promises.readFile(this.file);
    // Optionally process images.
    this.book = {
      name: this.name,
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
    this.toc = {
      heading: this.book.name + " Contents",
      type: "Markup",
      children: [
        {
          children: [],
          label: this.book.name,
          url: "index.html"
        }
      ]
    };
    await this.extract(
      { contents: JSON.stringify(this.toc) },
      Object.assign(this.toc, { url: "contents.json" }),
      { contentType: "application/json" }
    );
    let html;
    if (this.fragment) {
      html = wrap(text, this.name);
    } else {
      html = text;
    }
    const htmlFile = await this.processMarkup(html, this.book.resources[0]);

    // // No image support yet
    // for (const image of this.images) {
    //   const file = await toVfile.read(path.join(this.tempDirectory, image.url));
    //   await this.extract(file, image, {
    //     contentType: image.encodingFormat
    //   });
    //   file.data.resource = image;
    // }
    await this.extract(htmlFile, htmlFile.data.resource, {
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
