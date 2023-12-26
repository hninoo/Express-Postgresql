import express from "express";
import bodyParser from "body-parser";
import { db } from "./dbConnect.js";

const app = express();
const port = process.env.PORT;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const dbConnect = db;

let items = [];

async function itemList(){
  const result = await dbConnect.query("SELECT * FROM items ORDER BY id ASC");
  items = result.rows;
  return items;
}

app.get("/", async (req, res) => {
  items = await itemList();
  res.render("index.ejs", {
    listTitle: "Today",
    listItems: items,
  });
});

app.post("/add", (req, res) => {
  const item = req.body.newItem;
  items.push({ title: item });
  res.redirect("/");
});

app.post("/edit", (req, res) => {});

app.post("/delete", (req, res) => {});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
