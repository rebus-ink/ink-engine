const tap = require("tap");
// const process = require("../");
const prerender = require("../src/prerender");
// const fs = require("fs");
const path = require("path");
// const os = require("os");

const book = require(path.join(
  __dirname,
  "fixtures/processed-epub/index.json"
));

tap.test("prerender", async test => {
  for (const resource of book.readingOrder) {
    const chapter = require(path.join(
      __dirname,
      "fixtures/processed-epub/",
      resource.url
    ));
    const processed = await prerender(chapter, {
      mediaBase: "/api/store/",
      linkBase: "/reader/id/storage/"
    });
    test.matchSnapshot(processed, "prerender" + resource.url);
  }
});
