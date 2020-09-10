const vfile = require("vfile");
const processor = require("../unified/dom-processor");
const purify = require("../dompurify");
// domstubs.js is an APACHE licensed file from Mozilla's SVG generation for PDF.js example.
require("./domstubs.js").setStubs(global);
const pdfjsLib = require("pdfjs-dist/es5/build/pdf.js");
const path = require("path");

// Some PDFs need external cmaps.
const CMAP_URL = "../../node_modules/pdfjs-dist/cmaps/";
const CMAP_PACKED = true;

// We need to add json processing, toc-creation (use # links to page ids), and book creation to this.
module.exports = async function*({ data, filename = "PDF.pdf" }) {
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(data),
    cMapUrl: CMAP_URL,
    cMapPacked: CMAP_PACKED,
    fontExtraProperties: true
  }).promise;
  const numPages = doc.numPages;

  const information = await doc.getMetadata();
  let name = path.basename(filename);
  if (information.info.Title) {
    name = information.info.Title;
  }
  const images = [];
  for (let index = 0; index < numPages; index++) {
    images[index] = {
      url: getFileNameForPage(index + 1),
      rel: [],
      encodingFormat: "image/svg+xml"
    };
  }

  const book = getBook(name, images);
  book.numberOfPages = numPages;
  yield vfile({
    contents: JSON.stringify(book),
    contentType: "application/json",
    path: "index.json"
  });
  // processmarkup should create a toc file that we then just yield
  const toc = getToC(name, numPages);
  yield vfile({
    contents: JSON.stringify(toc),
    contentType: "application/json",
    path: "contents.json"
  });

  let pages = [];
  for (var i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const filePath = getFileNameForPage(i);
    yield await getPageBack(page, viewport, filePath);
    pages = pages.concat(getPageText(page, viewport, filePath));
  }
  const texts = await Promise.all(pages);
  // Turn this into a processed json file
  const result = await processMarkup(
    wrap(texts.join("\n"), name),
    { url: "index.html", encodingFormat: "text/html" },
    book,
    toc
  );

  yield result;
};

async function getPageBack(page, viewport, path) {
  const opList = await page.getOperatorList();
  var svgGfx = new pdfjsLib.SVGGraphics(page.commonObjs, page.objs);
  svgGfx.embedFonts = true;
  const svg = await svgGfx.getSVG(opList, viewport);
  return vfile({
    contents: svg.toString(),
    contentType: "image/svg+xml",
    path
  });
}

function getFileNameForPage(pageNum) {
  pageNum = String(pageNum);
  return `page${pageNum.padStart(4, "0")}.svg`;
}

async function getPageText(page, viewport, filepath) {
  const textContent = await page.getTextContent();
  const text = textContent.items.map(textItem => {
    // we have to take in account viewport transform, which includes scale,
    // rotation and Y-axis flip, and not forgetting to flip text.
    var tx = pdfjsLib.Util.transform(
      pdfjsLib.Util.transform(viewport.transform, textItem.transform),
      [1, 0, 0, -1, 0, 0]
    );
    var style = textContent.styles[textItem.fontName];
    var fontHeight = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
    let width = textItem.width * 2;
    if (style.vertical) {
      width = textItem.height * 2;
    }
    var angle = Math.atan2(tx[1], tx[0]);
    if (style.vertical) {
      angle += Math.PI / 2;
    }
    var fontAscent = fontHeight;
    if (style.ascent) {
      fontAscent = style.ascent * fontAscent;
    } else if (style.descent) {
      fontAscent = (1 + style.descent) * fontAscent;
    }
    let left, top;
    if (angle === 0) {
      left = tx[4];
      top = tx[5] - fontAscent;
    } else {
      left = tx[4] + fontAscent * Math.sin(angle);
      top = tx[5] - fontAscent * Math.cos(angle);
    }
    let transform = "";
    if (angle !== 0) {
      transform = `transform="rotate(${angle}deg)"`;
    }
    return `<text direction="${
      textItem.dir
    }" x="${left}" ${transform} y="${top +
      fontHeight}" textLength="${width}" font-family="${
      style.fontFamily
    }" fill="transparent" lengthAdjust="spacingAndGlyphs" font-size="${fontHeight}px">${
      textItem.str
    }</text>`;
  });
  return `<ink-page data-pdf-page="${page.pageNumber}" id="page${
    page.pageNumber
  }"><h2 data-ink-page-header><span data-ink-page-label>Page </span><span data-ink-page-number>${
    page.pageNumber
  }</span></h2><svg xmlns="http://www.w3.org/2000/svg" width="${
    viewport.width
  }px" height="${viewport.height}px" preserveAspectRatio="none" viewBox="0 0 ${
    viewport.width
  } ${viewport.height}" font-size="1">
  <image href="${filepath}" height="${viewport.height}" width="${
    viewport.width
  }"/>
  ${text.join("")}
  </svg></ink-page>
  `;
}
function wrap(body, title) {
  return `<!doctype html>
  <html>
  <head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width,initial-scale=1.0'>
    <title>${title}</title>
    <style>
    ::-moz-selection { background: #ffff0080; }
    ::selection { background: #ffff0080; }
    </style>
  </head>
  <body id="pdf-body">
  <h1 data-ink-page-title>${title}</h1>
  ${body}
  </body>
  </html>
  `;
}

function getBook(name, images) {
  return {
    name: name,
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
}

function getToC(name, pages) {
  const children = [];
  for (let index = 0; index < pages; index++) {
    children[index] = {
      children: [],
      label: `Page ${index + 1}`,
      image: getFileNameForPage(index + 1),
      url: `#page${index + 1}`
    };
  }
  return {
    heading: name + " Contents",
    type: "PDF",
    children
  };
}

async function processMarkup(html, resource, book, toc) {
  const clean = await purify(html, resource.url, "text/html", true);
  const result = await processor.process(clean);
  // console.log(result);
  // const result = vfile({ contents: clean });
  result.path = resource.url + ".json";
  result.contentType = "application/json";
  result.data = Object.assign({}, result.data, {
    headings: result.contents.data.headings
  });
  const contents = {
    contents: result.contents,
    resource,
    toc: toc,
    book: book
  };
  result.contents = JSON.stringify(contents, null, 2);
  return result;
}
