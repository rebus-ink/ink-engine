const tap = require("tap");
const markup = require("../src/formats/");
const path = require("path");
const os = require("os");
const fs = require("fs");

tap.cleanSnapshot = s => {
  const tempdir = os.tmpdir();
  const reg = new RegExp(`"${tempdir}[^"]+"`, "g");
  return s.replace(reg, '"TMPDIR"');
};

const markupPath = path.join(__dirname, "fixtures/test-markup.html");
const fragmentPath = path.join(__dirname, "fixtures/test-markup-fragment.html");

tap.test("MarkupProcess", async test => {
  for await (const vfile of markup({
    filename: markupPath,
    mediaType: "text/html"
  })) {
    if (!vfile.data) {
      test.matchSnapshot(vfile, "markup first result");
    } else {
      test.matchSnapshot(vfile.contents, "markup file " + vfile.path);
      test.matchSnapshot(
        vfile.data.resource,
        "markup resource " + vfile.data.resource.url
      );
    }
  }
});
tap.test("MarkupProcess fragment", async test => {
  for await (const vfile of markup({
    fragment: true,
    data: fs.readFileSync(fragmentPath),
    filename: fragmentPath,
    mediaType: "text/html"
  })) {
    if (!vfile.data) {
      test.matchSnapshot(vfile, "markup first result");
    } else {
      test.matchSnapshot(vfile.contents, "markup file " + vfile.path);
      test.matchSnapshot(
        vfile.data.resource,
        "markup resource " + vfile.data.resource.url
      );
    }
  }
});
