// @ts-ignore
const gh = require("hast-util-sanitize/lib/github");
const sanitize = require("rehype-sanitize");
const unified = require("unified");
const parse = require("rehype-parse");
const markdown = require("remark-parse");
const remark2rehype = require("remark-rehype");
const stringify = require("rehype-stringify");
const raw = require("rehype-raw");
// const h = require("hastscript");

const htmlProcessor = unified()
  .use(parse, { fragment: true })
  .use(sanitize, gh)
  .use(stringify, { closeEmptyElements: true });

const markdownProcessor = unified()
  .use(markdown, { commonmark: true, footnotes: true })
  .use(remark2rehype, { allowDangerousHtml: true, commonmark: true })
  .use(raw)
  .use(sanitize, gh)
  .use(stringify, { closeEmptyElements: true });

module.exports = async function renderTemplates(annotations) {
  // This line flattens the resulting map and filters out undefineds/nulls.
  const rendered = await Promise.all(
    Array.prototype.concat.apply([], annotations).map(renderTemplate)
  );
  return rendered.filter(item => item);
};

async function renderTemplate(annotation) {
  annotation.body = await Promise.all(
    [].concat(annotation.body).map(renderBody, annotation)
  );
  return annotation;
}

async function renderBody(body, annotation) {
  if (body.type === "TextualBody") {
    let html;
    if (body.format === "text/markdown") {
      html = await markdownProcessor.process(`${body.value}`);
    } else {
      html = await htmlProcessor.process(`${body.value}`);
    }
    body.format = "text/html";
    body.value = html.contents;
    return body;
  }
}
