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

const docxPath = path.join(__dirname, "fixtures/test.docx");

tap.test("docx process", async test => {
  const processor = formats.docx;
  test.equal(
    processor,
    formats[
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]
  );
  function extract(vfile, resource, metadata) {
    // console.dir(vfile.messages);
    test.matchSnapshot(vfile, "docx file " + resource.url);
    test.matchSnapshot(resource, "docx resource " + resource.url);

    return Promise.resolve("uploaded/" + resource.url);
  }
  const result = await process(docxPath, extract);
  test.matchSnapshot(result, "docx first result");
});
