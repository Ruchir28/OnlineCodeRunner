const express = require("express");
const cors = require("cors");
const intialiseRabbitMQ = require("./messageQueue/RabbitMQ");
const amqp = require("amqplib");
const app = express();
const port = 3000;

app.use(cors());

intialiseRabbitMQ("Message_Queue","Reply_Queue",0).then((rabbitMq) => {
  app.get("/", (req, res) => {
    res.send("Hey There Application is Up and Running");
  });

  app.get("/hit", async (req, res) => {
    try {
      let message = `Demo Hits to RabbitMq ${Math.random() * 100}`;
      console.log("[Endpoint] Endpoint is hit with:"+message);

      let result = await rabbitMq.executeTask(message);
      res.status(200).send(`Task execution complete ${result}`);
    } catch (err) {
      res.status(500).send(`Task execution Failed ${err}`);
    }
  });
});

app.listen(port, () => {
  console.log(`Example app is listening on port ${port}`);
});
