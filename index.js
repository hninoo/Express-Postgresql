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

app.post("/add", async(req, res) => {
  const item = req.body.newItem;
  try {
    await dbConnect.query("INSERT INTO items (title) VALUES ($1)",[item]);
    console.log("New item : ",item);
    items.push({ title: item });
    res.redirect("/");
  } catch (error) {
    console.log(error)
  }
  
});

app.post("/edit", async(req, res) => {
  const item = req.body.updatedItemTitle;
  const id = req.body.updatedItemId;
  
  try {
    await dbConnect.query("UPDATE items SET title = ($1) WHERE id = $2" , [item, id]);
    res.redirect("/");
  } catch (error) {
    console.log(error)
  }
});

app.post("/delete", async(req, res) => {
  const id = req.body.deleteItemId;
  try {
    await dbConnect.query("DELETE FROM items WHERE id = $1", [id]);
    res.redirect("/");
  } catch (error) {
    console.log(error)
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
