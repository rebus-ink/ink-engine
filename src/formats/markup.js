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

  let html;
  if (fragment) {
    html = wrap(data, book.name);
  } else {
    html = data;
  }
  const htmlFile = await processMarkup(html, book.resources[0], book);
  htmlFile.contentType = "text/html";
  htmlFile.path = htmlFile.data.resource.url;
  yield htmlFile;
  yield vfile({
    contents: JSON.stringify(htmlFile.toc),
    contentType: "application/json",
    path: "contents.json",
    data: { resource: Object.assign(htmlFile.toc, { url: "contents.json" }) }
  });

  const bookFile = vfile({
    contents: JSON.stringify(book),
    contentType: "application/json",
    path: "index.json",
    data: { resource: Object.assign({ url: "index.json" }, book) }
  });
  yield bookFile;

  yield book;
};

async function processMarkup(html, resource, book) {
  const clean = await purify(html, resource.url, resource.encodingFormat, true);
  const result = await processor.process(clean);
  result.data = Object.assign({}, result.data, {
    headings: result.contents.data.headings
  });
  resource = result.data.resource = Object.assign({}, resource, {
    url: resource.url + ".json",
    encodingFormat: "application/json"
  });
  const toc = {
    type: "Headings",
    heading: result.data.headings[0] ? result.data.headings[0].label : "Contents",
    children: result.data.headings,
    url: "contents.json"
  };
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
