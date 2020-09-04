const tap = require("tap");
const epub = require("../src/formats/");
const fs = require("fs");
const path = require("path");

const epubPath = path.join(__dirname, "fixtures/moby-dick.epub");

tap.test("epub process", async test => {
  for await (const vfile of epub({
    data: fs.readFileSync(path.join(__dirname, "fixtures/test-epub-js.epub")),
    mediaType: "application/epub+zip"
  })) {
    if (!vfile.data) {
      test.matchSnapshot(vfile, "epub book result");
    } else {
      test.matchSnapshot(vfile.contents, "epub file " + vfile.path);
      test.matchSnapshot(
        vfile.data.resource,
        "epub resource " + vfile.data.resource.url
      );
    }
  }
});

tap.test("epub process - sanitise false", async test => {
  for await (const vfile of epub({
    filename: epubPath,
    mediaType: "application/epub+zip"
  })) {
    if (!vfile.data) {
      test.matchSnapshot(vfile, "epub book 2 result");
    } else {
      test.matchSnapshot(
        Buffer.from(vfile.contents),
        "epub file 2 " + vfile.path
      );
      test.matchSnapshot(
        vfile.data.resource,
        "epub resource 2 " + vfile.data.resource.url
      );
    }
  }
});
