import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';



dotenv.config();



const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors : {
        origin : "*",
        methods : [ "GET", "POST", "PUT","DELETE"],
    },
});

app.use(cors());
app.use(express.json());

app.get("/",(req,res) => {
    res.send("Trello real-time API backend is running");
});

io.on("connection",(socket) => {
    console.log("A client connected",socket.id);
    socket.on("disconnect", () => {
        console.log("A client disconnected;",socket.id);
    });
});

app.get("/api/test-trello", async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.trello.com/1/members/me/boards?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//create a new board
app.post("/api/board", async(req,res) => {
try {
  const { name, defaultLists} = req.body;

  if(!name){
    return res.status(400).json({ error : "Board name is Required"});
  }

  const response = await axios.post(
    `https://api.trello.com/1/boards?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`,{name, defaultLists}
  );
  io.emit("boardCreated",response.data);
  res.status(201).json(response.data);

} catch (error) {
  console.error("Error creating Trello board", error.response?.data || error.message);
  res.status(500).json({error : "Failed to create Trello Board"});
}
})


//create a new task
app.post("/api/task", async (req, res) => {
  try {
    const { idList, name, desc } = req.body;

    if (!idList || !name) {
      return res.status(400).json({ error: "idList and name are required" });
    }

    // Construct Trello API URL with all required query params
    const trelloUrl = `https://api.trello.com/1/cards?idList=${idList}&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}&name=${encodeURIComponent(
      name
    )}${desc ? `&desc=${encodeURIComponent(desc)}` : ""}`;

    // Make the Trello API call
    
    const response = await axios.post(trelloUrl);

    io.emit("cardCreated",response.data);

    res.status(201).json(response.data);
  } catch (error) {
    console.error(" Error creating Trello card:", error.response?.data || error.message);
    res
      .status(500)
      .json({ error: "Failed to create Trello card", details: error.response?.data });
  }
});


app.put("/api/task/:cardId", async(req,res) => {
try {
  const {cardId} = req.params;
  const { name, desc, idList} = req.body;

  if(!cardId){
    return res.status(400).json({ error : 'cardId is required'});
  }

  const response = await axios.put(`https://api.trello.com/1/cards/${cardId}?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`,{
    name,
    desc,
    idList
  })

   io.emit("cardUpdated", {
      cardId,
      updates: {
        ...(name !== undefined && { name }),
        ...(desc !== undefined && { desc }),
        ...(idList !== undefined && { idList }),
      }
    });

  res.status(200).json(response.data);
} catch (error) {
  console.error("error updating the trello cards : ", error.response?.data || error.message);
  res.status(500).json({ error : "Failed to update trello card "});
}
})

app.put("/api/task/:cardId/close", async(req,res) => {
  try {
    const {cardId} = req.params;
    if(!cardId){
      return res.status(400).json({error : "cardId is required"});
    }

    const response = await axios.put(`https://api.trello.com/1/cards/${cardId}?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`,{closed : true});

     io.emit("cardArchived", { cardId });

    res.status(200).json({
      success : true,
      message : "Card succesfully closed (soft deleted)",
      card : response.data,
    });
  } catch (error) {
    console.error("Error closing Trello card", error.response?.data || error.message);
    res.status(500).json({ error : " Failed to close Trello card"});
  }
});

app.delete("/api/task/:cardId", async(req,res) => {
  try {
     const {cardId} = req.params;

     if(!cardId){
      return res.status(400).json({ error : "CardId is required "});
     }

     const response = await axios.delete(`https://api.trello.com/1/cards/${cardId}?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`);


     io.emit("cardDeleted",{cardId});


     return res.status(200).json({
      success : true,
      message : "Card permanently deleted from Trello",
      card : response.data,
     })
     
  } catch (error) {
    console.error("Error deleting trello card ", error.response?.data || error.message);
    res.status(500).json({ error : "Failed to delete trello card"});
  }
});

app.get("/api/board/:boardId/lists", async(req, res) => {
  try {
    const { boardId } = req.params;
    const response = await axios.get(
      `https://api.trello.com/1/boards/${boardId}/lists?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error fetching Trello lists:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch lists" });
  }
})

// Get all cards for a specific list
app.get("/api/lists/:listId/cards", async (req, res) => {
  try {
    const { listId } = req.params;

    const response = await axios.get(
      `https://api.trello.com/1/lists/${listId}/cards?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error fetching Trello cards:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch cards" });
  }
});

app.get("/webhook/trello", (req, res) => {
  res.status(200).send("Webhook OK");
});


app.post("/webhook/trello", (req, res)=> {
  const event = req.body;
console.log("Trello event:", req.body);
  res.status(200).send("OK");
  io.emit("trelloEvent",event);
})

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));