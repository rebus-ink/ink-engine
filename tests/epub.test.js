const tap = require("tap");
const process = require("../");
const formats = require("../src/formats");
// const fs = require("fs");
const path = require("path");
const os = require("os");

tap.cleanSnapshot = s => {
  const tempdir = os.tmpdir();
  const reg = new RegExp(`"${tempdir}[^"]+"`, "g");
  return s.replace(reg, '"TMPDIR"');
};

const epubPath = path.join(__dirname, "fixtures/test-epub.epub");

tap.test("epub process", async test => {
  const processor = formats.epub;
  test.equal(processor, formats["application/epub+zip"]);
  function extract(vfile, resource, metadata) {
    test.matchSnapshot(vfile, "epub file " + resource.url);
    test.matchSnapshot(resource, "epub resource " + resource.url);
    return Promise.resolve("uploaded/" + resource.url);
  }
  const result = await process(
    path.join(__dirname, "fixtures/test-epub-js.epub"),
    extract
  );
  test.matchSnapshot(result, "epub first result");
});

tap.test("epub process - sanitise false", async test => {
  const processor = formats.epub;
  test.equal(processor, formats["application/epub+zip"]);
  function extract(vfile, resource, metadata) {
    test.matchSnapshot(vfile, "epub unsanitised file " + resource.url);
    test.matchSnapshot(resource, "epub unsanitised resource " + resource.url);
    return Promise.resolve("uploaded/" + resource.url);
  }
  const result = await process(epubPath, extract, {
    sanitize: false,
    type: "application/epub+zip"
  });
  test.matchSnapshot(result, "epub unsanitised first result");
});
