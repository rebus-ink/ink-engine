// const { select } = require("hast-util-select");
// const h = require("hastscript");
const visit = require("unist-util-visit");
const is = require("hast-util-is-element");
const has = require("hast-util-has-property");
const info = require("property-information");
const toText = require("hast-util-to-text");
const location = info.find(info.html, "data-ink-location").property;
const locations = [
  "div",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "table",
  "svg",
  "hr",
  "form",
  "details",
  "ul",
  "ol",
  "dl",
  "figure",
  "blockquote",
  "aside"
];
const headings = ["h1", "h2", "h3", "h4", "h5"];

function attacher(options) {
  return transformer;
  function transformer(node, file) {
    return transform(node, file, options);
  }
}

module.exports = attacher;

function transform(node, file, { prefix = "#ink-engine" } = {}) {
  // const body = select("body", node);
  // const inkHTML = h("ink-html");
  // const inkBody = Object.assign({}, body, { tagName: "ink-body" });
  // inkHTML.children = [inkBody];
  // const replacementBody = h(`body${prefix}`, inkHTML);
  // const html = select("html", node);
  // html.children.forEach((child, index) => {
  //   if (child.tagName === "body") {
  //     html.children[index] = replacementBody;
  //   }
  // });
  const data = Object.assign({}, node.data, {
    book: file.data.book,
    resource: file.data.resource,
    toc: file.data.toc,
    headings: []
  });
  node.data = data;
  let counter = 0;
  visit(node, "element", function(node) {
    if (is(node, locations) && !has(node, location)) {
      node.properties[location] = counter;
      counter = counter + 1;
    }
    if (is(node, headings)) {
      data.headings = data.headings.concat({
        label: toText(node),
        level: Number.parseInt(node.tagName.replace("h", ""), 10),
        url: `#${node.properties.id}`,
        children: []
      });
    }
  });
  return node;
}
