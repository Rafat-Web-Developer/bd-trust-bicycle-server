const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("BD Trust Bicycle Server Working... Alhamdulillah!!");
});

app.listen(port, () => {
  console.log(`BD Trust Bicycle app listening on port ${port}`);
});
