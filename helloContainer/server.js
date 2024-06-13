const express = require("express");
const app = express();
const port = 3000;

app.get("*", (req, res) => {
  const name = req.query.name || "World";
  res.send(`Hello, ${process.env.CONTAINER_REGISTRY_NAME || "World"}!`);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
