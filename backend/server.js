const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database("board.db");

// ---------- TABLES ----------
db.run(`
CREATE TABLE IF NOT EXISTS columns(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    status TEXT,
    pos INTEGER
)
`);

db.run(`
CREATE TABLE IF NOT EXISTS tasks(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT,
    column_id INTEGER,
    pos INTEGER,
    FOREIGN KEY(column_id) REFERENCES columns(id)
)
`);

// ---------- GET BOARD ----------
app.get("/board",(req,res)=>{
    db.all("SELECT * FROM columns ORDER BY pos",[],(e,columns)=>{
        db.all("SELECT * FROM tasks ORDER BY pos",[],(e2,tasks)=>{
            res.json({columns,tasks});
        });
    });
});

// ---------- CREATE COLUMN ----------
app.post("/column",(req,res)=>{
    const {title,status,pos} = req.body;
    db.run(
        "INSERT INTO columns(title,status,pos) VALUES(?,?,?)",
        [title,status,pos],
        ()=>res.sendStatus(200)
    );
});

// ---------- UPDATE COLUMN ----------
app.put("/column/:id",(req,res)=>{
    const {title,status} = req.body;
    db.run(
        "UPDATE columns SET title=?, status=? WHERE id=?",
        [title,status,req.params.id],
        ()=>res.sendStatus(200)
    );
});

// ---------- CREATE TASK ----------
app.post("/task",(req,res)=>{
    const {text,column_id,pos} = req.body;
    db.run(
        "INSERT INTO tasks(text,column_id,pos) VALUES(?,?,?)",
        [text,column_id,pos],
        ()=>res.sendStatus(200)
    );
});

// ---------- UPDATE TASK ----------
app.put("/task/:id",(req,res)=>{
    const {text,column_id,pos} = req.body;
    db.run(
        "UPDATE tasks SET text=?, column_id=?, pos=? WHERE id=?",
        [text,column_id,pos,req.params.id],
        ()=>res.sendStatus(200)
    );
});

// ---------- DELETE TASK ----------
app.delete("/task/:id",(req,res)=>{
    db.run("DELETE FROM tasks WHERE id=?",[req.params.id],()=>res.sendStatus(200));
});

// ---------- RESET ----------
app.delete("/reset",(req,res)=>{
    db.run("DELETE FROM tasks");
    db.run("DELETE FROM columns");
    res.sendStatus(200);
});

app.listen(3000,()=>console.log("API ON http://localhost:3000"));
