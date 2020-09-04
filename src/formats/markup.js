const purify = require("../dompurify");
const vfile = require("vfile");
const processor = require("../unified/dom-processor");
const path = require("path");

module.exports = async function*(options) {
  const { fragment = false, filename = "HTML", data } = options;

  const book = {
    name: path.basename(filename, ".html"),
    resources: [
      {
        url: "index.html",
        rel: ["alternate"],
        encodingFormat: "text/html"
      }
    ],
    readingOrder: [
      {
        url: "index.html",
        rel: [],
        encodingFormat: "text/html"
      }
    ]
  };
  const toc = {
    heading: book.name + " Contents",
    type: "Markup",
    children: [
      {
        children: [],
        label: book.name,
        url: "index.html"
      }
    ]
  };
  yield vfile({
    contents: JSON.stringify(toc),
    contentType: "application/json",
    path: "contents.json",
    data: { resource: Object.assign(toc, { url: "contents.json" }) }
  });

  let html;
  if (fragment) {
    html = wrap(data, book.name);
  } else {
    html = data;
  }
  const htmlFile = await processMarkup(html, book.resources[0], toc, book);
  htmlFile.contentType = "text/html";
  htmlFile.path = htmlFile.data.resource.url;
  yield htmlFile;

  const bookFile = vfile({
    contents: JSON.stringify(book),
    contentType: "application/json",
    path: "index.json",
    data: { resource: Object.assign({ url: "index.json" }, book) }
  });
  yield bookFile;

  yield book;
};

async function processMarkup(html, resource, toc, book) {
  const clean = await purify(html, resource.url, resource.encodingFormat, true);
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
