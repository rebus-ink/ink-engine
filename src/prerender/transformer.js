const { select, matches } = require("hast-util-select");
const h = require("hastscript");
const visit = require("unist-util-visit");
const is = require("hast-util-is-element");
const has = require("hast-util-has-property");
const srcset = require("srcset");
const URL = require("url").URL;

function attacher(options) {
  return transformer;
  function transformer(node, file) {
    return transform(node, file, options);
  }
}

module.exports = attacher;

function transform(
  node,
  file,
  {
    prefix = "#ink-engine",
    mediaBase = "/",
    linkBase = "/",
    chapterBase = "/"
  } = {}
) {
  function rebase(path, base) {
    const baseURL = new URL(base, "https://www.example.com/");
    const absoluteURL = new URL(
      path,
      new URL(chapterBase, "https://www.example.com/")
    );
    const url = new URL(`/${absoluteURL.pathname}${absoluteURL.hash}`, baseURL);
    if (url.host === "https://www.example.com/") {
      return `/${url.pathname}${url.hash}`;
    } else {
      return url.href;
    }
  }
  const data = Object.assign({}, node.data, {
    stylesheets: [],
    title: ""
  });
  node.data = data;
  let counter = 0;
  visit(node, "element", function(node) {
    if (matches('link[rel="stylesheet"]', node)) {
      data.stylesheets = data.stylesheets.concat(
        rebase(node.properties.href, mediaBase)
      );
    }
    if (has(node, "src")) {
      node.properties.src = rebase(node.properties.src, mediaBase);
      counter = counter + 1;
    }
    if (has(node, "srcset")) {
      const parsed = srcset.parse(node.properties.srcset);
      parsed.forEach(src => {
        src.url = rebase(src.url, mediaBase);
      });
      node.properties.srcset = srcset.stringify(parsed);
    }
    if (has(node, "href") && is(node, ["a"])) {
      node.properties.src = rebase(node.properties.src, linkBase);
    }
  });
  const body = select("body", node);
  const inkHTML = h("ink-html");
  const inkBody = Object.assign({}, body, { tagName: "ink-body" });
  inkHTML.children = [inkBody];
  const wrapper = h(`div${prefix}.InkWrapper`, inkHTML);
  wrapper.data = data;
  return wrapper;
}
