const tap = require("tap");
const Markup = require("../src/formats/MarkupProcess");
// const fs = require("fs");
const path = require("path");
const os = require("os");

tap.cleanSnapshot = s => {
  const tempdir = os.tmpdir();
  const reg = new RegExp(`"${tempdir}[^"]+"`, "g");
  return s.replace(reg, '"TMPDIR"');
};

const markupPath = path.join(__dirname, "fixtures/test-markup.html");
const fragmentPath = path.join(__dirname, "fixtures/test-markup-fragment.html");

tap.test("MarkupProcess", async test => {
  const processor = new Markup(markupPath, { extract, fragment: false });
  function extract(vfile, resource, metadata) {
    test.matchSnapshot(vfile.contents, "markup file " + resource.url);
    test.matchSnapshot(resource, "markup resource " + resource.url);

    return Promise.resolve("uploaded/" + resource.url);
  }
  const result = await processor.process(markupPath, extract);
  test.matchSnapshot(result, "markup first result");
});

tap.test("MarkupProcess fragment", async test => {
  const processor = new Markup(fragmentPath, { extract });
  function extract(vfile, resource, metadata) {
    test.matchSnapshot(vfile.contents, "markup file " + resource.url);
    test.matchSnapshot(resource, "markup resource " + resource.url);

    return Promise.resolve("uploaded/" + resource.url);
  }
  const result = await processor.process(fragmentPath, extract);
  test.matchSnapshot(result, "markup first result");
});
