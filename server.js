const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const rootFolder = __dirname;
const clubsFile = path.join(rootFolder, "data", "clubs.json");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function sendResponse(res, statusCode, content, contentType) {
  res.writeHead(statusCode, {
    "Content-Type": contentType
  });
  res.end(content);
}

function getClubs() {
  return JSON.parse(fs.readFileSync(clubsFile, "utf8"));
}

function saveClubs(clubs) {
  fs.writeFileSync(clubsFile, JSON.stringify(clubs, null, 2));
}

function handleClubPatch(req, res, id) {
  let requestBody = "";

  req.on("data", (chunk) => {
    requestBody += chunk;
  });

  req.on("end", () => {
    try {
      const updates = JSON.parse(requestBody);
      const clubs = getClubs();
      const club = clubs.find((item) => item.id === id);

      if (!club) {
        return sendResponse(
          res,
          404,
          JSON.stringify({ error: "Club not found" }),
          "application/json; charset=utf-8"
        );
      }

      if (typeof updates.joined === "boolean") {
        club.joined = updates.joined;
      }
      if (typeof updates.favorite === "boolean") {
        club.favorite = updates.favorite;
      }
      if (typeof updates.rsvp === "boolean") {
        club.rsvp = updates.rsvp;
      }

      saveClubs(clubs);

      sendResponse(
        res,
        200,
        JSON.stringify(club),
        "application/json; charset=utf-8"
      );
    } catch {
      sendResponse(
        res,
        400,
        JSON.stringify({ error: "Invalid request data" }),
        "application/json; charset=utf-8"
      );
    }
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/clubs" && req.method === "GET") {
    return sendResponse(
      res,
      200,
      JSON.stringify(getClubs()),
      "application/json; charset=utf-8"
    );
  }

  if (req.method === "PATCH" && url.pathname.startsWith("/api/clubs/")) {
    const parts = url.pathname.split("/").filter(Boolean);
    const id = Number(parts[2]);
    if (!Number.isNaN(id)) {
      return handleClubPatch(req, res, id);
    }
  }

  const requestedPath = url.pathname === "/" ? "/clubs.html" : url.pathname;
  const filePath = path.resolve(rootFolder, `.${requestedPath}`);

  if (!filePath.startsWith(rootFolder)) {
    return sendResponse(res, 403, "Access denied", "text/plain; charset=utf-8");
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return sendResponse(res, 404, "File not found", "text/plain; charset=utf-8");
  }

  const extension = path.extname(filePath).toLowerCase();
  const type = mimeTypes[extension] || "application/octet-stream";

  sendResponse(res, 200, fs.readFileSync(filePath), type);
});

server.listen(PORT, () => {
  console.log(`UNIVRSE is running here: http://localhost:${PORT}`);
});
